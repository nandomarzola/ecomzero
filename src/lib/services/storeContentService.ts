import { cache } from "react";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { StoreAnnouncementItem } from "@/types/storePromotion";

// ── Resiliência de build/prerender ──────────────────────────────────────────
// Durante `next build`, o layout raiz (e o Footer, em TODA página estática
// prerenderizada) lê StoreSettings / categorias / anúncios. Se o banco estiver
// indisponível no build (ex.: limite de plano do Prisma), toleramos com um
// fallback sensato — SÓ no build. Em runtime real (request de usuário) o erro
// sobe normalmente: não mascaramos queda de banco em produção.
const isBuildPhase = () => process.env.NEXT_PHASE === "phase-production-build";
const failureReason = (error: unknown) =>
  error instanceof Error ? error.message : "erro desconhecido";

export type StoreCategory = {
  id: string;
  nome: string;
  slug: string;
  parentId: string | null;
  depth: number;
  path: string;
  descendantIds: string[];
  descricao: string | null;
  metaTitulo: string | null;
  metaDescricao: string | null;
};

// Categoria resolvida a partir do caminho de slugs da URL (raiz ou raiz+sub).
export type ResolvedCategory = {
  category: StoreCategory;
  breadcrumb: StoreCategory[]; // do topo até a categoria atual
  children: StoreCategory[]; // subcategorias diretas (para os chips de navegação)
  targetCategoryIds: string[]; // ids elegíveis: raiz → ela + descendentes; sub → só ela
};

export type StoreBanner = {
  id: string;
  imagemUrl: string;
  altText: string;
  linkUrl: string | null;
  posicao: "hero_slide" | "home_middle" | "home_bottom";
};

export type StoreAnnouncementBarItem = StoreAnnouncementItem;

const legacyFooterMessage = "Produtos úteis para facilitar o seu dia a dia.";
const secureFooterMessage = "Este site utiliza conexão segura e não armazena os dados do seu cartão.";

async function getFooterContentSettings() {
  const columns = await prisma.$queryRaw<Array<{ columnName: string }>>`
    SELECT "column_name" AS "columnName"
    FROM "information_schema"."columns"
    WHERE "table_schema" = current_schema()
      AND "table_name" = 'StoreSettings'
      AND "column_name" IN ('footerBenefits', 'footerSecurityItems')
  `;

  if (columns.length !== 2) {
    return { footerBenefits: null, footerSecurityItems: null };
  }

  const [settings] = await prisma.$queryRaw<Array<{
    footerBenefits: unknown;
    footerSecurityItems: unknown;
  }>>`
    SELECT "footerBenefits", "footerSecurityItems"
    FROM "StoreSettings"
    WHERE "id" = 'singleton'
    LIMIT 1
  `;

  return settings ?? { footerBenefits: null, footerSecurityItems: null };
}

export const getActiveCategories = cache(async (): Promise<StoreCategory[]> => {
  let rows;
  try {
    rows = await prisma.category.findMany({ where: { ativo: true }, orderBy: [{ ordem: "asc" }, { nome: "asc" }] });
  } catch (error) {
    console.warn("[storeContent] categorias indisponíveis", { reason: failureReason(error) });
    if (isBuildPhase()) return [];
    throw error;
  }
  const children = new Map<string | null, typeof rows>();
  for (const row of rows) children.set(row.parentId, [...(children.get(row.parentId) ?? []), row]);
  const result: StoreCategory[] = [];
  const visit = (parentId: string | null, depth: number, parentPath: string) => {
    for (const row of children.get(parentId) ?? []) {
      const path = parentPath ? `${parentPath} / ${row.nome}` : row.nome;
      result.push({
        id: row.id, nome: row.nome, slug: row.slug, parentId: row.parentId, depth, path, descendantIds: [],
        descricao: row.descricao, metaTitulo: row.metaTitulo, metaDescricao: row.metaDescricao,
      });
      visit(row.id, depth + 1, path);
    }
  };
  visit(null, 0, "");
  const byId = new Map(result.map((category) => [category.id, category]));
  for (const category of result) {
    let parentId = category.parentId;
    while (parentId) {
      byId.get(parentId)?.descendantIds.push(category.id);
      parentId = byId.get(parentId)?.parentId ?? null;
    }
  }
  return result;
});

// Resolve o caminho de slugs da URL (/categorias/[...slug]) para uma categoria,
// em QUALQUER profundidade. Caminha os segmentos validando que cada um é filho
// direto do anterior (o 1º tem que ser raiz); qualquer quebra na cadeia → 404.
// A árvore inteira já vem carregada em memória por `getActiveCategories` (uma
// query só, com `descendantIds` recursivo pré-computado), então a subtree
// completa sai sem query extra. `cache()` deduplica entre generateMetadata e a
// página.
export const resolveCategoryPath = cache(
  async (slugs: string[]): Promise<ResolvedCategory | null> => {
    if (slugs.length < 1) return null;

    const all = await getActiveCategories();
    const bySlug = new Map(all.map((category) => [category.slug, category]));

    const breadcrumb: StoreCategory[] = [];
    let expectedParentId: string | null = null; // 1º segmento tem que ser raiz
    for (const slug of slugs) {
      const node = bySlug.get(slug);
      // cada segmento precisa existir E ser filho direto do segmento anterior,
      // na ordem exata da URL — senão o caminho é inválido.
      if (!node || node.parentId !== expectedParentId) return null;
      breadcrumb.push(node);
      expectedParentId = node.id;
    }

    const category = breadcrumb[breadcrumb.length - 1];
    const children = all.filter((c) => c.parentId === category.id);
    // Qualquer categoria (em qualquer nível) → ela + TODAS as descendentes.
    const targetCategoryIds = [category.id, ...category.descendantIds];

    return { category, breadcrumb, children, targetCategoryIds };
  },
);

export const getActiveBanners = cache(async (): Promise<StoreBanner[]> => {
  const now = new Date();
  return prisma.banner.findMany({
    where: { ativo: true, AND: [{ OR: [{ inicioEm: null }, { inicioEm: { lte: now } }] }, { OR: [{ expiraEm: null }, { expiraEm: { gt: now } }] }] },
    orderBy: [{ posicao: "asc" }, { ordem: "asc" }],
    select: { id: true, imagemUrl: true, altText: true, linkUrl: true, posicao: true },
  });
});

export const getActiveAnnouncementBarItems = cache(async (): Promise<StoreAnnouncementBarItem[]> => {
  const now = new Date();
  let rows;
  try {
    rows = await prisma.announcementBarItem.findMany({
    where: { ativo: true },
    orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      texto: true,
      link: true,
      regioesElegiveis: true,
      coupon: {
        select: {
          id: true,
          codigo: true,
          descricao: true,
          tipo: true,
          valor: true,
          valorMinimoPedido: true,
          descontoMaximo: true,
          primeiraCompra: true,
          aplicaEm: true,
          categoriaId: true,
          produtoId: true,
          inicioEm: true,
          expiraEm: true,
          ativo: true,
          usos: true,
          limiteUsoTotal: true,
        },
      },
    },
  });
  } catch (error) {
    console.warn("[storeContent] barra de anúncios indisponível", { reason: failureReason(error) });
    if (isBuildPhase()) return [];
    throw error;
  }

  const categoryCouponIds = [...new Set(rows.map((row) => row.coupon?.categoriaId).filter((id): id is string => Boolean(id)))];
  const productCouponIds = [...new Set(rows.map((row) => row.coupon?.produtoId).filter((id): id is string => Boolean(id)))];
  const [categories, products] = await Promise.all([
    categoryCouponIds.length
      ? prisma.category.findMany({ select: { id: true, nome: true, parentId: true } })
      : [],
    productCouponIds.length
      ? prisma.product.findMany({ where: { id: { in: productCouponIds } }, select: { id: true, nome: true } })
      : [],
  ]);
  const categoryNames = new Map(categories.map((category) => [category.id, category.nome]));
  const productNames = new Map(products.map((product) => [product.id, product.nome]));

  const descendantsOf = (categoryId: string) => {
    const ids = new Set([categoryId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const category of categories) {
        if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
          ids.add(category.id);
          changed = true;
        }
      }
    }
    return [...ids];
  };

  return rows.map((row) => {
    const coupon = row.coupon;
    let scopeLabel = "Toda a loja";
    if (coupon?.aplicaEm === "categoria") {
      scopeLabel = coupon.categoriaId ? categoryNames.get(coupon.categoriaId) ?? "Categoria selecionada" : "Categoria selecionada";
    } else if (coupon?.aplicaEm === "produto") {
      scopeLabel = coupon.produtoId ? productNames.get(coupon.produtoId) ?? "Produto selecionado" : "Produto selecionado";
    }

    return {
      id: row.id,
      texto: row.texto,
      link: row.link,
      regioesElegiveis: row.regioesElegiveis,
      coupon: coupon ? {
        id: coupon.id,
        code: coupon.codigo,
        description: coupon.descricao,
        type: coupon.tipo,
        value: coupon.valor === null ? null : Number(coupon.valor),
        minimumOrderValue: coupon.valorMinimoPedido === null ? null : Number(coupon.valorMinimoPedido),
        maximumDiscount: coupon.descontoMaximo === null ? null : Number(coupon.descontoMaximo),
        firstPurchase: coupon.primeiraCompra,
        appliesTo: coupon.aplicaEm,
        categoryId: coupon.categoriaId,
        productId: coupon.produtoId,
        eligibleCategoryIds: coupon.categoriaId ? descendantsOf(coupon.categoriaId) : [],
        scopeLabel,
        startsAt: coupon.inicioEm?.toISOString() ?? null,
        expiresAt: coupon.expiraEm?.toISOString() ?? null,
        active: coupon.ativo,
        exhausted: coupon.limiteUsoTotal !== null && coupon.usos >= coupon.limiteUsoTotal,
        available: coupon.ativo &&
          (coupon.limiteUsoTotal === null || coupon.usos < coupon.limiteUsoTotal) &&
          (!coupon.inicioEm || coupon.inicioEm <= now) &&
          (!coupon.expiraEm || coupon.expiraEm > now),
      } : null,
    };
  });
});

async function fetchStoreSettings() {
  const [settings, footerContent] = await Promise.all([
    prisma.storeSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton" },
      update: {},
      omit: {
        footerBenefits: true,
        footerSecurityItems: true,
        metaCatalogFeedAtivo: true,
        metaCatalogIncludeOutOfStock: true,
        metaCatalogIncludeSalePrice: true,
        metaCatalogIncludeImages: true,
        metaCatalogDefaultBrand: true,
        metaCatalogDefaultCategory: true,
        metaCatalogLastValidatedAt: true,
      },
    }),
    getFooterContentSettings(),
  ]);

  return {
    ...settings,
    mensagemFooter: settings.mensagemFooter === legacyFooterMessage ? secureFooterMessage : settings.mensagemFooter,
    ...footerContent,
  };
}

type StoreSettingsView = Awaited<ReturnType<typeof fetchStoreSettings>>;

// Fallback usado APENAS no build/prerender quando o banco está indisponível.
// Espelha os @default do schema StoreSettings (as colunas omitidas no select
// acima não entram aqui). Tipado como `StoreSettingsView`: o tsc quebra o build
// se o schema mudar e este default ficar desatualizado — nunca fica errado em
// silêncio. Em runtime real, nunca é usado (o erro sobe).
const DEFAULT_STORE_SETTINGS: StoreSettingsView = {
  id: "singleton",
  nomeLoja: "EcomZero",
  descricaoFooter:
    "Produtos inteligentes, úteis e de qualidade para transformar sua rotina.",
  mensagemFooter: secureFooterMessage,
  barraAnuncioAtiva: false,
  barraAnuncioTexto: null,
  barraAnuncioLink: null,
  barraAnuncioCor: null,
  barraAnuncioVelocidade: 5,
  emailSuporte: null,
  telefoneSuporte: null,
  whatsapp: null,
  linkShopee: null,
  linkInstagram: null,
  linkFacebook: null,
  linkTiktok: null,
  linkYoutube: null,
  linkTwitter: null,
  instagramAtivo: false,
  facebookAtivo: false,
  tiktokAtivo: false,
  youtubeAtivo: false,
  twitterAtivo: false,
  shopeeAtivo: false,
  linkMercadoLivre: null,
  mercadoLivreAtivo: false,
  linkTiktokShop: null,
  tiktokShopAtivo: false,
  linkShein: null,
  sheinAtivo: false,
  emailSuporteAtivo: false,
  telefoneSuporteAtivo: false,
  whatsappAtivo: false,
  whatsappMensagem: "Olá! Preciso de ajuda com a minha compra.",
  horariosAtendimento: null,
  footerColumns: null,
  footerSeloSeguranca: true,
  footerCopyrightTexto: "Todos os direitos reservados.",
  footerCopyrightAno: "automatico",
  footerCopyrightAnoFixo: null,
  razaoSocial: null,
  cnpjLoja: null,
  enderecoEmpresa: null,
  mensagemBoasVindasAtiva: false,
  mensagemBoasVindas: "Olá, {nome_cliente}! Sua conta foi criada com sucesso.",
  mensagemPedidoConfirmadoAtiva: true,
  mensagemPedidoConfirmado: "O pagamento do pedido {numero_pedido} foi confirmado.",
  mensagemPedidoEnviadoAtiva: true,
  mensagemPedidoEnviado: "Seu pedido {numero_pedido} está a caminho!",
  mensagemPedidoEntregueAtiva: true,
  mensagemPedidoEntregue: "Seu pedido {numero_pedido} foi entregue!",
  metaPixelAtivo: false,
  metaPixelId: null,
  googleAnalyticsAtivo: false,
  googleAnalyticsId: null,
  googleTagManagerAtivo: false,
  googleTagManagerId: null,
  tiktokPixelAtivo: false,
  tiktokPixelId: null,
  customHeadCodeAtivo: false,
  customHeadCode: null,
  modoManutencao: false,
  mensagemManutencao: "Estamos preparando novidades. Voltamos em breve!",
  valorMinimoPedido: new Prisma.Decimal(0),
  logoUrl: "/images/logo2.png",
  faviconUrl: null,
  corPrincipal: "#A9EC17",
  fusoHorario: "America/Sao_Paulo",
  lojaAtiva: true,
  plano: "Profissional",
  moeda: "BRL",
  idioma: "pt-BR",
  fontFamily: "geist",
  productCardStyle: "standard",
  cardCornerStyle: "rounded",
  showRating: true,
  showBuyNowButton: true,
  buttonStyle: "filled",
  updatedAt: new Date(0),
  footerBenefits: null,
  footerSecurityItems: null,
};

export const getStoreSettings = cache(async (): Promise<StoreSettingsView> => {
  try {
    return await fetchStoreSettings();
  } catch (error) {
    console.warn(
      "[storeContent] StoreSettings indisponível; usando defaults de build",
      { reason: failureReason(error) },
    );
    if (isBuildPhase()) return DEFAULT_STORE_SETTINGS;
    throw error;
  }
});
