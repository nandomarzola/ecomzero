import { prisma } from "@/lib/db";

// Favoritos do cliente (User NextAuth ↔ Product). Camada única de acesso ao
// Prisma para favoritos.

// Alterna o favorito: remove se já existe, cria se não. Retorna o novo estado.
export async function toggleFavorite(
  userId: string,
  productId: string,
): Promise<{ favorited: boolean }> {
  const existing = await prisma.productFavorite.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.productFavorite.delete({ where: { id: existing.id } });
    return { favorited: false };
  }

  await prisma.productFavorite.create({ data: { userId, productId } });
  return { favorited: true };
}

// Ids dos produtos favoritados — usado para hidratar o estado no client.
export async function getFavoriteProductIds(userId: string): Promise<string[]> {
  const rows = await prisma.productFavorite.findMany({
    where: { userId },
    select: { productId: true },
  });
  return rows.map((row) => row.productId);
}
