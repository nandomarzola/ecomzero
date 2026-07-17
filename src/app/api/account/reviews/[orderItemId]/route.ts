import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  ProductReviewServiceError,
  saveProductReview,
} from "@/lib/services/productReviewService";
import {
  orderItemIdSchema,
  productReviewInputSchema,
} from "@/lib/validation/productReview";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ orderItemId: string }> },
) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { orderItemId } = await context.params;
  const parsedId = orderItemIdSchema.safeParse(orderItemId);
  const parsedBody = productReviewInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsedId.success || !parsedBody.success) {
    return NextResponse.json(
      { error: "Confira a nota, o comentário e as fotos da avaliação." },
      { status: 400 },
    );
  }

  try {
    const review = await saveProductReview(
      session.user.id,
      parsedId.data,
      parsedBody.data,
    );
    return NextResponse.json({ review });
  } catch (error) {
    if (error instanceof ProductReviewServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Falha ao salvar avaliação de produto", {
      userId: session.user.id,
      orderItemId: parsedId.data,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return NextResponse.json(
      { error: "Não foi possível salvar sua avaliação." },
      { status: 500 },
    );
  }
}
