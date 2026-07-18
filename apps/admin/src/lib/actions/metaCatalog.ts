"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  fetchMetaCatalogReport,
  markMetaCatalogValidated,
  updateMetaCatalogSettings,
} from "@/lib/services/metaCatalogAdminService";
import { metaCatalogSettingsSchema } from "@/lib/validation/metaCatalog";

export async function saveMetaCatalogSettingsAction(input: unknown) {
  if (!(await auth())?.user) return { ok: false as const, error: "Sessão expirada. Faça login novamente." };
  const parsed = metaCatalogSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Configuração inválida." };
  }
  try {
    await updateMetaCatalogSettings(parsed.data);
    revalidatePath("/integracoes/meta-catalogo");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Não foi possível salvar." };
  }
}

export async function validateMetaCatalogAction() {
  if (!(await auth())?.user) return { ok: false as const, error: "Sessão expirada. Faça login novamente." };
  const result = await fetchMetaCatalogReport();
  if (!result.ok) return result;
  if (!result.report.xmlValid) {
    return { ok: false as const, error: "O XML gerado é inválido e não foi marcado como validado." };
  }
  await markMetaCatalogValidated();
  revalidatePath("/integracoes/meta-catalogo");
  return {
    ok: true as const,
    totalItems: result.report.metrics.totalItems,
    errors: result.report.metrics.errors,
  };
}
