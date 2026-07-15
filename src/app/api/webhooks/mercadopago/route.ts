import { NextResponse, type NextRequest } from "next/server";
import {
  InvalidWebhookSignatureError,
  WebhookSignatureValidator,
} from "mercadopago";
import { config } from "@/lib/config";
import { MercadoPagoServiceError } from "@/lib/services/mercadoPagoService";
import {
  PaymentReconciliationError,
  reconcileMercadoPagoPayment,
} from "@/lib/services/orderPaymentService";
import {
  mercadoPagoPaymentIdSchema,
  mercadoPagoWebhookSchema,
} from "@/lib/validation/payment";

export async function POST(request: NextRequest) {
  const secret = config.mercadoPago.webhookSecret;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook não configurado" },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = mercadoPagoWebhookSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Notificação inválida" }, { status: 400 });
  }

  const eventType =
    request.nextUrl.searchParams.get("type") ?? parsedBody.data.type;
  if (eventType !== "payment") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const rawPaymentId =
    request.nextUrl.searchParams.get("data.id") ?? parsedBody.data.data?.id;
  const parsedPaymentId = mercadoPagoPaymentIdSchema.safeParse(rawPaymentId);
  if (!parsedPaymentId.success) {
    return NextResponse.json({ error: "Pagamento inválido" }, { status: 400 });
  }

  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId: parsedPaymentId.data,
      secret,
      toleranceSeconds: 300,
    });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      return NextResponse.json(
        { error: "Assinatura inválida" },
        { status: 401 },
      );
    }
    throw error;
  }

  try {
    const result = await reconcileMercadoPagoPayment(parsedPaymentId.data);
    return NextResponse.json({
      received: true,
      orderId: result.orderId,
      status: result.orderStatus,
      changed: result.changed,
    });
  } catch (error) {
    if (error instanceof PaymentReconciliationError) {
      console.error("Mercado Pago webhook rejeitado", {
        paymentId: parsedPaymentId.data,
        code: error.code,
      });
      return NextResponse.json({ received: true, ignored: true });
    }
    if (error instanceof MercadoPagoServiceError) {
      return NextResponse.json(
        { error: "Falha temporária ao confirmar pagamento" },
        { status: error.status },
      );
    }

    console.error("Falha inesperada no webhook do Mercado Pago", {
      paymentId: parsedPaymentId.data,
    });
    return NextResponse.json(
      { error: "Falha temporária ao confirmar pagamento" },
      { status: 500 },
    );
  }
}
