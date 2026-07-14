import { prisma } from "@/lib/db";
import type { OrderGetPayload } from "@/generated/prisma/models";
import type { Cart, CartItem } from "@/types/cart";

// Única camada que toca o Prisma para o carrinho. O carrinho é um Order com
// status "draft" vinculado a uma sessão anônima (sessionId, cookie) — ainda
// sem login/checkout nesta fase.

const cartInclude = {
  items: {
    include: { variant: { include: { product: true } } },
    orderBy: { id: "asc" as const },
  },
} as const;

type OrderWithItems = OrderGetPayload<{ include: typeof cartInclude }>;

export const MAX_CART_ITEM_QUANTITY = 20;

export class CartQuantityLimitError extends Error {
  constructor() {
    super(
      `Quantidade máxima de ${MAX_CART_ITEM_QUANTITY} unidades por item atingida`,
    );
    this.name = "CartQuantityLimitError";
  }
}

function assertQuantityWithinLimit(quantidade: number): void {
  if (quantidade > MAX_CART_ITEM_QUANTITY) {
    throw new CartQuantityLimitError();
  }
}

function emptyCart(): Cart {
  return { id: null, items: [], total: 0, itemCount: 0 };
}

function toCart(order: OrderWithItems): Cart {
  const items: CartItem[] = order.items.map((item) => ({
    id: item.id,
    variantId: item.variantId,
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

  return {
    id: order.id,
    items,
    total: Number(order.total),
    itemCount: items.reduce((sum, item) => sum + item.quantidade, 0),
  };
}

async function recalculateTotal(orderId: string): Promise<void> {
  const items = await prisma.orderItem.findMany({ where: { orderId } });
  const total = items.reduce(
    (sum, item) => sum + Number(item.precoUnitario) * item.quantidade,
    0,
  );
  await prisma.order.update({ where: { id: orderId }, data: { total } });
}

export async function getCart(sessionId: string | null): Promise<Cart> {
  if (!sessionId) return emptyCart();

  const order = await prisma.order.findUnique({
    where: { sessionId },
    include: cartInclude,
  });

  return order ? toCart(order) : emptyCart();
}

export async function addItem(
  sessionId: string,
  variantId: string,
  quantidade: number,
): Promise<Cart> {
  assertQuantityWithinLimit(quantidade);

  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) throw new Error("Variante não encontrada");

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

  const order = await prisma.order.findUnique({ where: { sessionId } });
  if (!order) return emptyCart();

  const item = await prisma.orderItem.findFirst({
    where: { id: itemId, orderId: order.id },
  });
  if (!item) return getCart(sessionId);

  await prisma.orderItem.update({ where: { id: itemId }, data: { quantidade } });
  await recalculateTotal(order.id);
  return getCart(sessionId);
}

export async function removeItem(sessionId: string, itemId: string): Promise<Cart> {
  const order = await prisma.order.findUnique({ where: { sessionId } });
  if (!order) return emptyCart();

  const item = await prisma.orderItem.findFirst({
    where: { id: itemId, orderId: order.id },
  });
  if (!item) return getCart(sessionId);

  await prisma.orderItem.delete({ where: { id: itemId } });
  await recalculateTotal(order.id);
  return getCart(sessionId);
}
