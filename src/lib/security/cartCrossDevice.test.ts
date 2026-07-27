import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/test";
process.env.AUTH_SECRET ??= "cross-device-cart-test-secret-with-32-characters";

type AsyncMethod = (...args: unknown[]) => Promise<unknown>;
type MutableModel = Record<string, AsyncMethod>;

test("sincronização de carrinho entre dispositivos", async (suite) => {
  const { Prisma } = await import("@/generated/prisma/client");
  const { prisma } = await import("@/lib/db");
  const cartService = await import("@/lib/services/cartService");

  async function withHarness(
    currentStatus: "draft" | "aguardando_pagamento",
    run: (state: {
      orders: Array<Record<string, unknown>>;
      accountQueries: number;
    }) => Promise<void>,
  ) {
    const product: Record<string, unknown> = {
      id: "product-1",
      categoryId: "category-1",
      nome: "Produto",
      slug: "produto",
      imagem: "/produto.jpg",
      ativo: true,
      variantes: [],
    };
    const variants = [
      {
        id: "blue",
        productId: "product-1",
        product,
        label: "Azul",
        skuInterno: "BLUE",
        precoDe: new Prisma.Decimal(120),
        precoPor: new Prisma.Decimal(100),
      },
      {
        id: "red",
        productId: "product-1",
        product,
        label: "Vermelho",
        skuInterno: "RED",
        precoDe: new Prisma.Decimal(100),
        precoPor: new Prisma.Decimal(90),
      },
    ];
    product.variantes = variants;

    const createItem = (
      id: string,
      orderId: string,
      variantId: string,
      quantidade: number,
    ) => ({
      id,
      orderId,
      variantId,
      variant: variants.find((variant) => variant.id === variantId),
      quantidade,
      precoUnitario: new Prisma.Decimal(
        variantId === "blue" ? 100 : 90,
      ),
    });
    const deviceOrder: Record<string, unknown> = {
      id: "device-order",
      sessionId: "mobile-session",
      status: currentStatus,
      userId: null,
      couponId: null,
      coupon: null,
      subtotal: new Prisma.Decimal(200),
      descontoCupom: new Prisma.Decimal(0),
      total: new Prisma.Decimal(200),
      createdAt: new Date("2026-07-26T10:00:00.000Z"),
      items: [createItem("device-blue", "device-order", "blue", 2)],
    };
    const accountOrder: Record<string, unknown> = {
      id: "account-order",
      sessionId: "desktop-session",
      status: "draft",
      userId: "user-1",
      couponId: null,
      coupon: null,
      subtotal: new Prisma.Decimal(390),
      descontoCupom: new Prisma.Decimal(0),
      total: new Prisma.Decimal(390),
      createdAt: new Date("2026-07-26T09:00:00.000Z"),
      items: [
        createItem("account-blue", "account-order", "blue", 3),
        createItem("account-red", "account-order", "red", 1),
      ],
    };
    const state = {
      orders: [deviceOrder, accountOrder],
      accountQueries: 0,
    };

    const orderModel = prisma.order as unknown as MutableModel;
    const itemModel = prisma.orderItem as unknown as MutableModel;
    const quoteModel = prisma.checkoutShippingQuote as unknown as MutableModel;
    const prismaRoot = prisma as unknown as MutableModel;
    const originals = {
      orderFindUnique: orderModel.findUnique,
      orderFindMany: orderModel.findMany,
      orderUpdate: orderModel.update,
      orderDeleteMany: orderModel.deleteMany,
      itemFindMany: itemModel.findMany,
      itemUpdate: itemModel.update,
      itemDeleteMany: itemModel.deleteMany,
      itemCreateMany: itemModel.createMany,
      quoteDeleteMany: quoteModel.deleteMany,
      transaction: prismaRoot.$transaction,
    };

    const findOrder = (where: Record<string, unknown>) =>
      state.orders.find((order) => {
        if (typeof where.id === "string" && order.id !== where.id) return false;
        if (
          typeof where.sessionId === "string" &&
          order.sessionId !== where.sessionId
        ) {
          return false;
        }
        return true;
      }) ?? null;

    orderModel.findUnique = async (input) =>
      findOrder((input as { where: Record<string, unknown> }).where);
    orderModel.findMany = async (input) => {
      state.accountQueries += 1;
      const where = (input as { where: Record<string, unknown> }).where;
      return state.orders.filter(
        (order) =>
          order.userId === where.userId &&
          order.status === where.status &&
          order.id !==
            (where.id as { not?: string } | undefined)?.not,
      );
    };
    orderModel.update = async (input) => {
      const parsed = input as {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      };
      const order = findOrder(parsed.where);
      if (!order) throw new Error("Pedido não encontrado");
      Object.assign(order, parsed.data);
      return order;
    };
    orderModel.deleteMany = async (input) => {
      const ids =
        ((input as { where: { id: { in: string[] } } }).where.id.in);
      state.orders = state.orders.filter(
        (order) => !ids.includes(String(order.id)),
      );
      return { count: ids.length };
    };
    itemModel.deleteMany = async (input) => {
      const ids =
        ((input as { where: { orderId: { in: string[] } } }).where.orderId.in);
      for (const order of state.orders) {
        if (ids.includes(String(order.id))) order.items = [];
      }
      return { count: 3 };
    };
    itemModel.createMany = async (input) => {
      const data = (input as {
        data: Array<{
          orderId: string;
          variantId: string;
          quantidade: number;
          precoUnitario: InstanceType<typeof Prisma.Decimal>;
        }>;
      }).data;
      for (const [index, item] of data.entries()) {
        const order = state.orders.find(
          (candidate) => candidate.id === item.orderId,
        );
        if (!order) continue;
        (order.items as unknown[]).push({
          id: `merged-${index}`,
          ...item,
          variant: variants.find(
            (variant) => variant.id === item.variantId,
          ),
        });
      }
      return { count: data.length };
    };
    itemModel.findMany = async (input) => {
      const orderId = (input as { where: { orderId: string } }).where.orderId;
      return state.orders.find((order) => order.id === orderId)?.items ?? [];
    };
    itemModel.update = async (input) => {
      const parsed = input as {
        where: { id: string };
        data: Record<string, unknown>;
      };
      const item = state.orders
        .flatMap((order) => order.items as Array<Record<string, unknown>>)
        .find((candidate) => candidate.id === parsed.where.id);
      if (item) Object.assign(item, parsed.data);
      return item ?? null;
    };
    quoteModel.deleteMany = async () => ({ count: 0 });
    prismaRoot.$transaction = async (input) =>
      typeof input === "function"
        ? input(prisma)
        : Promise.all(input as Array<Promise<unknown>>);

    try {
      await run(state);
    } finally {
      orderModel.findUnique = originals.orderFindUnique;
      orderModel.findMany = originals.orderFindMany;
      orderModel.update = originals.orderUpdate;
      orderModel.deleteMany = originals.orderDeleteMany;
      itemModel.findMany = originals.itemFindMany;
      itemModel.update = originals.itemUpdate;
      itemModel.deleteMany = originals.itemDeleteMany;
      itemModel.createMany = originals.itemCreateMany;
      quoteModel.deleteMany = originals.quoteDeleteMany;
      prismaRoot.$transaction = originals.transaction;
    }
  }

  await suite.test("mescla o draft da conta no dispositivo autenticado", async () => {
    await withHarness("draft", async (state) => {
      await cartService.synchronizeAuthenticatedCart(
        "mobile-session",
        "user-1",
      );

      assert.equal(state.orders.length, 1);
      const [order] = state.orders;
      assert.equal(order.id, "account-order");
      assert.equal(order.sessionId, "mobile-session");
      assert.equal(order.userId, "user-1");
      const items = order.items as Array<Record<string, unknown>>;
      assert.deepEqual(
        items.map((item) => item.id),
        ["account-blue", "account-red"],
      );
      assert.deepEqual(
        items.map((item) => [item.variantId, item.quantidade]),
        [
          ["blue", 5],
          ["red", 1],
        ],
      );
    });
  });

  await suite.test("não mistura pedido com pagamento iniciado", async () => {
    await withHarness("aguardando_pagamento", async (state) => {
      await cartService.synchronizeAuthenticatedCart(
        "mobile-session",
        "user-1",
      );

      assert.equal(state.orders.length, 2);
      assert.equal(state.accountQueries, 0);
      assert.equal(state.orders[0].status, "aguardando_pagamento");
      assert.equal(state.orders[1].id, "account-order");
    });
  });
});
