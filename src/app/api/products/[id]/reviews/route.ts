import { NextResponse, type NextRequest } from "next/server";
import { getApprovedProductReviewsPage } from "@/lib/services/productReviewService";
import {
  productIdSchema,
  productReviewPaginationSchema,
} from "@/lib/validation/productReview";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsedId = productIdSchema.safeParse(id);
  const parsedPagination = productReviewPaginationSchema.safeParse({
    page: request.nextUrl.searchParams.get("page") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });

  if (!parsedId.success || !parsedPagination.success) {
    return NextResponse.json(
      { error: "Produto ou paginação inválidos." },
      { status: 400 },
    );
  }

  try {
    const result = await getApprovedProductReviewsPage(
      parsedId.data,
      parsedPagination.data.page,
      parsedPagination.data.limit,
    );
    if (!result) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Falha ao listar avaliações de produto", {
      productId: parsedId.data,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return NextResponse.json(
      { error: "Não foi possível carregar as avaliações." },
      { status: 500 },
    );
  }
}
