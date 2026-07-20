import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/test";
process.env.AUTH_SECRET ??= "coupon-flow-test-secret-with-at-least-32-chars";

type AsyncMethod = (...args: unknown[]) => Promise<unknown>;
type MutableModel = Record<string, AsyncMethod>;

const customer = {
  userId: "user-1",
  email: "cliente@example.com",
};

const checkoutInput = {
  nome: "Cliente Teste",
  email: customer.email,
  telefone: "14999999999",
  cpfCnpj: "52998224725",
  cep: "17500000",
  logradouro: "Rua Teste",
  numero: "10",
  complemento: "",
  bairro: "Centro",
  cidade: "Marília",
  uf: "SP",
  shippingQuoteId: "",
  shippingOptionId: "",
};

test("regressões do cupom de primeira compra", async (suite) => {
  const { Prisma } = await import("@/generated/prisma/client");
  const { prisma } = await import("@/lib/db");
  const cartService = await import("@/lib/services/cartService");
  const couponService = await import("@/lib/services/couponService");
  const checkoutService = await import("@/lib/services/checkoutService");

  async function withHarness(
    options: {
      couponApplied?: boolean;
      couponUses?: number;
      priorPaidOrders?: number;
    },
    run: (state: {
      order: Record<string, unknown>;
      promoted: boolean;
    }) => Promise<void>,
  ) {
    const coupon = {
      id: "coupon-1",
      codigo: "ECOMPRIMEIRACOMPRA",
      descricao: null,
      tipo: "percentual",
      valor: new Prisma.Decimal(20),
      valorMinimoPedido: new Prisma.Decimal(1),
      descontoMaximo: null,
      limiteUsoTotal: 50,
      limiteUsoPorCliente: 1,
      usos: 2,
      aplicaEm: "toda_loja",
      categoriaId: null,
      produtoId: null,
      combinavel: false,
      exibirNoSite: false,
      primeiraCompra: true,
      inicioEm: new Date("2026-07-01T00:00:00.000Z"),
      expiraEm: new Date("2026-10-30T00:00:00.000Z"),
      ativo: true,
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-20T00:00:00.000Z"),
    };
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
      id: "cart-1",
      sessionId: "session-1",
      status: "draft",
      userId: null,
      emailCliente: null,
      subtotal: new Prisma.Decimal(100),
      descontoCupom: new Prisma.Decimal(options.couponApplied ? 20 : 0),
      total: new Prisma.Decimal(options.couponApplied ? 80 : 100),
      couponId: options.couponApplied ? coupon.id : null,
      coupon: options.couponApplied ? coupon : null,
      items: [
        {
          id: "item-1",
          orderId: "cart-1",
          variantId: variant.id,
          variant,
          quantidade: 1,
          precoUnitario: new Prisma.Decimal(100),
        },
      ],
    };
    const state = { order, promoted: false };
    const orderModel = prisma.order as unknown as MutableModel;
    const couponModel = prisma.coupon as unknown as MutableModel;
    const settingsModel = prisma.storeSettings as unknown as MutableModel;
    const orderItemModel = prisma.orderItem as unknown as MutableModel;
    const prismaRoot = prisma as unknown as MutableModel;
    const originals = {
      findUnique: orderModel.findUnique,
      findFirst: orderModel.findFirst,
      count: orderModel.count,
      update: orderModel.update,
      updateMany: orderModel.updateMany,
      couponFindUnique: couponModel.findUnique,
      settingsFindUnique: settingsModel.findUnique,
      orderItemUpdate: orderItemModel.update,
      transaction: prismaRoot.$transaction,
    };

    const applyData = (data: Record<string, unknown>) => {
      Object.assign(order, data);
      if (Object.hasOwn(data, "couponId")) {
        order.coupon = data.couponId === coupon.id ? coupon : null;
      }
    };

    orderModel.findUnique = async () => order;
    orderModel.findFirst = async () => order;
    orderModel.count = async (input) => {
      const where = (input as { where?: Record<string, unknown> }).where ?? {};
      return Object.hasOwn(where, "couponId")
        ? options.couponUses ?? 0
        : options.priorPaidOrders ?? 0;
    };
    orderModel.update = async (input) => {
      const data = (input as { data: Record<string, unknown> }).data;
      applyData(data);
      return order;
    };
    orderModel.updateMany = async (input) => {
      const parsed = input as {
        where?: Record<string, unknown>;
        data: Record<string, unknown>;
      };
      if (
        parsed.where?.couponId &&
        parsed.where.couponId !== order.couponId
      ) {
        return { count: 0 };
      }
      if (parsed.data.status === "aguardando_pagamento") {
        state.promoted = true;
      }
      applyData(parsed.data);
      return { count: 1 };
    };
    couponModel.findUnique = async () => coupon;
    settingsModel.findUnique = async () => ({
      valorMinimoPedido: new Prisma.Decimal(0),
    });
    orderItemModel.update = async (input) => {
      const parsed = input as {
        where: { id: string };
        data: { precoUnitario?: unknown };
      };
      const item = (order.items as Array<Record<string, unknown>>).find(
        (candidate) => candidate.id === parsed.where.id,
      );
      if (item && parsed.data.precoUnitario) {
        item.precoUnitario = parsed.data.precoUnitario;
      }
      return item ?? null;
    };
    prismaRoot.$transaction = async (input) => {
      if (typeof input !== "function") {
        throw new Error("Apenas transações interativas são esperadas no teste");
      }
      return input(prisma);
    };

    try {
      await run(state);
    } finally {
      orderModel.findUnique = originals.findUnique;
      orderModel.findFirst = originals.findFirst;
      orderModel.count = originals.count;
      orderModel.update = originals.update;
      orderModel.updateMany = originals.updateMany;
      couponModel.findUnique = originals.couponFindUnique;
      settingsModel.findUnique = originals.settingsFindUnique;
      orderItemModel.update = originals.orderItemUpdate;
      prismaRoot.$transaction = originals.transaction;
    }
  }

  await suite.test("cliente novo elegível mantém o benefício", async () => {
    await withHarness({ couponApplied: true }, async (state) => {
      const result = await cartService.reconcileCartCoupon("session-1", customer);
      assert.equal(result.removed, false);
      assert.equal(result.cart.coupon?.code, "ECOMPRIMEIRACOMPRA");
      assert.equal(result.cart.discount, 20);
      assert.equal(state.order.couponId, "coupon-1");
    });
  });

  await suite.test("cliente antigo com compra paga é inelegível", async () => {
    await withHarness(
      { couponApplied: true, priorPaidOrders: 1 },
      async (state) => {
        const result = await cartService.reconcileCartCoupon("session-1", customer);
        assert.equal(result.removed, true);
        assert.equal(result.errorCode, "FIRST_PURCHASE_ONLY");
        assert.equal(result.cart.coupon, null);
        assert.equal(state.order.couponId, null);
      },
    );
  });

  await suite.test("cliente que já usou o cupom é bloqueado", async () => {
    await withHarness({ couponUses: 1 }, async () => {
      await assert.rejects(
        cartService.applyCoupon(
          "session-1",
          "ECOMPRIMEIRACOMPRA",
          customer,
        ),
        (error: unknown) =>
          error instanceof couponService.CouponError &&
          error.code === "CUSTOMER_LIMIT",
      );
    });
  });

  await suite.test("carrinho anônimo espera login e valida depois", async () => {
    await withHarness({}, async (state) => {
      await assert.rejects(
        cartService.autoApplyCampaignCoupon(
          "session-1",
          "ECOMPRIMEIRACOMPRA",
          { userId: null, email: null },
        ),
        (error: unknown) =>
          error instanceof couponService.CouponError &&
          error.code === "IDENTITY_REQUIRED",
      );
      assert.equal(state.order.couponId, null);
      const cart = await cartService.autoApplyCampaignCoupon(
        "session-1",
        "ECOMPRIMEIRACOMPRA",
        customer,
      );
      assert.equal(cart.coupon?.code, "ECOMPRIMEIRACOMPRA");
    });
  });

  await suite.test("aplicação manual usa identidade e concede 20%", async () => {
    await withHarness({}, async () => {
      const cart = await cartService.applyCoupon(
        "session-1",
        "ECOMPRIMEIRACOMPRA",
        customer,
      );
      assert.equal(cart.discount, 20);
      assert.equal(cart.total, 80);
    });
  });

  await suite.test("autoaplicação autenticada usa a mesma validação", async () => {
    await withHarness({}, async () => {
      const cart = await cartService.autoApplyCampaignCoupon(
        "session-1",
        "ECOMPRIMEIRACOMPRA",
        customer,
      );
      assert.equal(cart.coupon?.code, "ECOMPRIMEIRACOMPRA");
      assert.equal(cart.discount, 20);
    });
  });

  await suite.test("corrida no checkout ainda é detectada", async () => {
    await withHarness(
      { couponApplied: true, couponUses: 1 },
      async (state) => {
        await assert.rejects(
          checkoutService.createOrderFromCart(
            "session-1",
            checkoutInput,
            customer.userId,
          ),
          (error: unknown) =>
            error instanceof checkoutService.CheckoutCouponRemovedError &&
            error.code === "COUPON_REMOVED",
        );
        assert.equal(state.promoted, false);
        assert.equal(state.order.status, "draft");
      },
    );
  });

  await suite.test("rejeição remove o cupom sem concluir pelo valor errado", async () => {
    await withHarness(
      { couponApplied: true, priorPaidOrders: 1 },
      async (state) => {
        let caught: unknown;
        try {
          await checkoutService.createOrderFromCart(
            "session-1",
            checkoutInput,
            customer.userId,
          );
        } catch (error) {
          caught = error;
        }
        assert.ok(caught instanceof checkoutService.CheckoutCouponRemovedError);
        assert.deepEqual(caught.cart, {
          subtotal: 100,
          discount: 0,
          total: 100,
        });
        assert.equal(state.order.couponId, null);
        assert.equal(state.order.descontoCupom, 0);
        assert.equal(state.order.total, 100);
        assert.equal(state.order.status, "draft");
        assert.equal(state.promoted, false);
      },
    );
  });

  await suite.test("checkout preserva a sessão e o carrinho ao desistir antes do pagamento", async () => {
    await withHarness({}, async (state) => {
      const created = await checkoutService.createOrderFromCart(
        "session-1",
        checkoutInput,
        customer.userId,
      );
      assert.equal(created.orderId, "cart-1");
      assert.equal(state.order.status, "aguardando_pagamento");
      assert.equal(state.order.sessionId, "session-1");

      const visibleCart = await cartService.getCart("session-1");
      assert.equal(visibleCart.id, "cart-1");
      assert.equal(visibleCart.status, "aguardando_pagamento");
      assert.equal(visibleCart.items.length, 1);

      state.promoted = false;
      const reused = await checkoutService.createOrderFromCart(
        "session-1",
        checkoutInput,
        customer.userId,
      );
      assert.equal(reused.orderId, "cart-1");
      assert.equal(state.promoted, false);
    });
  });
});
