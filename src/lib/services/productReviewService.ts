import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isDeliveredOrder } from "@/lib/reviews/reviewDomain";
import type {
  ProductReviewInput,
  ProductReviewSubmissionInput,
} from "@/lib/validation/productReview";

type ProductReviewErrorCode =
  | "ORDER_ITEM_NOT_FOUND"
  | "ORDER_NOT_DELIVERED"
  | "PRODUCT_NOT_FOUND"
  | "ALREADY_REVIEWED"
  | "NOT_ELIGIBLE";

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

const publicReviewSelect = {
  id: true,
  rating: true,
  comment: true,
  photos: true,
  createdAt: true,
  user: { select: { name: true } },
  orderItem: { select: { variant: { select: { label: true } } } },
} satisfies Prisma.ProductReviewSelect;

function serializePublicReview<
  T extends { createdAt: Date },
>(review: T) {
  return {
    ...review,
    createdAt: review.createdAt.toISOString(),
  };
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

async function findReviewableOrderItem(
  tx: Prisma.TransactionClient,
  userId: string,
  productId: string,
) {
  const items = await tx.orderItem.findMany({
    where: {
      variant: { productId },
      order: { userId, status: "pago" },
    },
    select: {
      id: true,
      orderId: true,
      order: {
        select: {
          shipment: {
            select: {
              status: true,
              labelStatus: true,
              entregueEm: true,
            },
          },
        },
      },
    },
  });

  return items.find((item) => isDeliveredOrder(item.order.shipment)) ?? null;
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
        status: "pending",
      },
      update: {
        rating: input.rating,
        comment: input.comment,
        photos: input.photos,
        status: "pending",
        moderatedAt: null,
        moderatedBy: null,
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

export async function createProductReview(
  userId: string,
  input: ProductReviewSubmissionInput,
) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: input.productId, ativo: true },
      select: { id: true },
    });
    if (!product) {
      throw new ProductReviewServiceError(
        "Produto não encontrado.",
        "PRODUCT_NOT_FOUND",
        404,
      );
    }

    const existingReview = await tx.productReview.findFirst({
      where: { userId, productId: product.id },
      select: { id: true },
    });
    if (existingReview) {
      throw new ProductReviewServiceError(
        "Você já avaliou este produto.",
        "ALREADY_REVIEWED",
        409,
      );
    }

    const item = await findReviewableOrderItem(tx, userId, product.id);
    if (!item) {
      throw new ProductReviewServiceError(
        "Apenas clientes que compraram e receberam este produto podem avaliá-lo.",
        "NOT_ELIGIBLE",
        403,
      );
    }

    return tx.productReview.create({
      data: {
        userId,
        productId: product.id,
        orderId: item.orderId,
        orderItemId: item.id,
        rating: input.rating,
        comment: input.comment,
        photos: [],
        status: "pending",
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        status: true,
        createdAt: true,
      },
    });
  });
}

export async function getProductReviewEligibility(
  userId: string,
  productId: string,
) {
  return prisma.$transaction(async (tx) => {
    const existingReview = await tx.productReview.findFirst({
      where: { userId, productId },
      select: { id: true },
    });
    if (existingReview) return null;

    const item = await findReviewableOrderItem(tx, userId, productId);
    return item ? { orderItemId: item.id } : null;
  });
}

export async function getProductReviewsOverview(productId: string) {
  const [reviews, aggregate] = await prisma.$transaction([
    prisma.productReview.findMany({
      where: { productId, status: "approved" },
      orderBy: { createdAt: "desc" },
      select: publicReviewSelect,
    }),
    prisma.productReview.aggregate({
      where: { productId, status: "approved" },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  return {
    reviews: reviews.map(serializePublicReview),
    average: aggregate._avg.rating,
    count: aggregate._count.rating,
  };
}

export async function getApprovedProductReviewsPage(
  productId: string,
  page: number,
  pageSize: number,
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, ativo: true },
    select: { id: true },
  });
  if (!product) return null;

  const [reviews, aggregate] = await prisma.$transaction([
    prisma.productReview.findMany({
      where: { productId, status: "approved" },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: publicReviewSelect,
    }),
    prisma.productReview.aggregate({
      where: { productId, status: "approved" },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  const count = aggregate._count.rating;
  return {
    reviews: reviews.map(serializePublicReview),
    aggregate: {
      average: aggregate._avg.rating,
      count,
    },
    pagination: {
      page,
      pageSize,
      totalItems: count,
      totalPages: Math.ceil(count / pageSize),
    },
  };
}
