import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  CUSTOMER_NOTIFICATION_TYPES,
  customerNotificationContent,
  notificationTypeFromShipmentEvent,
} from "@/lib/shipping/customerNotificationDomain";
import { renderCustomerMessage } from "@/lib/storeSettingsDomain";

type ShipmentNotificationInput = {
  shipmentId: string;
  eventType: string;
  status: string | null;
  createdAt?: Date;
};

export async function createCustomerNotificationFromShipmentEvent(
  transaction: Prisma.TransactionClient,
  input: ShipmentNotificationInput,
) {
  const type = notificationTypeFromShipmentEvent(
    input.eventType,
    input.status,
  );
  if (!type) return;

  const shipment = await transaction.shipment.findUnique({
    where: { id: input.shipmentId },
    select: {
      orderId: true,
      order: { select: { userId: true, nomeCliente: true } },
    },
  });
  if (!shipment?.order.userId) return;

  const settings = await transaction.storeSettings.findUnique({ where: { id: "singleton" } });
  const content = customerNotificationContent(type, shipment.orderId);
  let message = content.message;
  if (type === CUSTOMER_NOTIFICATION_TYPES.paymentConfirmed) {
    if (settings && !settings.mensagemPedidoConfirmadoAtiva) return;
    if (settings) message = renderCustomerMessage(settings.mensagemPedidoConfirmado, { customerName: shipment.order.nomeCliente ?? "cliente", orderId: shipment.orderId });
  } else if (type === CUSTOMER_NOTIFICATION_TYPES.orderInTransit) {
    if (settings && !settings.mensagemPedidoEnviadoAtiva) return;
    if (settings) message = renderCustomerMessage(settings.mensagemPedidoEnviado, { customerName: shipment.order.nomeCliente ?? "cliente", orderId: shipment.orderId });
  } else if (type === CUSTOMER_NOTIFICATION_TYPES.orderDelivered) {
    if (settings && !settings.mensagemPedidoEntregueAtiva) return;
    if (settings) message = renderCustomerMessage(settings.mensagemPedidoEntregue, { customerName: shipment.order.nomeCliente ?? "cliente", orderId: shipment.orderId });
  }
  await transaction.notification.createMany({
    data: [
      {
        userId: shipment.order.userId,
        orderId: shipment.orderId,
        type,
        title: content.title,
        message,
        createdAt: input.createdAt,
      },
    ],
    skipDuplicates: true,
  });
}

async function synchronizeExistingShipmentEvents(userId: string) {
  const [events, settings] = await Promise.all([prisma.shipmentEvent.findMany({
    where: {
      shipment: { order: { userId } },
      OR: [
        { type: "payment_confirmed" },
        { type: "prepared" },
        {
          status: {
            in: [
              "purchased",
              "generated",
              "printed",
              "posted",
              "in_transit",
              "delivered",
            ],
          },
        },
      ],
    },
    select: {
      type: true,
      status: true,
      createdAt: true,
      shipment: { select: { orderId: true, order: { select: { nomeCliente: true } } } },
    },
    orderBy: { createdAt: "asc" },
  }), prisma.storeSettings.findUnique({ where: { id: "singleton" } })]);

  const data = events.flatMap((event) => {
    const type = notificationTypeFromShipmentEvent(event.type, event.status);
    if (!type) return [];

    if (type === CUSTOMER_NOTIFICATION_TYPES.paymentConfirmed && settings && !settings.mensagemPedidoConfirmadoAtiva) return [];
    if (type === CUSTOMER_NOTIFICATION_TYPES.orderInTransit && settings && !settings.mensagemPedidoEnviadoAtiva) return [];
    if (type === CUSTOMER_NOTIFICATION_TYPES.orderDelivered && settings && !settings.mensagemPedidoEntregueAtiva) return [];

    const content = customerNotificationContent(type, event.shipment.orderId);
    const template = type === CUSTOMER_NOTIFICATION_TYPES.paymentConfirmed
      ? settings?.mensagemPedidoConfirmado
      : type === CUSTOMER_NOTIFICATION_TYPES.orderInTransit
        ? settings?.mensagemPedidoEnviado
        : type === CUSTOMER_NOTIFICATION_TYPES.orderDelivered
          ? settings?.mensagemPedidoEntregue
          : null;
    const message = template ? renderCustomerMessage(template, { customerName: event.shipment.order.nomeCliente ?? "cliente", orderId: event.shipment.orderId }) : content.message;
    return [
      {
        userId,
        orderId: event.shipment.orderId,
        type,
        title: content.title,
        message,
        createdAt: event.createdAt,
      },
    ];
  });

  if (data.length > 0) {
    await prisma.notification.createMany({ data, skipDuplicates: true });
  }
}

export async function getCustomerNotifications(userId: string) {
  await synchronizeExistingShipmentEvents(userId);

  const [notifications, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        orderId: true,
        type: true,
        title: true,
        message: true,
        lida: true,
        lidaEm: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId, lida: false } }),
  ]);

  return {
    notifications: notifications.map((notification) => ({
      ...notification,
      lidaEm: notification.lidaEm?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    })),
    unreadCount,
  };
}

export async function markCustomerNotificationAsRead(
  userId: string,
  notificationId: string,
) {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { lida: true, lidaEm: new Date() },
  });

  return result.count === 1;
}
