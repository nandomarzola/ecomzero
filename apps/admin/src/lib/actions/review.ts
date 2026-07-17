"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { moderateProductReview } from "@/lib/services/reviewAdminService";
import { moderateReviewSchema } from "@/lib/validation/review";

export type ReviewActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function moderateReviewAction(
  input: unknown,
): Promise<ReviewActionResult> {
  const session = await auth();
  if (!session?.user?.email) {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }

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
      moderator: session.user.email,
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
