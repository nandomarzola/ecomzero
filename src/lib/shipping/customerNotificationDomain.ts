export const CUSTOMER_NOTIFICATION_TYPES = {
  paymentConfirmed: "payment_confirmed",
  orderPreparing: "order_preparing",
  orderInTransit: "order_in_transit",
  orderDelivered: "order_delivered",
} as const;

export type CustomerNotificationType =
  (typeof CUSTOMER_NOTIFICATION_TYPES)[keyof typeof CUSTOMER_NOTIFICATION_TYPES];

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
  }
}
