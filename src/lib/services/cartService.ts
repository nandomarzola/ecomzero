import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { OrderGetPayload } from "@/generated/prisma/models";
import type { Cart, CartItem } from "@/types/cart";
import {
  CouponError,
  revalidateAppliedCoupon,
  validateForCustomerCart,
  type CouponCartLine,
  type CouponErrorCode,
} from "@/lib/services/couponService";
import { cancelOrder } from "@/lib/services/orderCancellationService";

// Única camada que toca o Prisma para o carrinho. O carrinho é um Order com
// status "draft" vinculado a uma sessão anônima (sessionId, cookie).

const round2 = (value: number) => Math.round(value * 100) / 100;

const cartInclude = {
  items: {
    include: { variant: { include: { product: true } } },
    orderBy: { id: "asc" as const },
  },
  coupon: true,
} as const;

type OrderWithItems = OrderGetPayload<{ include: typeof cartInclude }>;

export type CartCustomerIdentity = {
  userId: string | null;
  email: string | null;
};

export type CartRecoveryAccess = {
  signedOrderId: string | null;
  userId: string | null;
};

export type CartMutationDependencies = {
  cancelPendingOrder: typeof cancelOrder;
};

export type CartCouponReconciliation = {
  cart: Cart;
  removed: boolean;
  reason: string | null;
  errorCode: CouponErrorCode | null;
};

export const MAX_CART_ITEM_QUANTITY = 20;

export class CartQuantityLimitError extends Error {
  constructor() {
    super(
      `Quantidade máxima de ${MAX_CART_ITEM_QUANTITY} unidades por item atingida`,
    );
    this.name = "CartQuantityLimitError";
  }
}

export class PendingCartMutationBlockedError extends Error {
  constructor(message = "Não foi possível cancelar a cobrança pendente. Continue o pagamento atual ou tente novamente.") {
    super(message);
    this.name = "PendingCartMutationBlockedError";
  }
}

function assertQuantityWithinLimit(quantidade: number): void {
  if (quantidade > MAX_CART_ITEM_QUANTITY) {
    throw new CartQuantityLimitError();
  }
}

function emptyCart(): Cart {
  return {
    id: null,
    status: "draft",
    items: [],
    subtotal: 0,
    discount: 0,
    total: 0,
    pendingPaymentTotal: null,
    itemCount: 0,
    coupon: null,
  };
}

function toCart(order: OrderWithItems): Cart {
  const items: CartItem[] = order.items.map((item) => ({
    id: item.id,
    variantId: item.variantId,
    productId: item.variant.product.id,
    categoryId: item.variant.product.categoryId,
    productSlug: item.variant.product.slug,
    productName: item.variant.product.nome,
    productImage: item.variant.product.imagem,
    variantLabel: item.variant.label,
    skuInterno: item.variant.skuInterno,
    quantidade: item.quantidade,
    precoDe: Number(item.variant.precoDe),
    precoUnitario: Number(item.precoUnitario),
    subtotal: Number(item.precoUnitario) * item.quantidade,
  }));

  const subtotal = round2(items.reduce((sum, item) => sum + item.subtotal, 0));
  const discount = Number(order.descontoCupom);

  return {
    id: order.id,
    status: order.status === "aguardando_pagamento" ? "aguardando_pagamento" : "draft",
    items,
    subtotal,
    discount,
    total: round2(subtotal - discount),
    pendingPaymentTotal: order.status === "aguardando_pagamento" ? Number(order.total) : null,
    itemCount: items.reduce((sum, item) => sum + item.quantidade, 0),
    coupon: order.coupon
      ? { code: order.coupon.codigo, tipo: order.coupon.tipo, freeShipping: order.coupon.tipo === "frete_gratis" }
      : null,
  };
}

const defaultMutationDependencies: CartMutationDependencies = {
  cancelPendingOrder: cancelOrder,
};

async function reopenPendingOrderWithoutCharge(orderId: string, sessionId: string) {
  const reopened = await prisma.order.updateMany({
    where: {
      id: orderId,
      sessionId,
      status: "aguardando_pagamento",
      mercadoPagoPaymentId: null,
      mercadoPagoPreferenceId: null,
    },
    data: {
      status: "draft",
      nomeCliente: null,
      emailCliente: null,
      telefoneCliente: null,
      cpfCnpj: null,
      cepDestino: null,
      logradouro: null,
      numero: null,
      complemento: null,
      bairro: null,
      cidade: null,
      uf: null,
      valorFrete: 0,
      shippingQuoteId: null,
      shippingOptionId: null,
      shippingMode: "legacy",
      shippingProvider: null,
      shippingService: null,
      shippingAmountCharged: 0,
      shippingPayer: "unknown",
      shippingEstimatedDays: null,
      mercadoPagoPreferenceId: null,
      mercadoPagoInitPoint: null,
      mercadoPagoPreferenceExpiresAt: null,
      mercadoPagoPaymentId: null,
      mercadoPagoPaymentStatus: null,
      pagoEm: null,
    },
  });
  if (reopened.count === 1) {
    await recalculateTotal(orderId);
    return true;
  }
  return false;
}

export async function prepareCartForMutation(
  sessionId: string,
  dependencies: CartMutationDependencies = defaultMutationDependencies,
): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const order = await prisma.order.findUnique({
      where: { sessionId },
      select: {
        id: true,
        status: true,
        sessionId: true,
        userId: true,
        emailCliente: true,
        couponId: true,
        subtotal: true,
        mercadoPagoPaymentId: true,
        mercadoPagoPreferenceId: true,
        mercadoPagoPaymentStatus: true,
        items: {
          select: {
            variantId: true,
            quantidade: true,
            precoUnitario: true,
          },
        },
      },
    });
    if (!order) return null;
    if (order.status === "draft") return order.id;
    if (order.status !== "aguardando_pagamento") return null;

    if (
      order.mercadoPagoPaymentStatus?.startsWith("creating:") ||
      order.mercadoPagoPaymentStatus === "creating_preference"
    ) {
      throw new PendingCartMutationBlockedError(
        "O pagamento está sendo iniciado. Aguarde alguns segundos antes de editar o carrinho.",
      );
    }

    const hasProviderAttempt = Boolean(
      order.mercadoPagoPaymentId || order.mercadoPagoPreferenceId,
    );
    if (!hasProviderAttempt) {
      if (await reopenPendingOrderWithoutCharge(order.id, sessionId)) {
        return order.id;
      }
      continue;
    }

    try {
      await dependencies.cancelPendingOrder(order.id, {
        reason: "customer_request",
        note: "Tentativa cancelada automaticamente para permitir a edição do carrinho.",
        requestedBy: order.emailCliente ?? "checkout@ecomzero.com.br",
      });
    } catch {
      throw new PendingCartMutationBlockedError();
    }

    try {
      const createdOrderId = await prisma.$transaction(async (transaction) => {
        const detached = await transaction.order.updateMany({
          where: {
            id: order.id,
            sessionId,
            status: "cancelado",
          },
          data: { sessionId: null },
        });
        if (detached.count !== 1) {
          throw new PendingCartMutationBlockedError(
            "O carrinho mudou durante o cancelamento. Atualize a página e tente novamente.",
          );
        }

        const subtotal = order.items.reduce(
          (sum, item) => sum.plus(item.precoUnitario.mul(item.quantidade)),
          new Prisma.Decimal(0),
        );
        const created = await transaction.order.create({
          data: {
            sessionId,
            status: "draft",
            userId: order.userId,
            couponId: order.couponId,
            subtotal,
            descontoCupom: 0,
            total: subtotal,
            items: {
              create: order.items.map((item) => ({
                variantId: item.variantId,
                quantidade: item.quantidade,
                precoUnitario: item.precoUnitario,
              })),
            },
          },
          select: { id: true },
        });
        return created.id;
      });
      await recalculateTotal(createdOrderId);
      return createdOrderId;
    } catch (error) {
      if (error instanceof PendingCartMutationBlockedError) throw error;
      throw new PendingCartMutationBlockedError(
        "A cobrança foi cancelada, mas não foi possível reabrir o carrinho. Atualize a página.",
      );
    }
  }

  throw new PendingCartMutationBlockedError(
    "O estado do pagamento mudou. Atualize a página antes de editar o carrinho.",
  );
}

function toCouponLines(items: Array<{
  quantidade: number;
  precoUnitario: { toString(): string };
  variant: { product: { id: string; categoryId: string | null } };
}>): CouponCartLine[] {
  return items.map((item) => ({
    productId: item.variant.product.id,
    categoryId: item.variant.product.categoryId,
    quantity: item.quantidade,
    unitPrice: Number(item.precoUnitario),
  }));
}

// Recalcula subtotal/desconto/total do carrinho após qualquer mudança de item.
// Se há cupom aplicado, revalida (pode ter caído abaixo do mínimo → é removido
// silenciosamente). Também invalida a cotação de frete guardada.
async function recalculateTotal(orderId: string): Promise<void> {
  const [items, order] = await Promise.all([
    prisma.orderItem.findMany({
      where: { orderId },
      include: { variant: { select: { product: { select: { id: true, categoryId: true } } } } },
    }),
    prisma.order.findUnique({ where: { id: orderId }, select: { couponId: true } }),
  ]);
  const subtotal = round2(
    items.reduce((sum, item) => sum + Number(item.precoUnitario) * item.quantidade, 0),
  );

  let discount = 0;
  let couponId: string | null = order?.couponId ?? null;
  if (couponId) {
    const applied = await revalidateAppliedCoupon(couponId, toCouponLines(items));
    if (applied) discount = applied.productDiscount;
    else couponId = null;
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { subtotal, descontoCupom: discount, total: round2(subtotal - discount), couponId },
    }),
    prisma.checkoutShippingQuote.deleteMany({ where: { orderId } }),
  ]);
}

// Aplica um cupom ao carrinho (draft) usando a identidade disponível. A mesma
// elegibilidade ainda é repetida de forma autoritativa no checkout.
export async function applyCoupon(
  sessionId: string,
  code: string,
  identity: CartCustomerIdentity,
): Promise<Cart> {
  await prepareCartForMutation(sessionId);
  const order = await prisma.order.findUnique({
    where: { sessionId },
    include: { items: { include: { variant: { select: { product: { select: { id: true, categoryId: true } } } } } } },
  });
  if (!order || order.status !== "draft" || order.items.length === 0) {
    throw new Error("Carrinho vazio.");
  }
  const subtotal = round2(
    order.items.reduce((sum, item) => sum + Number(item.precoUnitario) * item.quantidade, 0),
  );
  const applied = await validateForCustomerCart(code, {
    orderId: order.id,
    lines: toCouponLines(order.items),
    userId: identity.userId,
    email: identity.email,
  });
  await prisma.order.update({
    where: { id: order.id },
    data: {
      couponId: applied.couponId,
      descontoCupom: applied.productDiscount,
      subtotal,
      total: round2(subtotal - applied.productDiscount),
    },
  });
  return getCart(sessionId);
}

export async function autoApplyCampaignCoupon(
  sessionId: string,
  code: string,
  identity: CartCustomerIdentity,
): Promise<Cart> {
  if (!identity.userId && !identity.email) {
    throw new CouponError("Entre para validar esta oferta.", "IDENTITY_REQUIRED");
  }
  const order = await prisma.order.findUnique({
    where: { sessionId },
    include: {
      items: { include: { variant: { select: { product: { select: { id: true, categoryId: true } } } } } },
      coupon: { select: { id: true } },
    },
  });
  if (!order || order.status !== "draft" || order.items.length === 0 || order.coupon) {
    return getCart(sessionId);
  }

  const applied = await validateForCustomerCart(code, {
    orderId: order.id,
    lines: toCouponLines(order.items),
    userId: identity.userId,
    email: identity.email,
  });
  const subtotal = round2(
    order.items.reduce((sum, item) => sum + Number(item.precoUnitario) * item.quantidade, 0),
  );
  await prisma.order.update({
    where: { id: order.id },
    data: {
      couponId: applied.couponId,
      descontoCupom: applied.productDiscount,
      subtotal,
      total: round2(subtotal - applied.productDiscount),
    },
  });
  return getCart(sessionId);
}

export async function clearCouponIfMatching(
  sessionId: string,
  couponId: string,
): Promise<Cart> {
  const order = await prisma.order.findUnique({
    where: { sessionId },
    include: { items: true },
  });
  if (
    !order ||
    order.status !== "draft" ||
    order.couponId !== couponId
  ) {
    return getCart(sessionId);
  }

  const subtotal = round2(
    order.items.reduce(
      (sum, item) => sum + Number(item.precoUnitario) * item.quantidade,
      0,
    ),
  );
  await prisma.order.updateMany({
    where: { id: order.id, status: "draft", couponId },
    data: {
      couponId: null,
      descontoCupom: 0,
      subtotal,
      total: subtotal,
    },
  });
  return getCart(sessionId);
}

export async function reconcileCartCoupon(
  sessionId: string | null,
  identity: CartCustomerIdentity,
): Promise<CartCouponReconciliation> {
  if (!sessionId) {
    return {
      cart: emptyCart(),
      removed: false,
      reason: null,
      errorCode: null,
    };
  }

  const order = await prisma.order.findUnique({
    where: { sessionId },
    include: cartInclude,
  });
  if (
    !order ||
    order.status !== "draft" ||
    !order.couponId ||
    !order.coupon
  ) {
    return {
      cart: order ? toCart(order) : emptyCart(),
      removed: false,
      reason: null,
      errorCode: null,
    };
  }

  try {
    const applied = await validateForCustomerCart(order.coupon.codigo, {
      orderId: order.id,
      lines: toCouponLines(order.items),
      userId: identity.userId,
      email: identity.email,
    });
    const subtotal = round2(
      order.items.reduce(
        (sum, item) => sum + Number(item.precoUnitario) * item.quantidade,
        0,
      ),
    );
    await prisma.order.updateMany({
      where: { id: order.id, status: "draft", couponId: order.couponId },
      data: {
        descontoCupom: applied.productDiscount,
        subtotal,
        total: round2(subtotal - applied.productDiscount),
      },
    });
    return {
      cart: await getCart(sessionId),
      removed: false,
      reason: null,
      errorCode: null,
    };
  } catch (error) {
    if (!(error instanceof CouponError)) throw error;
    return {
      cart: await clearCouponIfMatching(sessionId, order.couponId),
      removed: true,
      reason: error.message,
      errorCode: error.code,
    };
  }
}

export async function removeCoupon(sessionId: string): Promise<Cart> {
  await prepareCartForMutation(sessionId);
  const order = await prisma.order.findUnique({
    where: { sessionId },
    include: { items: true },
  });
  if (!order) return getCart(sessionId);
  const subtotal = round2(
    order.items.reduce((sum, item) => sum + Number(item.precoUnitario) * item.quantidade, 0),
  );
  await prisma.order.update({
    where: { id: order.id },
    data: { couponId: null, descontoCupom: 0, subtotal, total: subtotal },
  });
  return getCart(sessionId);
}

export async function clearCart(sessionId: string): Promise<Cart> {
  await prepareCartForMutation(sessionId);
  await prisma.order.deleteMany({
    where: { sessionId, status: "draft" },
  });
  return emptyCart();
}

export async function getCart(
  sessionId: string | null,
  recovery?: CartRecoveryAccess,
): Promise<Cart> {
  if (sessionId) {
    const order = await prisma.order.findUnique({
      where: { sessionId },
      include: cartInclude,
    });
    if (order) return toCart(order);
  }

  if (!recovery?.signedOrderId && !recovery?.userId) {
    return emptyCart();
  }

  const recoverableOrder = recovery.signedOrderId
    ? await prisma.order.findFirst({
        where: {
          id: recovery.signedOrderId,
          sessionId: null,
          status: "aguardando_pagamento",
        },
        include: cartInclude,
      })
    : await prisma.order.findFirst({
        where: {
          userId: recovery.userId,
          sessionId: null,
          status: "aguardando_pagamento",
        },
        orderBy: { createdAt: "desc" },
        include: cartInclude,
      });

  if (!recoverableOrder) return emptyCart();
  if (!sessionId) return toCart(recoverableOrder);

  try {
    const recovered = await prisma.order.updateMany({
      where: {
        id: recoverableOrder.id,
        sessionId: null,
        status: "aguardando_pagamento",
      },
      data: { sessionId },
    });
    if (recovered.count === 1) {
      return toCart({ ...recoverableOrder, sessionId });
    }
  } catch (error) {
    if (
      !(
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
    ) {
      throw error;
    }
  }

  const concurrentlyRecovered = await prisma.order.findUnique({
    where: { sessionId },
    include: cartInclude,
  });

  return concurrentlyRecovered ? toCart(concurrentlyRecovered) : emptyCart();
}

export async function addItem(
  sessionId: string,
  variantId: string,
  quantidade: number,
): Promise<Cart> {
  assertQuantityWithinLimit(quantidade);

  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) throw new Error("Variante não encontrada");

  await prepareCartForMutation(sessionId);

  const order = await prisma.order.upsert({
    where: { sessionId },
    update: {},
    create: { sessionId, status: "draft", total: 0 },
  });

  const existingItem = await prisma.orderItem.findUnique({
    where: { orderId_variantId: { orderId: order.id, variantId } },
  });

  if (existingItem) {
    const updated = await prisma.orderItem.updateMany({
      where: {
        id: existingItem.id,
        quantidade: { lte: MAX_CART_ITEM_QUANTITY - quantidade },
      },
      data: { quantidade: { increment: quantidade } },
    });

    if (updated.count === 0) throw new CartQuantityLimitError();
  } else {
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        variantId,
        quantidade,
        precoUnitario: variant.precoPor,
      },
    });
  }

  await recalculateTotal(order.id);
  return getCart(sessionId);
}

export async function updateItemQuantity(
  sessionId: string,
  itemId: string,
  quantidade: number,
): Promise<Cart> {
  assertQuantityWithinLimit(quantidade);

  const originalItem = await prisma.orderItem.findFirst({
    where: { id: itemId, order: { sessionId } },
    select: { variantId: true },
  });
  if (!originalItem) return getCart(sessionId);

  const orderId = await prepareCartForMutation(sessionId);
  if (!orderId) return emptyCart();

  const item = await prisma.orderItem.findUnique({
    where: {
      orderId_variantId: { orderId, variantId: originalItem.variantId },
    },
  });
  if (!item) return getCart(sessionId);

  await prisma.orderItem.update({ where: { id: item.id }, data: { quantidade } });
  await recalculateTotal(orderId);
  return getCart(sessionId);
}

export async function removeItem(sessionId: string, itemId: string): Promise<Cart> {
  const originalItem = await prisma.orderItem.findFirst({
    where: { id: itemId, order: { sessionId } },
    select: { variantId: true },
  });
  if (!originalItem) return getCart(sessionId);

  const orderId = await prepareCartForMutation(sessionId);
  if (!orderId) return emptyCart();

  const item = await prisma.orderItem.findUnique({
    where: {
      orderId_variantId: { orderId, variantId: originalItem.variantId },
    },
  });
  if (!item) return getCart(sessionId);

  await prisma.orderItem.delete({ where: { id: item.id } });
  await recalculateTotal(orderId);
  return getCart(sessionId);
}
