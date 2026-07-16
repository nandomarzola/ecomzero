"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { updateStoreSettings } from "@/lib/services/settingsAdminService";
import { storeSettingsSchema } from "@/lib/validation/settings";

export async function saveSettingsAction(input: unknown): Promise<{ ok: true; updatedAt: string } | { ok: false; error: string }> {
  if (!(await auth())?.user) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  const parsed = storeSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  try {
    const settings = await updateStoreSettings(parsed.data);
    revalidatePath("/configuracoes");
    return { ok: true, updatedAt: settings.updatedAt.toISOString() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao salvar configurações." };
  }
}
