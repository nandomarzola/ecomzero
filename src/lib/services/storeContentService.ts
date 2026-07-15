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
      result.push({ id: row.id, nome: row.nome, slug: row.slug, parentId: row.parentId, depth, path, descendantIds: [] });
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
