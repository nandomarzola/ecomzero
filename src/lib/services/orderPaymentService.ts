import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import {
  createPaymentPreference,
  getMercadoPagoPayment,
  type PaymentOrderSnapshot,
} from "@/lib/services/mercadoPagoService";
import { paymentOrderIdSchema } from "@/lib/validation/payment";

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
};

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

  const requiredFields = [
    order.nomeCliente,
    order.emailCliente,
    order.telefoneCliente,
    order.cpfCnpj,
    order.cepDestino,
    order.logradouro,
    order.numero,
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

  const snapshot: PaymentOrderSnapshot = {
    id: order.id,
    total: order.total.toNumber(),
    nomeCliente: order.nomeCliente!,
    emailCliente: order.emailCliente!,
    telefoneCliente: order.telefoneCliente!,
    cpfCnpj: order.cpfCnpj!,
    cepDestino: order.cepDestino!,
    logradouro: order.logradouro!,
    numero: order.numero!,
    complemento: order.complemento,
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

export async function reconcileMercadoPagoPayment(
  paymentId: string,
): Promise<ReconciledPayment> {
  const payment = await getMercadoPagoPayment(paymentId);
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
    };
  }

  if (order.status === "cancelado") {
    throw new PaymentReconciliationError(
      "Pedido cancelado recebeu um pagamento",
      "PAYMENT_MISMATCH",
    );
  }

  const updated = await prisma.order.updateMany({
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

  if (updated.count === 0) {
    const current = await prisma.order.findUnique({
      where: { id: order.id },
      select: { status: true, mercadoPagoPaymentId: true },
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
  }

  return {
    orderId: order.id,
    orderStatus: "pago",
    paymentStatus: payment.status,
    changed: updated.count === 1,
  };
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
