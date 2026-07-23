import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  createProductReview,
  ProductReviewServiceError,
} from "@/lib/services/productReviewService";
import { productReviewSubmissionSchema } from "@/lib/validation/productReview";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = productReviewSubmissionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Confira o produto, a nota e o comentário da avaliação." },
      { status: 400 },
    );
  }

  try {
    const review = await createProductReview(session.user.id, parsed.data);
    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    if (error instanceof ProductReviewServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Falha ao criar avaliação de produto", {
      userId: session.user.id,
      productId: parsed.data.productId,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return NextResponse.json(
      { error: "Não foi possível enviar sua avaliação." },
      { status: 500 },
    );
  }
}
