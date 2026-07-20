import { config } from "@/lib/config";
import { prisma } from "@/lib/db";
import { buildMetaPurchaseServerEvent } from "@/lib/metaConversionsDomain";

const META_GRAPH_API_VERSION = "v25.0";

type MetaConversionsApiResponse = {
  events_received?: number;
  fbtrace_id?: string;
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

export async function sendMetaPurchaseConversion(orderId: string): Promise<boolean> {
  const accessToken = config.meta.capiAccessToken;
  if (!accessToken) {
    console.warn("[meta-capi] Purchase não enviado", {
      orderId,
      reason: "META_CAPI_ACCESS_TOKEN não configurado",
    });
    return false;
  }

  try {
    const [settings, order] = await Promise.all([
      prisma.storeSettings.findUnique({
        where: { id: "singleton" },
        select: {
          metaPixelAtivo: true,
          metaPixelId: true,
        },
      }),
      prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          total: true,
          emailCliente: true,
          telefoneCliente: true,
          pagoEm: true,
          items: {
            select: {
              variantId: true,
              quantidade: true,
              precoUnitario: true,
            },
          },
        },
      }),
    ]);

    const pixelId = settings?.metaPixelId?.trim() ?? "";
    if (!settings?.metaPixelAtivo || !/^\d{5,30}$/.test(pixelId)) {
      console.warn("[meta-capi] Purchase não enviado", {
        orderId,
        reason: "Meta Pixel inativo ou ID inválido",
      });
      return false;
    }
    if (!order || order.status !== "pago" || order.items.length === 0) {
      console.warn("[meta-capi] Purchase não enviado", {
        orderId,
        reason: "Pedido pago não encontrado ou sem itens",
      });
      return false;
    }

    const event = buildMetaPurchaseServerEvent({
      orderId: order.id,
      eventTime: order.pagoEm ?? new Date(),
      total: Number(order.total),
      email: order.emailCliente,
      phone: order.telefoneCliente,
      items: order.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantidade,
        unitPrice: Number(item.precoUnitario),
      })),
    });

    if (!event.user_data.em && !event.user_data.ph) {
      console.warn("[meta-capi] Purchase não enviado", {
        orderId,
        eventId: event.event_id,
        reason: "Pedido sem e-mail ou telefone para correspondência",
      });
      return false;
    }

    const response = await fetch(
      `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(pixelId)}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [event],
          access_token: accessToken,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      },
    );
    const result = (await response.json().catch(() => ({}))) as MetaConversionsApiResponse;

    if (!response.ok || result.events_received !== 1) {
      console.error("[meta-capi] Falha no envio de Purchase", {
        orderId,
        eventId: event.event_id,
        status: response.status,
        providerCode: result.error?.code ?? null,
        providerType: result.error?.type ?? null,
        providerMessage: result.error?.message ?? "Resposta inválida da Meta",
      });
      return false;
    }

    console.info("[meta-capi] Purchase enviado", {
      orderId,
      eventId: event.event_id,
      eventsReceived: result.events_received,
      traceId: result.fbtrace_id ?? null,
    });
    return true;
  } catch (error) {
    console.error("[meta-capi] Falha no envio de Purchase", {
      orderId,
      reason: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return false;
  }
}
