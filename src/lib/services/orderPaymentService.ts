import { prisma } from "@/lib/db";
import {
  createPaymentPreference,
  type PaymentOrderSnapshot,
} from "@/lib/services/mercadoPagoService";

type OrderPaymentErrorCode =
  | "ORDER_NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_STATUS";

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
