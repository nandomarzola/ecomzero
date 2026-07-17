import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isDeliveredOrder } from "@/lib/reviews/reviewDomain";
import type { ProductReviewInput } from "@/lib/validation/productReview";

type ProductReviewErrorCode =
  | "ORDER_ITEM_NOT_FOUND"
  | "ORDER_NOT_DELIVERED"
  | "REVIEW_REMOVED";

export class ProductReviewServiceError extends Error {
  constructor(
    message: string,
    public readonly code: ProductReviewErrorCode,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ProductReviewServiceError";
  }
}

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

export async function saveProductReview(
  userId: string,
  orderItemId: string,
  input: ProductReviewInput,
) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.orderItem.findUnique({
      where: { id: orderItemId },
      select: {
        id: true,
        orderId: true,
        order: {
          select: {
            userId: true,
            status: true,
            shipment: {
              select: {
                status: true,
                labelStatus: true,
                entregueEm: true,
              },
            },
          },
        },
        variant: { select: { productId: true } },
        review: { select: { status: true } },
      },
    });

    if (!item || item.order.userId !== userId) {
      throw new ProductReviewServiceError(
        "Item do pedido não encontrado.",
        "ORDER_ITEM_NOT_FOUND",
        404,
      );
    }

    if (item.order.status !== "pago" || !isDeliveredOrder(item.order.shipment)) {
      throw new ProductReviewServiceError(
        "A avaliação só é liberada depois que o pedido for entregue.",
        "ORDER_NOT_DELIVERED",
        409,
      );
    }

    if (item.review?.status === "rejected") {
      throw new ProductReviewServiceError(
        "Esta avaliação foi removida pela moderação e não pode ser reenviada.",
        "REVIEW_REMOVED",
        403,
      );
    }

    const publishedAt = new Date();

    const review = await tx.productReview.upsert({
      where: { orderItemId: item.id },
      create: {
        userId,
        productId: item.variant.productId,
        orderId: item.orderId,
        orderItemId: item.id,
        rating: input.rating,
        comment: input.comment,
        photos: input.photos,
        status: "approved",
        moderatedAt: publishedAt,
        moderatedBy: "automatic",
      },
      update: {
        rating: input.rating,
        comment: input.comment,
        photos: input.photos,
        status: "approved",
        moderatedAt: publishedAt,
        moderatedBy: "automatic",
        rejectionReason: null,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        photos: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await recalculateProductRating(tx, item.variant.productId);

    return review;
  });
}

export async function getApprovedProductReviews(productId: string) {
  return prisma.productReview.findMany({
    where: { productId, status: "approved" },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      rating: true,
      comment: true,
      photos: true,
      createdAt: true,
      user: { select: { name: true } },
      orderItem: { select: { variant: { select: { label: true } } } },
    },
  });
}
