"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import * as couponService from "@/lib/services/couponAdminService";
import { couponInputSchema } from "@/lib/validation/coupon";

export type CouponActionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function saveCouponAction(id: string | null, input: unknown): Promise<CouponActionResult> {
  if (!(await auth())?.user) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  const parsed = couponInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  try {
    const result = id ? await couponService.updateCoupon(id, parsed.data) : await couponService.createCoupon(parsed.data);
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
