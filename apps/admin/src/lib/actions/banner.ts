"use server";

import { revalidatePath } from "next/cache";
import { requireVerifiedAdmin } from "@/lib/security/adminAuthorization";
import * as bannerService from "@/lib/services/bannerAdminService";
import { bannerInputSchema } from "@/lib/validation/banner";

export type BannerActionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function saveBannerAction(id: string | null, input: unknown): Promise<BannerActionResult> {
  if (!(await requireVerifiedAdmin()).ok) return { ok: false, error: "Sessão expirada ou 2FA obrigatório. Faça login novamente." };
  const parsed = bannerInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  try {
    const result = id ? await bannerService.updateBanner(id, parsed.data) : await bannerService.createBanner(parsed.data);
    revalidatePath("/banners");
    return { ok: true, id: result.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao salvar banner." };
  }
}

export async function deleteBannerAction(id: string): Promise<BannerActionResult> {
  if (!(await requireVerifiedAdmin()).ok) return { ok: false, error: "Sessão expirada ou 2FA obrigatório. Faça login novamente." };
  try {
    await bannerService.deleteBanner(id);
    revalidatePath("/banners");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao excluir banner." };
  }
}
