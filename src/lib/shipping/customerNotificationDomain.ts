export const CUSTOMER_NOTIFICATION_TYPES = {
  paymentConfirmed: "payment_confirmed",
  orderPreparing: "order_preparing",
  orderInTransit: "order_in_transit",
  orderDelivered: "order_delivered",
  orderCanceled: "order_canceled",
} as const;

export type CustomerNotificationType =
  (typeof CUSTOMER_NOTIFICATION_TYPES)[keyof typeof CUSTOMER_NOTIFICATION_TYPES];

const REFUND_SUCCESS_STATUSES = new Set(["approved", "processed", "refunded"]);

export function shouldNotifyOrderCancellation(refundStatus: string | null) {
  return refundStatus !== null && REFUND_SUCCESS_STATUSES.has(refundStatus);
}

export type CancellationPaymentDetails = {
  paymentMethodId: string | null;
  paymentTypeId: string | null;
};

export function orderCancellationEmailContent(input: {
  orderId: string;
  customerName: string;
  total: number;
  payment: CancellationPaymentDetails;
}) {
  const reference = `#${input.orderId.slice(0, 8)}`;
  const formattedTotal = input.total
    .toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
    .replace(/\u00a0/g, " ");
  const paymentMethodId = input.payment.paymentMethodId?.toLowerCase();
  const paymentTypeId = input.payment.paymentTypeId?.toLowerCase();
  const timing =
    paymentMethodId === "pix"
      ? "Para pagamentos via Pix, o retorno costuma ser rápido, em até alguns dias úteis."
      : paymentTypeId &&
          ["credit_card", "debit_card", "prepaid_card"].includes(paymentTypeId)
        ? "Para pagamentos no cartão, o estorno pode levar de 1 a 2 faturas para aparecer, dependendo do seu banco."
        : "O valor retorna pela mesma forma de pagamento; o prazo varia conforme o método usado.";

  return {
    subject: `Seu pedido ${reference} foi cancelado — estorno em andamento`,
    message: `Olá ${input.customerName}, seu pedido ${reference} foi cancelado e o reembolso de ${formattedTotal} já foi processado. O valor retorna pela mesma forma de pagamento usada na compra.\n\n${timing}\n\nVocê não precisa fazer nada. Qualquer dúvida, fale com a gente pelo WhatsApp.`,
  };
}

export function notificationTypeFromShipmentEvent(
  eventType: string,
  status: string | null,
): CustomerNotificationType | null {
  if (eventType === "payment_confirmed") {
    return CUSTOMER_NOTIFICATION_TYPES.paymentConfirmed;
  }

  if (eventType === "prepared") {
    return CUSTOMER_NOTIFICATION_TYPES.orderPreparing;
  }

  if (status === "delivered") {
    return CUSTOMER_NOTIFICATION_TYPES.orderDelivered;
  }

  if (status === "posted" || status === "in_transit") {
    return CUSTOMER_NOTIFICATION_TYPES.orderInTransit;
  }

  if (
    status === "purchased" ||
    status === "generated" ||
    status === "printed"
  ) {
    return CUSTOMER_NOTIFICATION_TYPES.orderPreparing;
  }

  return null;
}

export function customerNotificationContent(
  type: CustomerNotificationType,
  orderId: string,
) {
  const reference = `#${orderId.slice(0, 8)}`;

  switch (type) {
    case CUSTOMER_NOTIFICATION_TYPES.paymentConfirmed:
      return {
        title: "Pagamento confirmado",
        message: `O pagamento do pedido ${reference} foi confirmado.`,
      };
    case CUSTOMER_NOTIFICATION_TYPES.orderPreparing:
      return {
        title: "Pedido em preparação",
        message: `Seu pedido ${reference} está sendo preparado para envio.`,
      };
    case CUSTOMER_NOTIFICATION_TYPES.orderInTransit:
      return {
        title: "Pedido em transporte",
        message: `Seu pedido ${reference} está a caminho!`,
      };
    case CUSTOMER_NOTIFICATION_TYPES.orderDelivered:
      return {
        title: "Pedido entregue",
        message: `Seu pedido ${reference} foi entregue!`,
      };
    case CUSTOMER_NOTIFICATION_TYPES.orderCanceled:
      return {
        title: "Pedido cancelado",
        message: `Seu pedido ${reference} foi cancelado e o estorno já foi iniciado. O valor retorna pela mesma forma de pagamento.`,
      };
  }
}
