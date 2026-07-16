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

// Resolve o caminho de slugs da URL (/categorias/[...slug]) para uma categoria.
// Hoje a hierarquia é de 2 níveis (raiz → subcategoria), imposta pelo admin;
// caminhos de 1 ou 2 segmentos são aceitos, o resto é inválido (→ 404).
// `cache()` deduplica a chamada entre generateMetadata e o componente da página.
export const resolveCategoryPath = cache(
  async (slugs: string[]): Promise<ResolvedCategory | null> => {
    if (slugs.length < 1 || slugs.length > 2) return null;

    const all = await getActiveCategories();
    const bySlug = new Map(all.map((category) => [category.slug, category]));

    const root = bySlug.get(slugs[0]);
    if (!root || root.parentId !== null) return null; // 1º segmento tem que ser raiz

    let category = root;
    const breadcrumb: StoreCategory[] = [root];

    if (slugs.length === 2) {
      const sub = bySlug.get(slugs[1]);
      if (!sub || sub.parentId !== root.id) return null; // sub tem que ser filha da raiz
      category = sub;
      breadcrumb.push(sub);
    }

    const children = all.filter((c) => c.parentId === category.id);
    const targetCategoryIds =
      category.parentId === null
        ? [category.id, ...category.descendantIds] // raiz: ela + todas as descendentes
        : [category.id]; // sub: só ela

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
