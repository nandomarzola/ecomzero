import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { after } from "next/server";
import { savePurchasedAddressForUser } from "@/lib/services/accountService";
import { recordCouponUsage } from "@/lib/services/couponService";
import { prepareShipmentAfterPayment } from "@/lib/services/shippingFulfillmentService";
import { refundLatePaymentForCanceledOrder } from "@/lib/services/orderCancellationService";
import { createCustomerNotificationFromShipmentEvent } from "@/lib/services/customerNotificationService";
import { sendOrderLifecycleEmail } from "@/lib/services/transactionalEmailService";
import {
  createMercadoPagoPayment,
  createPaymentPreference,
  getMercadoPagoPayment,
  type MercadoPagoPaymentSnapshot,
  type PaymentOrderSnapshot,
} from "@/lib/services/mercadoPagoService";
import {
  paymentOrderIdSchema,
  type BrickPaymentInput,
} from "@/lib/validation/payment";

type OrderPaymentErrorCode =
  | "ORDER_NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_STATUS";

type PaymentReconciliationErrorCode =
  | "INVALID_REFERENCE"
  | "ORDER_NOT_FOUND"
  | "PAYMENT_MISMATCH";

export class OrderPaymentServiceError extends Error {
  constructor(
    message: string,
    public readonly code: OrderPaymentErrorCode,
    public readonly status: 403 | 404 | 409,
  ) {
    super(message);
    this.name = "OrderPaymentServiceError";
  }
}

export class PaymentReconciliationError extends Error {
  constructor(
    message: string,
    public readonly code: PaymentReconciliationErrorCode,
  ) {
    super(message);
    this.name = "PaymentReconciliationError";
  }
}

export type ReconciledPayment = {
  orderId: string;
  orderStatus: "aguardando_pagamento" | "pago" | "cancelado";
  paymentStatus: string;
  changed: boolean;
  payment: MercadoPagoPaymentSnapshot;
};

export type OrderPaymentPageData = {
  orderId: string;
  status: "aguardando_pagamento" | "pago" | "cancelado";
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  customer: {
    name: string;
    email: string;
    document: string;
  };
  items: Array<{
    id: string;
    name: string;
    image: string;
    variant: string;
    quantity: number;
    lineTotal: number;
  }>;
};

export type OrderBrickPaymentResult = {
  orderId: string;
  orderStatus: "aguardando_pagamento" | "pago" | "cancelado";
  payment: null | {
    id: string;
    status: string;
    statusDetail: string | null;
    paymentMethodId: string | null;
    paymentTypeId: string | null;
    qrCode: string | null;
    qrCodeBase64: string | null;
    ticketUrl: string | null;
    expiresAt: Date | null;
    threeDsExternalResourceUrl: string | null;
    threeDsCreq: string | null;
  };
};

const assertOrderAccess = (
  order: { userId: string | null },
  access: { userId: string | null; hasGuestAccess: boolean },
) => {
  const belongsToUser = Boolean(
    access.userId && order.userId === access.userId,
  );
  if (!belongsToUser && !access.hasGuestAccess) {
    throw new OrderPaymentServiceError(
      "Você não tem acesso a este pedido",
      "FORBIDDEN",
      403,
    );
  }
};

const toPaymentResult = (
  orderId: string,
  orderStatus: OrderBrickPaymentResult["orderStatus"],
  payment: Awaited<ReturnType<typeof getMercadoPagoPayment>> | null,
): OrderBrickPaymentResult => ({
  orderId,
  orderStatus,
  payment: payment
    ? {
        id: payment.id,
        status: payment.status,
        statusDetail: payment.statusDetail,
        paymentMethodId: payment.paymentMethodId,
        paymentTypeId: payment.paymentTypeId,
        qrCode: payment.qrCode,
        qrCodeBase64: payment.qrCodeBase64,
        ticketUrl: payment.ticketUrl,
        expiresAt: payment.expiresAt,
        threeDsExternalResourceUrl: payment.threeDsExternalResourceUrl,
        threeDsCreq: payment.threeDsCreq,
      }
    : null,
});

const buildPaymentSnapshot = (order: {
  id: string;
  total: { toNumber(): number };
  descontoCupom: { toNumber(): number };
  nomeCliente: string | null;
  emailCliente: string | null;
  telefoneCliente: string | null;
  cpfCnpj: string | null;
  cepDestino: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  valorFrete: { toNumber(): number };
  items: Array<{
    id: string;
    variantId: string;
    quantidade: number;
    precoUnitario: { toNumber(): number };
    variant: {
      label: string;
      product: { nome: string; imagem: string };
    };
  }>;
}): PaymentOrderSnapshot => {
  const requiredFields = [
    order.nomeCliente,
    order.emailCliente,
    order.telefoneCliente,
    order.cpfCnpj,
    order.cepDestino,
    order.logradouro,
    order.numero,
    order.bairro,
    order.cidade,
    order.uf,
  ];
  if (requiredFields.some((field) => !field) || order.items.length === 0) {
    throw new OrderPaymentServiceError(
      "Pedido incompleto para pagamento",
      "INVALID_STATUS",
      409,
    );
  }

  return {
    id: order.id,
    total: order.total.toNumber(),
    descontoCupom: order.descontoCupom.toNumber(),
    nomeCliente: order.nomeCliente!,
    emailCliente: order.emailCliente!,
    telefoneCliente: order.telefoneCliente!,
    cpfCnpj: order.cpfCnpj!,
    cepDestino: order.cepDestino!,
    logradouro: order.logradouro!,
    numero: order.numero!,
    complemento: order.complemento,
    bairro: order.bairro!,
    cidade: order.cidade!,
    uf: order.uf!,
    valorFrete: order.valorFrete.toNumber(),
    items: order.items.map((item) => ({
      id: item.id,
      variantId: item.variantId,
      productName: item.variant.product.nome,
      productImage: item.variant.product.imagem,
      variantLabel: item.variant.label,
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario.toNumber(),
    })),
  };
};

export async function getOrderPaymentPageData(
  orderId: string,
  access: { userId: string | null; hasGuestAccess: boolean },
): Promise<OrderPaymentPageData> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          variant: { include: { product: true } },
        },
      },
    },
  });

  if (!order) {
    throw new OrderPaymentServiceError(
      "Pedido não encontrado",
      "ORDER_NOT_FOUND",
      404,
    );
  }
  assertOrderAccess(order, access);

  if (order.status === "draft") {
    throw new OrderPaymentServiceError(
      "Este pedido ainda não foi finalizado",
      "INVALID_STATUS",
      409,
    );
  }

  const snapshot = buildPaymentSnapshot(order);

  return {
    orderId: order.id,
    status: order.status,
    subtotal: order.subtotal.toNumber(),
    discount: order.descontoCupom.toNumber(),
    shipping: order.valorFrete.toNumber(),
    total: order.total.toNumber(),
    customer: {
      name: snapshot.nomeCliente,
      email: snapshot.emailCliente,
      document: snapshot.cpfCnpj,
    },
    items: snapshot.items.map((item) => ({
      id: item.id,
      name: item.productName,
      image: item.productImage,
      variant: item.variantLabel,
      quantity: item.quantidade,
      lineTotal: item.precoUnitario * item.quantidade,
    })),
  };
}

export async function getOrderBrickPayment(
  orderId: string,
  access: { userId: string | null; hasGuestAccess: boolean },
): Promise<OrderBrickPaymentResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      status: true,
      mercadoPagoPaymentId: true,
    },
  });

  if (!order) {
    throw new OrderPaymentServiceError(
      "Pedido não encontrado",
      "ORDER_NOT_FOUND",
      404,
    );
  }
  assertOrderAccess(order, access);

  if (order.status === "draft") {
    throw new OrderPaymentServiceError(
      "Este pedido ainda não foi finalizado",
      "INVALID_STATUS",
      409,
    );
  }

  if (!order.mercadoPagoPaymentId) {
    return toPaymentResult(order.id, order.status, null);
  }

  const reconciliation = await reconcileMercadoPagoPayment(
    order.mercadoPagoPaymentId,
  );

  return toPaymentResult(
    order.id,
    reconciliation.orderStatus,
    reconciliation.payment,
  );
}

export async function processOrderBrickPayment(
  orderId: string,
  access: { userId: string | null; hasGuestAccess: boolean },
  input: BrickPaymentInput,
  siteUrl: string,
): Promise<OrderBrickPaymentResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          variant: { include: { product: true } },
        },
      },
    },
  });

  if (!order) {
    throw new OrderPaymentServiceError(
      "Pedido não encontrado",
      "ORDER_NOT_FOUND",
      404,
    );
  }
  assertOrderAccess(order, access);

  if (order.status === "pago") {
    const payment = order.mercadoPagoPaymentId
      ? await getMercadoPagoPayment(order.mercadoPagoPaymentId)
      : null;
    return toPaymentResult(order.id, "pago", payment);
  }

  if (order.status !== "aguardando_pagamento") {
    throw new OrderPaymentServiceError(
      "Este pedido não está disponível para pagamento",
      "INVALID_STATUS",
      409,
    );
  }

  if (order.mercadoPagoPaymentId) {
    const currentPayment = await getMercadoPagoPayment(
      order.mercadoPagoPaymentId,
    );
    const reusableStatuses = new Set([
      "approved",
      "authorized",
      "in_process",
      "pending",
    ]);

    if (reusableStatuses.has(currentPayment.status)) {
      const reconciliation = await reconcilePayment(currentPayment);
      return toPaymentResult(
        order.id,
        reconciliation.orderStatus,
        currentPayment,
      );
    }
  }

  const payment = await createMercadoPagoPayment(
    buildPaymentSnapshot(order),
    input,
    siteUrl,
  );
  const reconciliation = await reconcilePayment(payment);

  return toPaymentResult(order.id, reconciliation.orderStatus, payment);
}

export async function getOrCreateOrderPaymentPreference(
  orderId: string,
  access: { userId: string | null; hasGuestAccess: boolean },
  siteUrl: string,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          variant: { include: { product: true } },
        },
      },
    },
  });

  if (!order) {
    throw new OrderPaymentServiceError(
      "Pedido não encontrado",
      "ORDER_NOT_FOUND",
      404,
    );
  }

  const belongsToUser = Boolean(
    access.userId && order.userId === access.userId,
  );
  if (!belongsToUser && !access.hasGuestAccess) {
    throw new OrderPaymentServiceError(
      "Você não tem acesso a este pedido",
      "FORBIDDEN",
      403,
    );
  }

  if (order.status !== "aguardando_pagamento") {
    throw new OrderPaymentServiceError(
      "Este pedido não está disponível para pagamento",
      "INVALID_STATUS",
      409,
    );
  }

  if (
    order.mercadoPagoPreferenceId &&
    order.mercadoPagoInitPoint &&
    order.mercadoPagoPreferenceExpiresAt &&
    order.mercadoPagoPreferenceExpiresAt.getTime() > Date.now() + 60_000
  ) {
    return {
      preferenceId: order.mercadoPagoPreferenceId,
      initPoint: order.mercadoPagoInitPoint,
      expiresAt: order.mercadoPagoPreferenceExpiresAt,
      reused: true,
    };
  }

  const snapshot = buildPaymentSnapshot(order);
  const preference = await createPaymentPreference(snapshot, siteUrl);
  const updated = await prisma.order.updateMany({
    where: { id: order.id, status: "aguardando_pagamento" },
    data: {
      mercadoPagoPreferenceId: preference.preferenceId,
      mercadoPagoInitPoint: preference.initPoint,
      mercadoPagoPreferenceExpiresAt: preference.expiresAt,
    },
  });

  if (updated.count !== 1) {
    throw new OrderPaymentServiceError(
      "Este pedido não está disponível para pagamento",
      "INVALID_STATUS",
      409,
    );
  }

  return { ...preference, reused: false };
}

async function reconcilePayment(
  payment: MercadoPagoPaymentSnapshot,
): Promise<ReconciledPayment> {
  const parsedOrderId = paymentOrderIdSchema.safeParse(
    payment.externalReference,
  );

  if (!parsedOrderId.success) {
    throw new PaymentReconciliationError(
      "Pagamento sem referência de pedido válida",
      "INVALID_REFERENCE",
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: parsedOrderId.data },
    select: {
      id: true,
      status: true,
      total: true,
      mercadoPagoPaymentId: true,
      couponId: true,
      descontoCupom: true,
      userId: true,
      emailCliente: true,
      cepDestino: true,
      logradouro: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      uf: true,
    },
  });

  if (!order) {
    throw new PaymentReconciliationError(
      "Pedido do pagamento não encontrado",
      "ORDER_NOT_FOUND",
    );
  }

  if (order.status === "draft") {
    throw new PaymentReconciliationError(
      "Pagamento associado a um carrinho não finalizado",
      "PAYMENT_MISMATCH",
    );
  }

  const amountMatches =
    Math.abs(order.total.toNumber() - payment.transactionAmount) <= 0.01;
  const expectedLiveMode = config.mercadoPago.environment === "production";
  if (
    payment.currencyId !== "BRL" ||
    !amountMatches ||
    payment.liveMode !== expectedLiveMode
  ) {
    throw new PaymentReconciliationError(
      "Pagamento não corresponde ao total do pedido",
      "PAYMENT_MISMATCH",
    );
  }

  if (
    order.status === "pago" &&
    order.mercadoPagoPaymentId &&
    order.mercadoPagoPaymentId !== payment.id
  ) {
    throw new PaymentReconciliationError(
      "Pedido já possui outro pagamento confirmado",
      "PAYMENT_MISMATCH",
    );
  }

  if (payment.status !== "approved") {
    if (order.status === "aguardando_pagamento") {
      await prisma.order.updateMany({
        where: { id: order.id, status: "aguardando_pagamento" },
        data: {
          mercadoPagoPaymentId: payment.id,
          mercadoPagoPaymentStatus: payment.status,
        },
      });
    }

    return {
      orderId: order.id,
      orderStatus: order.status,
      paymentStatus: payment.status,
      changed: false,
      payment,
    };
  }

  if (order.status === "cancelado") {
    const changed = await refundLatePaymentForCanceledOrder(order.id, payment);
    return {
      orderId: order.id,
      orderStatus: "cancelado",
      paymentStatus: "refunded",
      changed,
      payment,
    };
  }

  // Transição para "pago" + registro de uso do cupom na MESMA transação, para
  // que a redemption e o incremento de `usos` só aconteçam quando o pedido de
  // fato mudou para pago (idempotente: CouponRedemption.orderId é único, então
  // webhook reentrante não conta duas vezes).
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({
      where: {
        id: order.id,
        status: "aguardando_pagamento",
      },
      data: {
        status: "pago",
        mercadoPagoPaymentId: payment.id,
        mercadoPagoPaymentStatus: payment.status,
        pagoEm: payment.approvedAt ?? new Date(),
      },
    });

    if (result.count === 1 && order.couponId) {
      await recordCouponUsage(tx, {
        couponId: order.couponId,
        orderId: order.id,
        userId: order.userId,
        email: order.emailCliente,
        valorDesconto: Number(order.descontoCupom),
      });
    }

    if (result.count === 1) {
      const shipment = await tx.shipment.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          status: "payment_confirmed",
          labelStatus: "awaiting_shipping_data",
        },
        update: {},
      });
      const event = await tx.shipmentEvent.create({
        data: {
          shipmentId: shipment.id,
          type: "payment_confirmed",
          status: shipment.labelStatus,
          message: "Pagamento confirmado. Preparação logística agendada.",
        },
      });
      await createCustomerNotificationFromShipmentEvent(tx, {
        shipmentId: shipment.id,
        eventType: event.type,
        status: event.status,
        createdAt: event.createdAt,
      });
    }

    return result;
  });

  if (
    updated.count === 1 &&
    order.userId &&
    order.cepDestino &&
    order.logradouro &&
    order.numero &&
    order.bairro &&
    order.cidade &&
    order.uf
  ) {
    await savePurchasedAddressForUser(order.userId, {
      cep: order.cepDestino,
      logradouro: order.logradouro,
      numero: order.numero,
      complemento: order.complemento,
      bairro: order.bairro,
      cidade: order.cidade,
      uf: order.uf,
    }).catch((error: unknown) => {
      console.error("Falha ao salvar endereço usado na compra", {
        orderId: order.id,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    });
  }

  let preparationPending = updated.count === 1;
  if (updated.count === 0) {
    const current = await prisma.order.findUnique({
      where: { id: order.id },
      select: {
        status: true,
        mercadoPagoPaymentId: true,
        shipment: { select: { status: true } },
      },
    });

    if (
      current?.status !== "pago" ||
      current.mercadoPagoPaymentId !== payment.id
    ) {
      throw new PaymentReconciliationError(
        "O pedido mudou durante a confirmação do pagamento",
        "PAYMENT_MISMATCH",
      );
    }
    preparationPending = current.shipment?.status === "payment_confirmed";
  }

  after(async () => {
    await sendOrderLifecycleEmail(order.id, "payment_confirmed");
  });

  if (preparationPending) {
    after(async () => {
      await prepareShipmentAfterPayment(order.id).catch(() => {
        console.error("Falha ao preparar expedição após pagamento", {
          orderId: order.id,
        });
      });
    });
  }

  return {
    orderId: order.id,
    orderStatus: "pago",
    paymentStatus: payment.status,
    changed: updated.count === 1,
    payment,
  };
}

export async function reconcileMercadoPagoPayment(
  paymentId: string,
): Promise<ReconciledPayment> {
  return reconcilePayment(await getMercadoPagoPayment(paymentId));
}

export async function getOrderPaymentStatus(
  orderId: string,
  access: { userId: string | null; hasGuestAccess: boolean },
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      status: true,
      mercadoPagoPaymentStatus: true,
      pagoEm: true,
    },
  });

  if (!order) {
    throw new OrderPaymentServiceError(
      "Pedido não encontrado",
      "ORDER_NOT_FOUND",
      404,
    );
  }

  const belongsToUser = Boolean(
    access.userId && order.userId === access.userId,
  );
  if (!belongsToUser && !access.hasGuestAccess) {
    throw new OrderPaymentServiceError(
      "Você não tem acesso a este pedido",
      "FORBIDDEN",
      403,
    );
  }

  return {
    orderId: order.id,
    status: order.status,
    paymentStatus: order.mercadoPagoPaymentStatus,
    pagoEm: order.pagoEm,
  };
}
