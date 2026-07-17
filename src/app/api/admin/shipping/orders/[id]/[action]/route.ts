import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { config } from "@/lib/config";
import {
  attachInvoiceToOrder,
  cancelShipment,
  confirmFiscalDocumentForOrder,
  executeShipmentPurchase,
  markOrderAsExternalShipment,
  prepareOrderShipment,
  syncShipmentTracking,
  ShippingFulfillmentError,
} from "@/lib/services/shippingFulfillmentService";

const invoiceSchema = z.object({
  invoiceKey: z
    .string()
    .regex(/^\d{44}$/, "A chave da NF-e deve possuir exatamente 44 dígitos."),
});

const preparationSchema = z.object({ serviceId: z.string().min(1).optional() });
const fiscalDocumentSchema = z.discriminatedUnion("tipoDocumentoFiscal", [
  z.object({ tipoDocumentoFiscal: z.literal("nota_fiscal") }),
  z.object({
    tipoDocumentoFiscal: z.literal("declaracao_conteudo"),
    declaracaoConfirmada: z.literal(true),
  }),
]);
const orderIdSchema = z.string().uuid();

function authorized(request: NextRequest) {
  return Boolean(
    config.storefrontSyncApiKey &&
      request.headers.get("authorization") ===
        `Bearer ${config.storefrontSyncApiKey}`,
  );
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; action: string }> },
) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const params = await context.params;
  const parsedOrderId = orderIdSchema.safeParse(params.id);
  if (!parsedOrderId.success) {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }
  const id = parsedOrderId.data;
  const { action } = params;
  try {
    if (action === "prepare") {
      const parsed = preparationSchema.safeParse(
        await request.json().catch(() => ({})),
      );
      if (!parsed.success) {
        return NextResponse.json({ error: "Serviço de frete inválido." }, { status: 400 });
      }
      return NextResponse.json(
        await prepareOrderShipment(id, {
          preferredServiceId: parsed.data.serviceId,
        }),
      );
    }
    if (action === "invoice") {
      const parsed = invoiceSchema.safeParse(
        await request.json().catch(() => null),
      );
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Chave da NF-e inválida." },
          { status: 400 },
        );
      }
      return NextResponse.json(
        await attachInvoiceToOrder(id, parsed.data.invoiceKey),
      );
    }
    if (action === "fiscal-document") {
      const parsed = fiscalDocumentSchema.safeParse(
        await request.json().catch(() => null),
      );
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Documento fiscal inválido." },
          { status: 400 },
        );
      }
      return NextResponse.json(
        await confirmFiscalDocumentForOrder(
          id,
          parsed.data.tipoDocumentoFiscal,
        ),
      );
    }
    if (action === "purchase") {
      const parsed = preparationSchema.safeParse(
        await request.json().catch(() => ({})),
      );
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Serviço de frete inválido." },
          { status: 400 },
        );
      }
      return NextResponse.json(
        await executeShipmentPurchase(id, "manual", {
          preferredServiceId: parsed.data.serviceId,
        }),
      );
    }
    if (action === "external") {
      await markOrderAsExternalShipment(id);
      return NextResponse.json({ ok: true });
    }
    if (action === "tracking") {
      await syncShipmentTracking(id);
      return NextResponse.json({ ok: true });
    }
    if (action === "cancel") {
      await cancelShipment(id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Ação não encontrada" }, { status: 404 });
  } catch (error) {
    if (error instanceof ShippingFulfillmentError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === "ORDER_NOT_FOUND" ? 404 : 422 },
      );
    }
    return NextResponse.json(
      { error: "Não foi possível concluir a operação logística." },
      { status: 500 },
    );
  }
}
