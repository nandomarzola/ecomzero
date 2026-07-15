import { prisma } from "@/lib/db";
import type { BannerInput } from "@/lib/validation/banner";

export type BannerListItem = {
  id: string; nome: string; imagemUrl: string; altText: string; linkUrl: string | null;
  posicao: "hero_slide" | "home_middle" | "home_bottom"; largura: number; altura: number;
  ordem: number; ativo: boolean; inicioEm: string | null; expiraEm: string | null;
};

export async function listBanners(): Promise<BannerListItem[]> {
  const banners = await prisma.banner.findMany({ orderBy: [{ posicao: "asc" }, { ordem: "asc" }, { createdAt: "desc" }] });
  return banners.map((banner) => ({ ...banner, inicioEm: banner.inicioEm?.toISOString() ?? null, expiraEm: banner.expiraEm?.toISOString() ?? null }));
}

const dataFromInput = (input: BannerInput) => ({
  ...input,
  linkUrl: input.linkUrl ?? null,
  inicioEm: input.inicioEm ?? null,
  expiraEm: input.expiraEm ?? null,
});

export async function createBanner(input: BannerInput) {
  return prisma.banner.create({ data: dataFromInput(input), select: { id: true } });
}

export async function updateBanner(id: string, input: BannerInput) {
  const existing = await prisma.banner.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new Error("Banner não encontrado.");
  return prisma.banner.update({ where: { id }, data: dataFromInput(input), select: { id: true } });
}

export async function deleteBanner(id: string) {
  const existing = await prisma.banner.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new Error("Banner não encontrado.");
  await prisma.banner.delete({ where: { id } });
}
