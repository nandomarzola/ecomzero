"use server";

import { revalidatePath } from "next/cache";
import { requireVerifiedAdmin } from "@/lib/security/adminAuthorization";
import { productInputSchema } from "@/lib/validation/product";
import * as productAdminService from "@/lib/services/productAdminService";

// Server Actions "burras": checa sessão → valida com Zod → chama o service →
// revalida a listagem do admin. (A revalidação da LOJA é separada — outro app;
// em dev ela reflete na hora, em produção depende de revalidação própria.)

export type ProductActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

async function isAdmin(): Promise<boolean> {
  return (await requireVerifiedAdmin()).ok;
}

export async function createProductAction(input: unknown): Promise<ProductActionResult> {
  if (!(await isAdmin())) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const { id } = await productAdminService.createProduct(parsed.data);
    revalidatePath("/produtos");
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao salvar." };
  }
}

export async function updateProductAction(
  id: string,
  input: unknown,
): Promise<ProductActionResult> {
  if (!(await isAdmin())) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    await productAdminService.updateProduct(id, parsed.data);
    revalidatePath("/produtos");
    revalidatePath(`/produtos/${id}/editar`);
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao salvar." };
  }
}

export async function setProductActiveAction(
  id: string,
  ativo: boolean,
): Promise<ProductActionResult> {
  if (!(await isAdmin())) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  try {
    await productAdminService.setProductActive(id, ativo);
    revalidatePath("/produtos");
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao atualizar." };
  }
}
