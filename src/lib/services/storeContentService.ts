import { cache } from "react";
import { prisma } from "@/lib/db";

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

export const getStoreSettings = cache(async () => {
  return prisma.storeSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
});
