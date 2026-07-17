import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type ReviewModerationStatus = "pending" | "approved" | "rejected";

export type ReviewAdminListItem = {
  id: string;
  rating: number;
  comment: string | null;
  photos: string[];
  status: ReviewModerationStatus;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { name: string | null; email: string };
  product: { id: string; name: string; image: string };
  order: { id: string };
  variant: string;
};

async function recalculateProductRating(
  tx: Prisma.TransactionClient,
  productId: string,
) {
  const aggregate = await tx.productReview.aggregate({
    where: { productId, status: "approved" },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await tx.product.update({
    where: { id: productId },
    data: {
      avaliacaoMedia: aggregate._avg.rating,
      totalAvaliacoes: aggregate._count.rating,
    },
  });
}

export async function listProductReviews(): Promise<ReviewAdminListItem[]> {
  const reviews = await prisma.productReview.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      rating: true,
      comment: true,
      photos: true,
      status: true,
      rejectionReason: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { name: true, email: true } },
      product: { select: { id: true, nome: true, imagem: true } },
      order: { select: { id: true } },
      orderItem: { select: { variant: { select: { label: true } } } },
    },
  });

  return reviews.map((review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    photos: review.photos,
    status: review.status,
    rejectionReason: review.rejectionReason,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    customer: { name: review.user.name, email: review.user.email },
    product: {
      id: review.product.id,
      name: review.product.nome,
      image: review.product.imagem,
    },
    order: review.order,
    variant: review.orderItem.variant.label,
  }));
}

export async function moderateProductReview(input: {
  reviewId: string;
  status: "approved" | "rejected";
  rejectionReason: string | null;
  moderator: string;
}) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.productReview.findUnique({
      where: { id: input.reviewId },
      select: { productId: true },
    });
    if (!current) throw new Error("Avaliação não encontrada.");

    const review = await tx.productReview.update({
      where: { id: input.reviewId },
      data: {
        status: input.status,
        rejectionReason:
          input.status === "rejected" ? input.rejectionReason : null,
        moderatedAt: new Date(),
        moderatedBy: input.moderator,
      },
      select: { id: true, productId: true, status: true },
    });
    await recalculateProductRating(tx, review.productId);
    return review;
  });
}
