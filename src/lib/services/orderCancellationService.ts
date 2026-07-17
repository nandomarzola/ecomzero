import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  cancelMercadoPagoPayment,
  getMercadoPagoPayment,
  refundMercadoPagoPayment,
  type MercadoPagoPaymentSnapshot,
  type MercadoPagoRefundSnapshot,
} from "@/lib/services/mercadoPagoService";
import { cancelShipment } from "@/lib/services/shippingFulfillmentService";
import type { OrderCancellationInput } from "@/lib/validation/orderCancellation";

const CANCELLATION_LEASE_MS = 2 * 60 * 1000;
const REFUND_SUCCESS_STATUSES = new Set(["approved", "processed", "refunded"]);
const PENDING_PAYMENT_STATUSES = new Set([
  "pending",
  "in_process",
  "authorized",
  "action_required",
]);

const REASON_LABELS = {
  customer_request: "Cliente desistiu",
  out_of_stock: "Fora de estoque",
  suspected_fraud: "Fraude suspeita",
  other: "Outro",
} as const;

type CancellationErrorCode =
  | "ORDER_NOT_FOUND"
  | "INVALID_STATUS"
  | "ALREADY_PROCESSING"
  | "PAYMENT_NOT_FOUND"
  | "PAYMENT_MISMATCH"
  | "PAYMENT_REFUND_FAILED"
  | "SHIPMENT_CANCELLATION_FAILED";

export class OrderCancellationError extends Error {
  constructor(
    message: string,
    public readonly code: CancellationErrorCode,
    public readonly status: 404 | 409 | 422,
  ) {
    super(message);
    this.name = "OrderCancellationError";
  }
}

export type CancelOrderResult = {
  orderId: string;
  status: "cancelado";
  alreadyCanceled: boolean;
  shipmentCanceled: boolean;
  refund: MercadoPagoRefundSnapshot | null;
  completedAt: string;
};

type CancellationClaim = {
  token: string;
  order: {
    id: string;
    status: "aguardando_pagamento" | "pago";
    total: number;
    mercadoPagoPaymentId: string | null;
    shipment: {
      melhorEnvioId: string | null;
      labelStatus: string;
    } | null;
  };
  shipmentCanceled: boolean;
};

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message.slice(0, 500)
    : "Não foi possível cancelar o pedido.";
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002",
  );
}

function assertPaymentBelongsToOrder(
  order: { id: string; total: number },
  payment: MercadoPagoPaymentSnapshot,
) {
  if (
    payment.externalReference !== order.id ||
    payment.currencyId !== "BRL" ||
    Math.abs(payment.transactionAmount - order.total) > 0.01
  ) {
    throw new OrderCancellationError(
      "O pagamento do Mercado Pago não corresponde a este pedido. O cancelamento foi bloqueado por segurança.",
      "PAYMENT_MISMATCH",
      422,
    );
  }
}

async function claimCancellation(
  orderId: string,
  input: OrderCancellationInput,
): Promise<CancellationClaim | CancelOrderResult> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          select: {
            id: true,
            status: true,
            total: true,
            mercadoPagoPaymentId: true,
            shipment: {
              select: { melhorEnvioId: true, labelStatus: true },
            },
            cancellation: true,
          },
        });

        if (!order) {
          throw new OrderCancellationError(
            "Pedido não encontrado.",
            "ORDER_NOT_FOUND",
            404,
          );
        }

        if (order.status === "cancelado") {
          return {
            orderId: order.id,
            status: "cancelado" as const,
            alreadyCanceled: true,
            shipmentCanceled: order.cancellation?.shipmentCanceled ?? false,
            refund: order.cancellation?.mercadoPagoRefundStatus
              ? {
                  id: order.cancellation.mercadoPagoRefundId,
                  paymentId: order.mercadoPagoPaymentId ?? "",
                  amount: null,
                  status: order.cancellation.mercadoPagoRefundStatus,
                }
              : null,
            completedAt: (
              order.cancellation?.completedAt ?? order.cancellation?.updatedAt ?? new Date()
            ).toISOString(),
          };
        }

        if (
          order.status !== "aguardando_pagamento" &&
          order.status !== "pago"
        ) {
          throw new OrderCancellationError(
            "Somente pedidos aguardando pagamento ou pagos podem ser cancelados.",
            "INVALID_STATUS",
            409,
          );
        }

        const token = randomUUID();
        const now = new Date();
        const staleBefore = new Date(now.getTime() - CANCELLATION_LEASE_MS);

        if (!order.cancellation) {
          await tx.orderCancellation.create({
            data: {
              orderId: order.id,
              reason: input.reason,
              note: input.note || null,
              requestedBy: input.requestedBy,
              previousOrderStatus: order.status,
              processingToken: token,
              processingStartedAt: now,
            },
          });
        } else {
          const claimed = await tx.orderCancellation.updateMany({
            where: {
              id: order.cancellation.id,
              OR: [
                { status: "failed" },
                {
                  status: "processing",
                  processingStartedAt: { lt: staleBefore },
                },
              ],
            },
            data: {
              reason: input.reason,
              note: input.note || null,
              requestedBy: input.requestedBy,
              status: "processing",
              attempts: { increment: 1 },
              processingToken: token,
              processingStartedAt: now,
              lastError: null,
            },
          });
          if (claimed.count !== 1) {
            throw new OrderCancellationError(
              "O cancelamento deste pedido já está sendo processado.",
              "ALREADY_PROCESSING",
              409,
            );
          }
        }

        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            type: "order_cancellation_requested",
            status: order.status,
            actorEmail: input.requestedBy,
            message: `Cancelamento solicitado: ${REASON_LABELS[input.reason]}.`,
            metadata: {
              reason: input.reason,
              note: input.note || null,
            },
          },
        });

        return {
          token,
          order: {
            id: order.id,
            status: order.status,
            total: Number(order.total),
            mercadoPagoPaymentId: order.mercadoPagoPaymentId,
            shipment: order.shipment,
          },
          shipmentCanceled: order.cancellation?.shipmentCanceled ?? false,
        };
      });
    } catch (error) {
      if (isUniqueConstraintError(error) && attempt === 0) continue;
      throw error;
    }
  }

  throw new OrderCancellationError(
    "O cancelamento deste pedido já está sendo processado.",
    "ALREADY_PROCESSING",
    409,
  );
}

async function recordCancellationFailure(
  claim: CancellationClaim,
  input: OrderCancellationInput,
  error: unknown,
) {
  const message = errorMessage(error);
  await prisma.$transaction(async (tx) => {
    const released = await tx.orderCancellation.updateMany({
      where: {
        orderId: claim.order.id,
        processingToken: claim.token,
        status: "processing",
      },
      data: {
        status: "failed",
        processingToken: null,
        processingStartedAt: null,
        lastError: message,
      },
    });
    if (released.count !== 1) return;
    await tx.orderEvent.create({
      data: {
        orderId: claim.order.id,
        type: "order_cancellation_failed",
        status: claim.order.status,
        actorEmail: input.requestedBy,
        message,
        metadata: { reason: input.reason },
      },
    });
  });
}

async function releaseCouponUsage(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  const redemption = await tx.couponRedemption.findUnique({
    where: { orderId },
    select: { id: true, couponId: true },
  });
  if (!redemption) return;

  await tx.couponRedemption.delete({ where: { id: redemption.id } });
  await tx.coupon.updateMany({
    where: { id: redemption.couponId, usos: { gt: 0 } },
    data: { usos: { decrement: 1 } },
  });
}

async function finalizeCancellation(
  claim: CancellationClaim,
  input: OrderCancellationInput,
  paymentStatus: string | null,
  refund: MercadoPagoRefundSnapshot | null,
): Promise<CancelOrderResult> {
  const completedAt = new Date();
  await prisma.$transaction(async (tx) => {
    const cancellation = await tx.orderCancellation.updateMany({
      where: {
        orderId: claim.order.id,
        processingToken: claim.token,
        status: "processing",
      },
      data: {
        status: "completed",
        shipmentCanceled: claim.shipmentCanceled,
        mercadoPagoRefundId: refund?.id ?? null,
        mercadoPagoRefundStatus: refund?.status ?? null,
        processingToken: null,
        processingStartedAt: null,
        lastError: null,
        completedAt,
      },
    });
    if (cancellation.count !== 1) {
      throw new OrderCancellationError(
        "O cancelamento perdeu a autorização de processamento. Tente novamente.",
        "ALREADY_PROCESSING",
        409,
      );
    }

    await tx.order.update({
      where: { id: claim.order.id },
      data: {
        status: "cancelado",
        mercadoPagoPaymentStatus:
          paymentStatus ?? (refund ? "refunded" : undefined),
      },
    });
    await releaseCouponUsage(tx, claim.order.id);
    await tx.orderEvent.create({
      data: {
        orderId: claim.order.id,
        type: "order_canceled",
        status: "cancelado",
        actorEmail: input.requestedBy,
        message: refund
          ? "Pedido cancelado e pagamento estornado no Mercado Pago."
          : "Pedido cancelado.",
        metadata: {
          reason: input.reason,
          note: input.note || null,
          previousStatus: claim.order.status,
          shipmentCanceled: claim.shipmentCanceled,
          refundId: refund?.id ?? null,
          refundStatus: refund?.status ?? null,
        },
      },
    });
  });

  return {
    orderId: claim.order.id,
    status: "cancelado",
    alreadyCanceled: false,
    shipmentCanceled: claim.shipmentCanceled,
    refund,
    completedAt: completedAt.toISOString(),
  };
}

export async function cancelOrder(
  orderId: string,
  input: OrderCancellationInput,
): Promise<CancelOrderResult> {
  const claimed = await claimCancellation(orderId, input);
  if (!("token" in claimed)) return claimed;

  try {
    if (
      claimed.order.shipment?.melhorEnvioId &&
      claimed.order.shipment.labelStatus !== "canceled"
    ) {
      try {
        await cancelShipment(claimed.order.id);
      } catch (error) {
        throw new OrderCancellationError(
          errorMessage(error),
          "SHIPMENT_CANCELLATION_FAILED",
          422,
        );
      }
      claimed.shipmentCanceled = true;
      await prisma.orderCancellation.updateMany({
        where: {
          orderId: claimed.order.id,
          processingToken: claimed.token,
        },
        data: { shipmentCanceled: true },
      });
    }

    let refund: MercadoPagoRefundSnapshot | null = null;
    let paymentStatus: string | null = null;
    const paymentId = claimed.order.mercadoPagoPaymentId;

    if (claimed.order.status === "pago" && !paymentId) {
      throw new OrderCancellationError(
        "O pedido está pago, mas não possui ID do pagamento no Mercado Pago.",
        "PAYMENT_NOT_FOUND",
        422,
      );
    }

    if (paymentId) {
      const payment = await getMercadoPagoPayment(paymentId);
      assertPaymentBelongsToOrder(claimed.order, payment);
      paymentStatus = payment.status;

      if (payment.status === "approved") {
        refund = await refundMercadoPagoPayment(paymentId, claimed.order.id);
        if (!REFUND_SUCCESS_STATUSES.has(refund.status)) {
          throw new OrderCancellationError(
            `O estorno está com status ${refund.status}. Aguarde a conclusão antes de cancelar o pedido.`,
            "PAYMENT_REFUND_FAILED",
            422,
          );
        }
        if (
          refund.amount !== null &&
          Math.abs(refund.amount - claimed.order.total) > 0.01
        ) {
          throw new OrderCancellationError(
            "O valor estornado não corresponde ao total do pedido. Verifique o Mercado Pago.",
            "PAYMENT_MISMATCH",
            422,
          );
        }
        paymentStatus = "refunded";
      } else if (payment.status === "refunded") {
        refund = {
          id: null,
          paymentId,
          amount: claimed.order.total,
          status: "refunded",
        };
        paymentStatus = "refunded";
      } else if (PENDING_PAYMENT_STATUSES.has(payment.status)) {
        const canceledPayment = await cancelMercadoPagoPayment(
          paymentId,
          claimed.order.id,
        );
        paymentStatus = canceledPayment.status;
      } else if (
        claimed.order.status === "pago" ||
        !["cancelled", "canceled", "rejected", "expired"].includes(
          payment.status,
        )
      ) {
        throw new OrderCancellationError(
          `O pagamento está com status ${payment.status} e não pode ser cancelado automaticamente.`,
          "PAYMENT_REFUND_FAILED",
          422,
        );
      }
    }

    return await finalizeCancellation(
      claimed,
      input,
      paymentStatus,
      refund,
    );
  } catch (error) {
    await recordCancellationFailure(claimed, input, error).catch(() => undefined);
    if (error instanceof OrderCancellationError) throw error;
    throw new OrderCancellationError(
      errorMessage(error),
      "PAYMENT_REFUND_FAILED",
      422,
    );
  }
}

export async function refundLatePaymentForCanceledOrder(
  orderId: string,
  payment: MercadoPagoPaymentSnapshot,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, total: true, mercadoPagoPaymentStatus: true },
  });
  if (!order || order.status !== "cancelado") return false;
  if (order.mercadoPagoPaymentStatus === "refunded") return false;

  const snapshot = { id: order.id, total: Number(order.total) };
  assertPaymentBelongsToOrder(snapshot, payment);
  const refund = await refundMercadoPagoPayment(payment.id, order.id);
  if (!REFUND_SUCCESS_STATUSES.has(refund.status)) {
    throw new OrderCancellationError(
      `O estorno do pagamento tardio está com status ${refund.status}.`,
      "PAYMENT_REFUND_FAILED",
      422,
    );
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: {
        id: order.id,
        status: "cancelado",
        mercadoPagoPaymentStatus: { not: "refunded" },
      },
      data: {
        mercadoPagoPaymentId: payment.id,
        mercadoPagoPaymentStatus: "refunded",
        pagoEm: payment.approvedAt ?? new Date(),
      },
    });
    if (updated.count !== 1) return;
    await tx.orderCancellation.updateMany({
      where: { orderId: order.id },
      data: {
        mercadoPagoRefundId: refund.id,
        mercadoPagoRefundStatus: refund.status,
      },
    });
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        type: "late_payment_refunded",
        status: "cancelado",
        message: "Pagamento recebido após o cancelamento e estornado automaticamente.",
        metadata: {
          paymentId: payment.id,
          refundId: refund.id,
          refundStatus: refund.status,
        },
      },
    });
  });
  return true;
}
