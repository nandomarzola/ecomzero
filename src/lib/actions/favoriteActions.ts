"use server";

import { auth } from "@/lib/auth";
import {
  getFavoriteProductIds,
  toggleFavorite,
} from "@/lib/services/favoriteService";

export type FavoriteToggleResult =
  | { ok: true; favorited: boolean }
  | { ok: false; error: string };

// Alterna o favorito do produto para o cliente logado. userId vem sempre da
// sessão (nunca do client) — só o dono altera seus próprios favoritos.
export async function toggleFavoriteAction(
  productId: string,
): Promise<FavoriteToggleResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Faça login para favoritar produtos." };
  }
  if (typeof productId !== "string" || productId.length === 0) {
    return { ok: false, error: "Produto inválido." };
  }

  try {
    const { favorited } = await toggleFavorite(session.user.id, productId);
    return { ok: true, favorited };
  } catch {
    return { ok: false, error: "Não foi possível atualizar os favoritos." };
  }
}

// Hidrata o estado no client: quem está logado e quais ids já são favoritos.
export async function getFavoriteIdsAction(): Promise<{
  authenticated: boolean;
  ids: string[];
}> {
  const session = await auth();
  if (!session?.user?.id) return { authenticated: false, ids: [] };
  const ids = await getFavoriteProductIds(session.user.id);
  return { authenticated: true, ids };
}
