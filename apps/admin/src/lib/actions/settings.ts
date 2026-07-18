"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireVerifiedAdmin } from "@/lib/security/adminAuthorization";
import { ownerOnlySettingsChanged } from "@/lib/security/ownerPermissions";
import { updateStoreSettings } from "@/lib/services/settingsAdminService";
import { storeSettingsSchema } from "@/lib/validation/settings";

export async function saveSettingsAction(input: unknown): Promise<{ ok: true; updatedAt: string } | { ok: false; error: string }> {
  const authorization = await requireVerifiedAdmin();
  if (!authorization.ok) return authorization;
  const parsed = storeSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  if (authorization.admin.role !== "owner") {
    const current = await prisma.storeSettings.findUnique({
      where: { id: "singleton" },
      select: {
        metaPixelAtivo: true,
        metaPixelId: true,
        googleAnalyticsAtivo: true,
        googleAnalyticsId: true,
        googleTagManagerAtivo: true,
        googleTagManagerId: true,
        tiktokPixelAtivo: true,
        tiktokPixelId: true,
        customHeadCodeAtivo: true,
        customHeadCode: true,
      },
    });
    const requestedSensitiveSettings = {
      metaPixelAtivo: parsed.data.metaPixelAtivo,
      metaPixelId: parsed.data.metaPixelId ?? null,
      googleAnalyticsAtivo: parsed.data.googleAnalyticsAtivo,
      googleAnalyticsId: parsed.data.googleAnalyticsId ?? null,
      googleTagManagerAtivo: parsed.data.googleTagManagerAtivo,
      googleTagManagerId: parsed.data.googleTagManagerId ?? null,
      tiktokPixelAtivo: parsed.data.tiktokPixelAtivo,
      tiktokPixelId: parsed.data.tiktokPixelId ?? null,
      customHeadCodeAtivo: parsed.data.customHeadCodeAtivo,
      customHeadCode: parsed.data.customHeadCode ?? null,
    };
    if (!current || ownerOnlySettingsChanged(current, requestedSensitiveSettings)) {
      return { ok: false, error: "Pixels e código personalizado são restritos ao proprietário da loja." };
    }
  }
  try {
    const settings = await updateStoreSettings(parsed.data);
    revalidatePath("/configuracoes");
    return { ok: true, updatedAt: settings.updatedAt.toISOString() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao salvar configurações." };
  }
}
