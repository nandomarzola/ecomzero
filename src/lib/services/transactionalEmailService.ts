import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  CUSTOMER_NOTIFICATION_TYPES,
  type CustomerNotificationType,
} from "@/lib/shipping/customerNotificationDomain";
import { renderCustomerMessage } from "@/lib/storeSettingsDomain";
import {
  emailBrandingFromSettings,
  renderBrandedEmail,
  sendTransactionalEmail,
  type EmailSendResult,
} from "@/lib/services/emailService";

export type OrderEmailType = Extract<
  CustomerNotificationType,
  "payment_confirmed" | "order_in_transit" | "order_delivered"
>;

type ClaimedOrderEmail = {
  id: string;
  processingToken: string;
};

const PROCESSING_STALE_MS = 5 * 60 * 1_000;

const defaultTemplates: Record<OrderEmailType, string> = {
  payment_confirmed: "O pagamento do pedido {numero_pedido} foi confirmado.",
  order_in_transit: "Seu pedido {numero_pedido} está a caminho!",
  order_delivered: "Seu pedido {numero_pedido} foi entregue!",
};

const emailSubjects: Record<OrderEmailType, string> = {
  payment_confirmed: "Pagamento confirmado",
  order_in_transit: "Seu pedido está a caminho",
  order_delivered: "Seu pedido foi entregue",
};

function logSkipped(kind: string, reason: string, reference: string) {
  console.info("[email] envio ignorado", { kind, reason, reference });
}

async function claimOrderEmail(
  orderId: string,
  type: OrderEmailType,
): Promise<ClaimedOrderEmail | null> {
  const processingToken = randomUUID();

  try {
    const created = await prisma.orderEmailLog.create({
      data: { orderId, type, processingToken },
      select: { id: true },
    });
    return { id: created.id, processingToken };
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
  }

  const claimed = await prisma.orderEmailLog.updateMany({
    where: {
      orderId,
      type,
      sentAt: null,
      OR: [
        { status: "failed" },
        {
          status: "processing",
          updatedAt: { lt: new Date(Date.now() - PROCESSING_STALE_MS) },
        },
      ],
    },
    data: {
      status: "processing",
      processingToken,
      attempts: { increment: 1 },
      lastError: null,
    },
  });

  if (claimed.count !== 1) return null;

  const record = await prisma.orderEmailLog.findUnique({
    where: { orderId_type: { orderId, type } },
    select: { id: true },
  });
  return record ? { id: record.id, processingToken } : null;
}

async function finishOrderEmail(
  claim: ClaimedOrderEmail,
  result: EmailSendResult,
) {
  if (result.status === "sent") {
    await prisma.orderEmailLog.updateMany({
      where: {
        id: claim.id,
        processingToken: claim.processingToken,
        sentAt: null,
      },
      data: {
        status: "sent",
        providerMessageId: result.providerMessageId,
        sentAt: new Date(),
        processingToken: null,
        lastError: null,
      },
    });
    return;
  }

  await prisma.orderEmailLog.updateMany({
    where: {
      id: claim.id,
      processingToken: claim.processingToken,
      sentAt: null,
    },
    data: {
      status: "failed",
      processingToken: null,
      lastError: result.reason.slice(0, 500),
    },
  });
}

export async function sendWelcomeEmail(user: {
  id: string;
  name: string;
  email: string;
}): Promise<void> {
  try {
    const settings = await prisma.storeSettings.findUnique({
      where: { id: "singleton" },
      select: {
        nomeLoja: true,
        logoUrl: true,
        corPrincipal: true,
        mensagemBoasVindasAtiva: true,
        mensagemBoasVindas: true,
      },
    });

    if (!settings?.mensagemBoasVindasAtiva) {
      logSkipped("welcome", "template_disabled", user.id);
      return;
    }

    const branding = emailBrandingFromSettings(settings);
    const message = renderCustomerMessage(settings.mensagemBoasVindas, {
      customerName: user.name,
      orderId: "",
    });
    const content = renderBrandedEmail({
      branding,
      heading: `Boas-vindas à ${branding.storeName}`,
      message,
    });

    await sendTransactionalEmail({
      kind: "welcome",
      to: user.email,
      subject: `Boas-vindas à ${branding.storeName}`,
      html: content.html,
      text: content.text,
      idempotencyKey: `welcome/${user.id}`,
    });
  } catch (error) {
    console.error("[email] falha ao preparar boas-vindas", {
      kind: "welcome",
      reference: user.id,
      reason: error instanceof Error ? error.name : "unknown_error",
    });
  }
}

export async function sendOrderLifecycleEmail(
  orderId: string,
  type: OrderEmailType,
): Promise<void> {
  let claim: ClaimedOrderEmail | null = null;

  try {
    const [order, settings] = await Promise.all([
      prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          nomeCliente: true,
          emailCliente: true,
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.storeSettings.findUnique({
        where: { id: "singleton" },
        select: {
          nomeLoja: true,
          logoUrl: true,
          corPrincipal: true,
          mensagemPedidoConfirmadoAtiva: true,
          mensagemPedidoConfirmado: true,
          mensagemPedidoEnviadoAtiva: true,
          mensagemPedidoEnviado: true,
          mensagemPedidoEntregueAtiva: true,
          mensagemPedidoEntregue: true,
        },
      }),
    ]);

    if (!order) {
      logSkipped(type, "order_not_found", orderId);
      return;
    }

    const recipient = order.emailCliente ?? order.user?.email;
    if (!recipient) {
      logSkipped(type, "recipient_not_found", orderId);
      return;
    }

    const enabled =
      type === CUSTOMER_NOTIFICATION_TYPES.paymentConfirmed
        ? (settings?.mensagemPedidoConfirmadoAtiva ?? true)
        : type === CUSTOMER_NOTIFICATION_TYPES.orderInTransit
          ? (settings?.mensagemPedidoEnviadoAtiva ?? true)
          : (settings?.mensagemPedidoEntregueAtiva ?? true);
    if (!enabled) {
      logSkipped(type, "template_disabled", orderId);
      return;
    }

    const template =
      type === CUSTOMER_NOTIFICATION_TYPES.paymentConfirmed
        ? (settings?.mensagemPedidoConfirmado ?? defaultTemplates[type])
        : type === CUSTOMER_NOTIFICATION_TYPES.orderInTransit
          ? (settings?.mensagemPedidoEnviado ?? defaultTemplates[type])
          : (settings?.mensagemPedidoEntregue ?? defaultTemplates[type]);
    const customerName =
      order.nomeCliente?.trim() || order.user?.name?.trim() || "cliente";
    const message = renderCustomerMessage(template, {
      customerName,
      orderId: order.id,
    });
    const branding = emailBrandingFromSettings({
      nomeLoja: settings?.nomeLoja ?? "EcomZero",
      logoUrl: settings?.logoUrl ?? "/images/logo2.png",
      corPrincipal: settings?.corPrincipal ?? "#A9EC17",
    });
    const reference = `#${order.id.slice(0, 8)}`;
    const content = renderBrandedEmail({
      branding,
      heading: `${emailSubjects[type]} — pedido ${reference}`,
      message,
    });

    claim = await claimOrderEmail(order.id, type);
    if (!claim) {
      logSkipped(type, "already_sent_or_processing", order.id);
      return;
    }

    const result = await sendTransactionalEmail({
      kind: type,
      to: recipient,
      subject: `${emailSubjects[type]} — pedido ${reference}`,
      html: content.html,
      text: content.text,
      idempotencyKey: `order/${type}/${order.id}`,
    });
    await finishOrderEmail(claim, result);
  } catch (error) {
    const reason = error instanceof Error ? error.name : "unknown_error";
    console.error("[email] falha ao processar e-mail de pedido", {
      kind: type,
      reference: orderId,
      reason,
    });

    if (claim) {
      await prisma.orderEmailLog
        .updateMany({
          where: {
            id: claim.id,
            processingToken: claim.processingToken,
            sentAt: null,
          },
          data: {
            status: "failed",
            processingToken: null,
            lastError: reason.slice(0, 500),
          },
        })
        .catch(() => undefined);
    }
  }
}
