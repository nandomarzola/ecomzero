"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { categoryInputSchema, categoryReorderSchema } from "@/lib/validation/category";
import * as categoryService from "@/lib/services/categoryAdminService";

export type CategoryActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

async function hasAdminSession() {
  return Boolean((await auth())?.user);
}

export async function saveCategoryAction(
  id: string | null,
  input: unknown,
): Promise<CategoryActionResult> {
  if (!(await hasAdminSession())) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    const result = id
      ? await categoryService.updateCategory(id, parsed.data)
      : await categoryService.createCategory(parsed.data);
    revalidatePath("/categorias");
    revalidatePath("/produtos/novo");
    return { ok: true, id: result.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao salvar categoria." };
  }
}

export async function deleteCategoryAction(id: string): Promise<CategoryActionResult> {
  if (!(await hasAdminSession())) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  try {
    await categoryService.deleteCategory(id);
    revalidatePath("/categorias");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao excluir categoria." };
  }
}

export async function duplicateCategoryAction(id: string): Promise<CategoryActionResult> {
  if (!(await hasAdminSession())) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  try {
    const result = await categoryService.duplicateCategory(id);
    revalidatePath("/categorias");
    return { ok: true, id: result.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao duplicar categoria." };
  }
}

export async function reorderCategoriesAction(input: unknown): Promise<CategoryActionResult> {
  if (!(await hasAdminSession())) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  const parsed = categoryReorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ordem inválida." };

  try {
    await categoryService.reorderCategories(parsed.data);
    revalidatePath("/categorias");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao reordenar categorias." };
  }
}
