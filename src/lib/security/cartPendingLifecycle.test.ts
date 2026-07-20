import assert from "node:assert/strict";
import test from "node:test";
import type { CartMutationDependencies } from "@/lib/services/cartService";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/test";
process.env.AUTH_SECRET ??= "cart-lifecycle-test-secret-with-at-least-32-chars";

type AsyncMethod = (...args: unknown[]) => Promise<unknown>;
type MutableModel = Record<string, AsyncMethod>;
type OrderStatus = "draft" | "aguardando_pagamento" | "pago" | "cancelado";

test("ciclo seguro do carrinho aguardando pagamento", async (suite) => {
  const { Prisma } = await import("@/generated/prisma/client");
  const { prisma } = await import("@/lib/db");
  const cartService = await import("@/lib/services/cartService");
  const { buildPaidOrderTransition } = await import("@/lib/cartLifecycleDomain");
  const { rotatePaidCartSession } = await import("@/lib/services/cartSessionService");

  async function withHarness(
    options: {
      sessionId?: string | null;
      status?: OrderStatus;
      paymentId?: string | null;
      preferenceId?: string | null;
      paymentStatus?: string | null;
    },
    run: (state: {
      orders: Array<Record<string, unknown>>;
      quoteDeletes: number;
    }) => Promise<void>,
  ) {
    const product = {
      id: "product-1",
      categoryId: "category-1",
      nome: "Produto Teste",
      slug: "produto-teste",
      imagem: "/produto.jpg",
      ativo: true,
    };
    const variant = {
      id: "variant-1",
      productId: product.id,
      product,
      label: "Padrão",
      skuInterno: "SKU-1",
      precoDe: new Prisma.Decimal(120),
      precoPor: new Prisma.Decimal(100),
    };
    const order: Record<string, unknown> = {
      id: "order-1",
      sessionId: options.sessionId === undefined ? "session-1" : options.sessionId,
      status: options.status ?? "aguardando_pagamento",
      userId: "user-1",
      nomeCliente: "Cliente Teste",
      emailCliente: "cliente@example.com",
      telefoneCliente: "14999999999",
      cpfCnpj: "52998224725",
      cepDestino: "17500000",
      logradouro: "Rua Teste",
      numero: "10",
      complemento: null,
      bairro: "Centro",
      cidade: "Marília",
      uf: "SP",
      subtotal: new Prisma.Decimal(100),
      valorFrete: new Prisma.Decimal(12),
      descontoCupom: new Prisma.Decimal(0),
      total: new Prisma.Decimal(112),
      couponId: null,
      coupon: null,
      shippingQuoteId: "quote-1",
      shippingOptionId: "option-1",
      shippingMode: "melhor_envio",
      shippingProvider: "melhor_envio",
      shippingService: "PAC",
      shippingAmountCharged: new Prisma.Decimal(12),
      shippingPayer: "customer",
      shippingEstimatedDays: 5,
      mercadoPagoPreferenceId: options.preferenceId ?? null,
      mercadoPagoInitPoint: options.preferenceId ? "https://mp.test" : null,
      mercadoPagoPreferenceExpiresAt: options.preferenceId
        ? new Date("2026-07-21T00:00:00.000Z")
        : null,
      mercadoPagoPaymentId: options.paymentId ?? null,
      mercadoPagoPaymentStatus:
        options.paymentStatus ?? (options.paymentId ? "pending" : null),
      pagoEm: null,
      createdAt: new Date("2026-07-20T12:00:00.000Z"),
      items: [
        {
          id: "item-1",
          orderId: "order-1",
          variantId: variant.id,
          variant,
          quantidade: 1,
          precoUnitario: new Prisma.Decimal(100),
        },
      ],
    };
    const state = {
      orders: [order],
      quoteDeletes: 0,
    };

    const orderModel = prisma.order as unknown as MutableModel;
    const orderItemModel = prisma.orderItem as unknown as MutableModel;
    const quoteModel = prisma.checkoutShippingQuote as unknown as MutableModel;
    const prismaRoot = prisma as unknown as MutableModel;
    const originals = {
      orderFindUnique: orderModel.findUnique,
      orderFindFirst: orderModel.findFirst,
      orderUpdate: orderModel.update,
      orderUpdateMany: orderModel.updateMany,
      orderCreate: orderModel.create,
      itemFindMany: orderItemModel.findMany,
      quoteDeleteMany: quoteModel.deleteMany,
      transaction: prismaRoot.$transaction,
    };

    const findOrder = (where: Record<string, unknown>) =>
      state.orders.find((candidate) => {
        if (typeof where.id === "string" && candidate.id !== where.id) return false;
        if (typeof where.sessionId === "string" && candidate.sessionId !== where.sessionId) return false;
        if (where.sessionId === null && candidate.sessionId !== null) return false;
        if (typeof where.userId === "string" && candidate.userId !== where.userId) return false;
        if (typeof where.status === "string" && candidate.status !== where.status) return false;
        if (where.mercadoPagoPaymentId === null && candidate.mercadoPagoPaymentId !== null) return false;
        if (where.mercadoPagoPreferenceId === null && candidate.mercadoPagoPreferenceId !== null) return false;
        return true;
      }) ?? null;

    orderModel.findUnique = async (input) => {
      const where = (input as { where: Record<string, unknown> }).where;
      return findOrder(where);
    };
    orderModel.findFirst = async (input) => {
      const where = (input as { where: Record<string, unknown> }).where;
      return findOrder(where);
    };
    orderModel.updateMany = async (input) => {
      const parsed = input as {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      };
      const target = findOrder(parsed.where);
      if (!target) return { count: 0 };
      Object.assign(target, parsed.data);
      return { count: 1 };
    };
    orderModel.update = async (input) => {
      const parsed = input as {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      };
      const target = findOrder(parsed.where);
      if (!target) throw new Error("Pedido não encontrado no harness");
      Object.assign(target, parsed.data);
      return target;
    };
    orderModel.create = async (input) => {
      const data = (input as { data: Record<string, unknown> }).data;
      const nestedItems = (data.items as {
        create: Array<Record<string, unknown>>;
      }).create;
      const created: Record<string, unknown> = {
        id: "order-2",
        ...data,
        coupon: null,
        createdAt: new Date("2026-07-20T12:05:00.000Z"),
        items: nestedItems.map((item, index) => ({
          id: `cloned-item-${index + 1}`,
          orderId: "order-2",
          ...item,
          variant,
        })),
      };
      delete created.items;
      created.items = nestedItems.map((item, index) => ({
        id: `cloned-item-${index + 1}`,
        orderId: "order-2",
        ...item,
        variant,
      }));
      state.orders.push(created);
      return { id: created.id };
    };
    orderItemModel.findMany = async (input) => {
      const orderId = (input as { where: { orderId: string } }).where.orderId;
      const target = state.orders.find((candidate) => candidate.id === orderId);
      return target?.items ?? [];
    };
    quoteModel.deleteMany = async () => {
      state.quoteDeletes += 1;
      return { count: 1 };
    };
    prismaRoot.$transaction = async (input) => {
      if (typeof input === "function") return input(prisma);
      return Promise.all(input as Array<Promise<unknown>>);
    };

    try {
      await run(state);
    } finally {
      orderModel.findUnique = originals.orderFindUnique;
      orderModel.findFirst = originals.orderFindFirst;
      orderModel.update = originals.orderUpdate;
      orderModel.updateMany = originals.orderUpdateMany;
      orderModel.create = originals.orderCreate;
      orderItemModel.findMany = originals.itemFindMany;
      quoteModel.deleteMany = originals.quoteDeleteMany;
      prismaRoot.$transaction = originals.transaction;
    }
  }

  await suite.test("edição sem cobrança ativa reabre o mesmo pedido como draft", async () => {
    await withHarness({}, async (state) => {
      const orderId = await cartService.prepareCartForMutation("session-1");
      assert.equal(orderId, "order-1");
      assert.equal(state.orders[0].status, "draft");
      assert.equal(state.orders[0].sessionId, "session-1");
      assert.equal(state.orders[0].shippingQuoteId, null);
      assert.equal(state.orders[0].emailCliente, null);
      assert.equal(state.orders[0].valorFrete, 0);
      assert.ok(state.quoteDeletes > 0);
    });
  });

  await suite.test("edição com cobrança ativa cancela e preserva itens em novo draft", async () => {
    await withHarness({ paymentId: "payment-1" }, async (state) => {
      let cancellationCalls = 0;
      const cancelPendingOrder: CartMutationDependencies["cancelPendingOrder"] = async () => {
        cancellationCalls += 1;
        state.orders[0].status = "cancelado";
        return {
          orderId: "order-1",
          status: "cancelado",
          alreadyCanceled: false,
          shipmentCanceled: false,
          refund: null,
          completedAt: new Date().toISOString(),
        };
      };

      const orderId = await cartService.prepareCartForMutation("session-1", {
        cancelPendingOrder,
      });
      assert.equal(cancellationCalls, 1);
      assert.equal(orderId, "order-2");
      assert.equal(state.orders[0].status, "cancelado");
      assert.equal(state.orders[0].sessionId, null);
      assert.equal(state.orders[1].status, "draft");
      assert.equal(state.orders[1].sessionId, "session-1");
      assert.equal((state.orders[1].items as unknown[]).length, 1);
    });
  });

  await suite.test("cancelamento recusado bloqueia edição e mantém continuar pagamento", async () => {
    await withHarness({ paymentId: "payment-1" }, async (state) => {
      const cancelPendingOrder: CartMutationDependencies["cancelPendingOrder"] = async () => {
        throw new Error("Mercado Pago recusou o cancelamento");
      };
      await assert.rejects(
        cartService.prepareCartForMutation("session-1", {
          cancelPendingOrder,
        }),
        cartService.PendingCartMutationBlockedError,
      );
      assert.equal(state.orders.length, 1);
      assert.equal(state.orders[0].status, "aguardando_pagamento");
      assert.equal(state.orders[0].sessionId, "session-1");
    });
  });

  await suite.test("criação de cobrança em andamento bloqueia corrida com edição", async () => {
    await withHarness(
      { paymentStatus: "creating:attempt-1" },
      async (state) => {
        await assert.rejects(
          cartService.prepareCartForMutation("session-1"),
          cartService.PendingCartMutationBlockedError,
        );
        assert.equal(state.orders[0].status, "aguardando_pagamento");
        assert.equal(state.orders[0].sessionId, "session-1");
      },
    );
  });

  await suite.test("pedido pendente continua visível ao voltar para o carrinho", async () => {
    await withHarness({}, async () => {
      const cart = await cartService.getCart("session-1");
      assert.equal(cart.id, "order-1");
      assert.equal(cart.status, "aguardando_pagamento");
      assert.equal(cart.items.length, 1);
      assert.equal(cart.pendingPaymentTotal, 112);
    });
  });

  await suite.test("confirmação paga desvincula sessão e autoriza rotação segura", async () => {
    const approvedAt = new Date("2026-07-20T14:00:00.000Z");
    const transition = buildPaidOrderTransition({
      id: "payment-1",
      status: "approved",
      approvedAt,
    });
    assert.equal(transition.status, "pago");
    assert.equal(transition.sessionId, null);
    assert.equal(transition.pagoEm, approvedAt);

    let rotations = 0;
    const rotated = await rotatePaidCartSession(
      "order-1",
      { userId: "user-1", hasGuestAccess: false },
      {
        findOrder: async () => ({ status: "pago", userId: "user-1" }),
        rotateSession: async () => {
          rotations += 1;
          return "new-session";
        },
      },
    );
    assert.equal(rotated, true);
    assert.equal(rotations, 1);
  });

  await suite.test("e-mail não autenticado não reanexa pedido antigo", async () => {
    await withHarness({ sessionId: null }, async (state) => {
      const cart = await cartService.getCart("new-session", {
        signedOrderId: null,
        userId: null,
      });
      assert.equal(cart.id, null);
      assert.equal(state.orders[0].sessionId, null);
    });
  });

  await suite.test("cookie assinado reanexa somente o pedido pendente indicado", async () => {
    await withHarness({ sessionId: null }, async (state) => {
      const cart = await cartService.getCart("new-session", {
        signedOrderId: "order-1",
        userId: null,
      });
      assert.equal(cart.id, "order-1");
      assert.equal(cart.status, "aguardando_pagamento");
      assert.equal(state.orders[0].sessionId, "new-session");
    });
  });
});
