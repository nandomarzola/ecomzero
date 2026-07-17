import { cache } from "react";
import { prisma } from "@/lib/db";
import type { StoreAnnouncementItem } from "@/types/storePromotion";

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

export const getActiveCategories = cache(async (): Promise<StoreCategory[]> => {
  const rows = await prisma.category.findMany({ where: { ativo: true }, orderBy: [{ ordem: "asc" }, { nome: "asc" }] });
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
  const rows = await prisma.announcementBarItem.findMany({
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

export const getStoreSettings = cache(async () => {
  return prisma.storeSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
});
