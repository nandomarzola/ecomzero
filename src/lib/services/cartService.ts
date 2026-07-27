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
import {
  getVolumePriceForQuantity,
  getVolumePricing,
} from "@/lib/productVolumePricing";
import {
  mergeCartLines,
  selectMergedCouponId,
} from "@/lib/cartMergeDomain";

// Única camada que toca o Prisma para o carrinho. O carrinho é um Order com
// status "draft" vinculado a uma sessão anônima (sessionId, cookie).

const round2 = (value: number) => Math.round(value * 100) / 100;

const cartInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: {
              variantes: {
                select: {
                  id: true,
                  label: true,
                  precoDe: true,
                  precoPor: true,
                },
              },
            },
          },
        },
      },
    },
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
  const items: CartItem[] = order.items.map((item) => {
    const volumePrice = getVolumePriceForQuantity(
      (item.variant.product.variantes ?? []).map((variant) => ({
        ...variant,
        precoDe: Number(variant.precoDe),
        precoPor: Number(variant.precoPor),
      })),
      item.quantidade,
    );

    return {
      id: item.id,
      variantId: item.variantId,
      productId: item.variant.product.id,
      categoryId: item.variant.product.categoryId,
      productSlug: item.variant.product.slug,
      productName: item.variant.product.nome,
      productImage: item.variant.product.imagem,
      variantLabel: volumePrice ? "Unidade" : item.variant.label,
      skuInterno: item.variant.skuInterno,
      quantidade: item.quantidade,
      precoDe: volumePrice?.listUnitPrice ?? Number(item.variant.precoDe),
      precoUnitario: Number(item.precoUnitario),
      subtotal: Number(item.precoUnitario) * item.quantidade,
    };
  });

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

function hasStaleVolumePrice(order: OrderWithItems): boolean {
  if (order.status !== "draft") return false;

  return order.items.some((item) => {
    const volumePrice = getVolumePriceForQuantity(
      (item.variant.product.variantes ?? []).map((variant) => ({
        ...variant,
        precoDe: Number(variant.precoDe),
        precoPor: Number(variant.precoPor),
      })),
      item.quantidade,
    );
    return Boolean(
      volumePrice &&
      Number(item.precoUnitario) !== volumePrice.unitPrice,
    );
  });
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
      include: {
        variant: {
          include: {
            product: {
              select: {
                id: true,
                categoryId: true,
                variantes: {
                  select: {
                    id: true,
                    label: true,
                    precoDe: true,
                    precoPor: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.order.findUnique({ where: { id: orderId }, select: { couponId: true } }),
  ]);
  const pricedItems = items.map((item) => {
    const volumePrice = getVolumePriceForQuantity(
      (item.variant.product.variantes ?? []).map((variant) => ({
        ...variant,
        precoDe: Number(variant.precoDe),
        precoPor: Number(variant.precoPor),
      })),
      item.quantidade,
    );
    return {
      item,
      unitPrice: volumePrice?.unitPrice ?? Number(item.variant.precoPor),
    };
  });
  const subtotal = round2(
    pricedItems.reduce(
      (sum, { item, unitPrice }) => sum + unitPrice * item.quantidade,
      0,
    ),
  );

  let discount = 0;
  let couponId: string | null = order?.couponId ?? null;
  if (couponId) {
    const applied = await revalidateAppliedCoupon(
      couponId,
      pricedItems.map(({ item, unitPrice }) => ({
        productId: item.variant.product.id,
        categoryId: item.variant.product.categoryId,
        quantity: item.quantidade,
        unitPrice,
      })),
    );
    if (applied) discount = applied.productDiscount;
    else couponId = null;
  }

  await prisma.$transaction([
    ...pricedItems.flatMap(({ item, unitPrice }) =>
      Number(item.precoUnitario) === unitPrice
        ? []
        : [
            prisma.orderItem.update({
              where: { id: item.id },
              data: { precoUnitario: unitPrice },
            }),
          ],
    ),
    prisma.order.update({
      where: { id: orderId },
      data: { subtotal, descontoCupom: discount, total: round2(subtotal - discount), couponId },
    }),
    prisma.checkoutShippingQuote.deleteMany({ where: { orderId } }),
  ]);
}

export async function synchronizeAuthenticatedCart(
  sessionId: string,
  userId: string,
): Promise<void> {
  let synchronization:
    | {
        orderId: string | null;
        changed: boolean;
        recalculate: boolean;
        mergedDrafts: number;
        mergedItems: number;
      }
    | undefined;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      synchronization = await prisma.$transaction(
        async (transaction) => {
          const currentOrder = await transaction.order.findUnique({
            where: { sessionId },
            include: cartInclude,
          });
          const belongsToAnotherUser = Boolean(
            currentOrder?.userId && currentOrder.userId !== userId,
          );

          if (
            currentOrder?.status === "aguardando_pagamento" &&
            !belongsToAnotherUser
          ) {
            return {
              orderId: currentOrder.id,
              changed: false,
              recalculate: false,
              mergedDrafts: 0,
              mergedItems: currentOrder.items.length,
            };
          }

          if (
            currentOrder &&
            (belongsToAnotherUser ||
              currentOrder.status === "pago" ||
              currentOrder.status === "cancelado")
          ) {
            await transaction.order.update({
              where: { id: currentOrder.id },
              data: { sessionId: null },
            });
          }

          const currentDraft =
            currentOrder?.status === "draft" && !belongsToAnotherUser
              ? currentOrder
              : null;
          const accountDrafts = await transaction.order.findMany({
            where: {
              userId,
              status: "draft",
              ...(currentDraft ? { id: { not: currentDraft.id } } : {}),
            },
            orderBy: { createdAt: "desc" },
            include: cartInclude,
          });
          const drafts = currentDraft
            ? [currentDraft, ...accountDrafts]
            : accountDrafts;

          if (drafts.length === 0) {
            return {
              orderId: null,
              changed: Boolean(currentOrder && currentOrder.sessionId),
              recalculate: false,
              mergedDrafts: 0,
              mergedItems: 0,
            };
          }

          const target = accountDrafts[0] ?? currentDraft ?? drafts[0];
          const sourceDrafts = drafts.filter(
            (draft) => draft.id !== target.id,
          );
          const priceByVariantId = new Map<string, Prisma.Decimal>();
          const canonicalVariantIdByItemId = new Map<string, string>();
          const lines = drafts.flatMap((draft) =>
            draft.items.map((item) => {
              const productVariants = (
                item.variant.product.variantes ?? []
              ).map((variant) => ({
                ...variant,
                precoDe: Number(variant.precoDe),
                precoPor: Number(variant.precoPor),
              }));
              const canonicalVariantId =
                getVolumePricing(productVariants)?.canonicalVariantId ??
                item.variantId;
              const canonicalVariant =
                item.variant.product.variantes.find(
                  (variant) => variant.id === canonicalVariantId,
                ) ?? item.variant;
              priceByVariantId.set(
                canonicalVariantId,
                canonicalVariant.precoPor,
              );
              canonicalVariantIdByItemId.set(
                item.id,
                canonicalVariantId,
              );
              return {
                variantId: item.variantId,
                canonicalVariantId,
                quantity: item.quantidade,
              };
            }),
          );
          const mergedLines = mergeCartLines(
            lines,
            MAX_CART_ITEM_QUANTITY,
          );
          const couponId = selectMergedCouponId(
            drafts.map((draft) => draft.couponId),
          );
          const targetItemsByCanonicalVariant = new Map<
            string,
            typeof target.items
          >();
          for (const item of target.items) {
            const canonicalVariantId =
              canonicalVariantIdByItemId.get(item.id) ?? item.variantId;
            targetItemsByCanonicalVariant.set(canonicalVariantId, [
              ...(targetItemsByCanonicalVariant.get(canonicalVariantId) ?? []),
              item,
            ]);
          }
          const retainedTargetItemIds = new Set<string>();
          const targetItemUpdates = mergedLines.flatMap((line) => {
            const candidates =
              targetItemsByCanonicalVariant.get(line.variantId) ?? [];
            const existing =
              candidates.find(
                (candidate) => candidate.variantId === line.variantId,
              ) ?? candidates[0];
            if (!existing) return [];
            retainedTargetItemIds.add(existing.id);
            return [{
              id: existing.id,
              variantId: line.variantId,
              quantidade: line.quantity,
              precoUnitario:
                priceByVariantId.get(line.variantId) ??
                existing.precoUnitario,
            }];
          });
          const targetItemIdsToDelete = target.items
            .filter((item) => !retainedTargetItemIds.has(item.id))
            .map((item) => item.id);
          const linesToCreate = mergedLines.filter(
            (line) =>
              !targetItemUpdates.some(
                (update) => update.variantId === line.variantId,
              ),
          );
          const itemsChanged =
            sourceDrafts.length > 0 ||
            targetItemIdsToDelete.length > 0 ||
            linesToCreate.length > 0 ||
            targetItemUpdates.some((update) => {
              const existing = target.items.find(
                (item) => item.id === update.id,
              );
              return (
                !existing ||
                existing.variantId !== update.variantId ||
                existing.quantidade !== update.quantidade ||
                Number(existing.precoUnitario) !==
                  Number(update.precoUnitario)
              );
            });
          const couponChanged = target.couponId !== couponId;
          const metadataChanged =
            target.sessionId !== sessionId ||
            target.userId !== userId;
          const changed =
            itemsChanged || couponChanged || metadataChanged;

          if (!changed) {
            return {
              orderId: target.id,
              changed: false,
              recalculate: false,
              mergedDrafts: 0,
              mergedItems: target.items.length,
            };
          }

          if (itemsChanged) {
            await transaction.checkoutShippingQuote.deleteMany({
              where: { orderId: { in: drafts.map((draft) => draft.id) } },
            });
          }
          if (targetItemIdsToDelete.length > 0) {
            await transaction.orderItem.deleteMany({
              where: { id: { in: targetItemIdsToDelete } },
            });
          }
          for (const update of targetItemUpdates) {
            await transaction.orderItem.update({
              where: { id: update.id },
              data: {
                variantId: update.variantId,
                quantidade: update.quantidade,
                precoUnitario: update.precoUnitario,
              },
            });
          }
          if (linesToCreate.length > 0) {
            await transaction.orderItem.createMany({
              data: linesToCreate.map((line) => ({
                orderId: target.id,
                variantId: line.variantId,
                quantidade: line.quantity,
                precoUnitario:
                  priceByVariantId.get(line.variantId) ??
                  new Prisma.Decimal(0),
              })),
            });
          }
          if (sourceDrafts.length > 0) {
            await transaction.order.deleteMany({
              where: { id: { in: sourceDrafts.map((draft) => draft.id) } },
            });
          }
          await transaction.order.update({
            where: { id: target.id },
            data: {
              sessionId,
              userId,
              couponId,
              subtotal: 0,
              descontoCupom: 0,
              total: 0,
            },
          });

          return {
            orderId: target.id,
            changed: true,
            recalculate: itemsChanged || couponChanged,
            mergedDrafts: sourceDrafts.length,
            mergedItems: mergedLines.length,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      break;
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034");
      if (!retryable || attempt === 1) throw error;
    }
  }

  if (!synchronization?.orderId || !synchronization.changed) return;

  if (synchronization.recalculate) {
    await recalculateTotal(synchronization.orderId);
  }
  console.info("Authenticated cart synchronized", {
    userReference: userId.slice(0, 8),
    orderReference: synchronization.orderId.slice(0, 8),
    mergedDrafts: synchronization.mergedDrafts,
    mergedItems: synchronization.mergedItems,
  });
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
    const canUseSessionOrder = Boolean(
      order &&
      (!recovery?.userId ||
        !order.userId ||
        order.userId === recovery.userId ||
        recovery.signedOrderId === order.id),
    );
    if (order && canUseSessionOrder) {
      if (hasStaleVolumePrice(order)) {
        await recalculateTotal(order.id);
        const repricedOrder = await prisma.order.findUnique({
          where: { id: order.id },
          include: cartInclude,
        });
        if (repricedOrder) return toCart(repricedOrder);
      }
      return toCart(order);
    }
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

  if (!recoverableOrder) {
    if (!recovery.userId) return emptyCart();
    const accountDraft = await prisma.order.findFirst({
      where: {
        userId: recovery.userId,
        status: "draft",
      },
      orderBy: { createdAt: "desc" },
      include: cartInclude,
    });
    return accountDraft ? toCart(accountDraft) : emptyCart();
  }
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
  userId: string | null = null,
): Promise<Cart> {
  assertQuantityWithinLimit(quantidade);

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      product: {
        include: {
          variantes: {
            select: {
              id: true,
              label: true,
              precoDe: true,
              precoPor: true,
            },
          },
        },
      },
    },
  });
  if (!variant) throw new Error("Variante não encontrada");
  const productVariants = variant.product.variantes.map((productVariant) => ({
    ...productVariant,
    precoDe: Number(productVariant.precoDe),
    precoPor: Number(productVariant.precoPor),
  }));
  const volumePricing = getVolumePricing(productVariants);
  const targetVariantId = volumePricing?.canonicalVariantId ?? variant.id;
  const targetVariant =
    variant.product.variantes.find(
      (productVariant) => productVariant.id === targetVariantId,
    ) ?? variant;

  await prepareCartForMutation(sessionId);

  const order = await prisma.order.upsert({
    where: { sessionId },
    update: userId ? { userId } : {},
    create: { sessionId, userId, status: "draft", total: 0 },
  });

  const existingItem = await prisma.orderItem.findUnique({
    where: {
      orderId_variantId: {
        orderId: order.id,
        variantId: targetVariantId,
      },
    },
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
        variantId: targetVariantId,
        quantidade,
        precoUnitario:
          getVolumePriceForQuantity(productVariants, quantidade)?.unitPrice ??
          targetVariant.precoPor,
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
  userId: string | null = null,
): Promise<Cart> {
  assertQuantityWithinLimit(quantidade);

  const originalItem = await prisma.orderItem.findFirst({
    where: {
      id: itemId,
      order: userId
        ? {
            OR: [
              { sessionId },
              { userId, status: "draft" },
            ],
          }
        : { sessionId },
    },
    select: {
      variantId: true,
      variant: {
        select: {
          product: {
            select: {
              variantes: {
                select: {
                  id: true,
                  label: true,
                  precoDe: true,
                  precoPor: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (userId) {
    await synchronizeAuthenticatedCart(sessionId, userId);
  }
  if (!originalItem) return getCart(sessionId);
  const canonicalVariantId =
    getVolumePricing(
      (originalItem.variant?.product.variantes ?? []).map((variant) => ({
        ...variant,
        precoDe: Number(variant.precoDe),
        precoPor: Number(variant.precoPor),
      })),
    )?.canonicalVariantId ?? originalItem.variantId;

  const orderId = await prepareCartForMutation(sessionId);
  if (!orderId) return emptyCart();

  const item = await prisma.orderItem.findUnique({
    where: {
      orderId_variantId: { orderId, variantId: canonicalVariantId },
    },
  });
  if (!item) return getCart(sessionId);

  await prisma.orderItem.update({ where: { id: item.id }, data: { quantidade } });
  await recalculateTotal(orderId);
  return getCart(sessionId);
}

export async function removeItem(
  sessionId: string,
  itemId: string,
  userId: string | null = null,
): Promise<Cart> {
  const originalItem = await prisma.orderItem.findFirst({
    where: {
      id: itemId,
      order: userId
        ? {
            OR: [
              { sessionId },
              { userId, status: "draft" },
            ],
          }
        : { sessionId },
    },
    select: {
      variantId: true,
      variant: {
        select: {
          product: {
            select: {
              variantes: {
                select: {
                  id: true,
                  label: true,
                  precoDe: true,
                  precoPor: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (userId) {
    await synchronizeAuthenticatedCart(sessionId, userId);
  }
  if (!originalItem) return getCart(sessionId);
  const canonicalVariantId =
    getVolumePricing(
      (originalItem.variant?.product.variantes ?? []).map((variant) => ({
        ...variant,
        precoDe: Number(variant.precoDe),
        precoPor: Number(variant.precoPor),
      })),
    )?.canonicalVariantId ?? originalItem.variantId;

  const orderId = await prepareCartForMutation(sessionId);
  if (!orderId) return emptyCart();

  const item = await prisma.orderItem.findUnique({
    where: {
      orderId_variantId: { orderId, variantId: canonicalVariantId },
    },
  });
  if (!item) return getCart(sessionId);

  await prisma.orderItem.delete({ where: { id: item.id } });
  await recalculateTotal(orderId);
  return getCart(sessionId);
}
