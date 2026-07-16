import { prisma } from "@/lib/db";
import {
  canAdvanceShippingStatus,
  PROVIDER_LABEL_STATUS,
} from "@/lib/shipping/shippingDomain";

export type ProviderShipmentUpdate = {
  melhorEnvioId: string;
  orderId?: string | null;
  protocol?: string | null;
  status?: string | null;
  tracking?: string | null;
  trackingUrl?: string | null;
  paidAt?: Date | null;
  generatedAt?: Date | null;
  postedAt?: Date | null;
  deliveredAt?: Date | null;
  canceledAt?: Date | null;
};

export async function applyProviderShipmentUpdate(
  update: ProviderShipmentUpdate,
) {
  const shipment = await prisma.shipment.findFirst({
    where: {
      OR: [
        { melhorEnvioId: update.melhorEnvioId },
        ...(update.orderId ? [{ orderId: update.orderId }] : []),
      ],
    },
  });
  if (!shipment) return { matched: false, changed: false };

  const incomingLabelStatus = update.status
    ? PROVIDER_LABEL_STATUS[update.status.toLowerCase()]
    : undefined;
  const advances =
    Boolean(incomingLabelStatus) &&
    canAdvanceShippingStatus(shipment.labelStatus, incomingLabelStatus!);
  const changed = Boolean(
    update.melhorEnvioId !== shipment.melhorEnvioId ||
      (advances && incomingLabelStatus !== shipment.labelStatus) ||
      (update.tracking && update.tracking !== shipment.codigoRastreio) ||
      (update.trackingUrl && update.trackingUrl !== shipment.urlRastreio) ||
      (update.protocol && update.protocol !== shipment.melhorEnvioProtocol),
  );
  if (!changed) return { matched: true, changed: false };

  await prisma.$transaction(async (transaction) => {
    await transaction.shipment.update({
      where: { id: shipment.id },
      data: {
        melhorEnvioId: update.melhorEnvioId,
        ...(update.protocol
          ? { melhorEnvioProtocol: update.protocol }
          : {}),
        ...(advances && update.status
          ? {
              status: update.status,
              labelStatus: incomingLabelStatus as never,
            }
          : {}),
        ...(update.tracking ? { codigoRastreio: update.tracking } : {}),
        ...(update.trackingUrl ? { urlRastreio: update.trackingUrl } : {}),
        ...(update.paidAt ? { compradoEm: update.paidAt } : {}),
        ...(update.generatedAt ? { geradoEm: update.generatedAt } : {}),
        ...(update.postedAt ? { postadoEm: update.postedAt } : {}),
        ...(update.deliveredAt ? { entregueEm: update.deliveredAt } : {}),
        ...(update.canceledAt ? { canceladoEm: update.canceledAt } : {}),
        ultimoErro: null,
        ultimoErroCodigo: null,
      },
    });
    await transaction.shipmentEvent.create({
      data: {
        shipmentId: shipment.id,
        type: "provider_status",
        status: advances ? (incomingLabelStatus as never) : shipment.labelStatus,
        message: update.status
          ? `Status atualizado pelo Melhor Envio: ${update.status}.`
          : "Rastreamento atualizado pelo Melhor Envio.",
        metadata: {
          providerStatus: update.status ?? null,
          trackingUpdated: Boolean(update.tracking),
        },
      },
    });
  });
  return { matched: true, changed: true };
}
