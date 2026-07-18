"use server";

import { revalidatePath } from "next/cache";
import { requireVerifiedAdmin } from "@/lib/security/adminAuthorization";
import { moderateProductReview } from "@/lib/services/reviewAdminService";
import { moderateReviewSchema } from "@/lib/validation/review";

export type ReviewActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function moderateReviewAction(
  input: unknown,
): Promise<ReviewActionResult> {
  const authorization = await requireVerifiedAdmin();
  if (!authorization.ok) return authorization;

  const parsed = moderateReviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  try {
    await moderateProductReview({
      ...parsed.data,
      moderator: authorization.admin.email,
    });
    revalidatePath("/avaliacoes");
    revalidatePath("/produtos");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha na moderação.",
    };
  }
}
