"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import * as couponService from "@/lib/services/couponAdminService";
import { couponDraftSchema, couponPublishSchema } from "@/lib/validation/coupon";

export type CouponActionResult = { ok: true; id?: string } | { ok: false; error: string };

export type CouponSaveMode = "draft" | "publish";

export async function saveCouponAction(
  id: string | null,
  input: unknown,
  mode: CouponSaveMode = "publish",
): Promise<CouponActionResult> {
  if (!(await auth())?.user) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  const schema = mode === "draft" ? couponDraftSchema : couponPublishSchema;
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  // Rascunho é sempre salvo inativo — não pode ser usado na loja até ser publicado.
  const data = mode === "draft" ? { ...parsed.data, ativo: false } : parsed.data;
  try {
    const result = id ? await couponService.updateCoupon(id, data) : await couponService.createCoupon(data);
    revalidatePath("/cupons");
    return { ok: true, id: result.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao salvar cupom." };
  }
}

export async function deleteCouponAction(id: string): Promise<CouponActionResult> {
  if (!(await auth())?.user) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  try {
    await couponService.deleteCoupon(id);
    revalidatePath("/cupons");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao excluir cupom." };
  }
}
