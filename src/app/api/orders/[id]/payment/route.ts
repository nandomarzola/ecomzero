import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { config, isMercadoPagoBrickConfigurado } from "@/lib/config";
import { hasCheckoutOrderAccess } from "@/lib/session";
import { MercadoPagoServiceError } from "@/lib/services/mercadoPagoService";
import {
  getOrderBrickPayment,
  OrderPaymentServiceError,
  PaymentReconciliationError,
  processOrderBrickPayment,
} from "@/lib/services/orderPaymentService";
import {
  brickPaymentSchema,
  paymentOrderIdSchema,
} from "@/lib/validation/payment";

type OrderPaymentRouteProps = {
  params: Promise<{ id: string }>;
};

const getOrderAccess = async (orderId: string) => {
  const [session, hasGuestAccess] = await Promise.all([
    auth(),
    hasCheckoutOrderAccess(orderId),
  ]);

  return {
    userId: session?.user?.id ?? null,
    hasGuestAccess,
  };
};

type PaymentErrorContext = {
  requestId: string;
  operation: "get" | "create";
  orderReference: string;
  paymentMethod?: string;
};

const paymentResponse = (
  body: Record<string, unknown>,
  status: number,
  requestId: string,
) =>
  NextResponse.json(
    { ...body, requestId },
    { status, headers: { "x-payment-request-id": requestId } },
  );

const handlePaymentError = (
  error: unknown,
  context: PaymentErrorContext,
) => {
  const providerFailure =
    error instanceof MercadoPagoServiceError
      ? error.providerFailure
      : null;
  console.error("Mercado Pago payment route failed", {
    ...context,
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage: error instanceof Error ? error.message : "Erro desconhecido",
    errorCode:
      error instanceof OrderPaymentServiceError ||
      error instanceof PaymentReconciliationError
        ? error.code
        : null,
    status:
      error instanceof OrderPaymentServiceError ||
      error instanceof MercadoPagoServiceError
        ? error.status
        : null,
    providerStatus: providerFailure?.status ?? null,
    providerError: providerFailure?.error ?? null,
    providerMessage: providerFailure?.message ?? null,
    providerCauses: providerFailure?.causes ?? [],
  });

  if (error instanceof OrderPaymentServiceError) {
    return paymentResponse(
      { error: error.message },
      error.status,
      context.requestId,
    );
  }
  if (error instanceof MercadoPagoServiceError) {
    return paymentResponse(
      {
        error: error.message,
        code:
          error.providerFailure?.error ??
          error.providerFailure?.causes[0]?.code ??
          "MERCADOPAGO_PROVIDER_ERROR",
      },
      error.status,
      context.requestId,
    );
  }
  if (error instanceof PaymentReconciliationError) {
    return paymentResponse(
      { error: "O pagamento não corresponde a este pedido" },
      409,
      context.requestId,
    );
  }

  return paymentResponse(
    { error: "Erro inesperado ao processar pagamento" },
    500,
    context.requestId,
  );
};

export async function GET(
  _request: NextRequest,
  { params }: OrderPaymentRouteProps,
) {
  const requestId = randomUUID();
  const parsedId = paymentOrderIdSchema.safeParse((await params).id);
  if (!parsedId.success) {
    return paymentResponse({ error: "Pedido inválido" }, 400, requestId);
  }
  if (!isMercadoPagoBrickConfigurado) {
    console.error("Mercado Pago payment configuration missing", {
      requestId,
      operation: "get",
      hasAccessToken: Boolean(config.mercadoPago.accessToken),
      hasPublicKey: Boolean(config.mercadoPago.publicKey),
      environment: config.mercadoPago.environment,
    });
    return paymentResponse(
      { error: "Pagamento temporariamente indisponível" },
      503,
      requestId,
    );
  }

  try {
    const payment = await getOrderBrickPayment(
      parsedId.data,
      await getOrderAccess(parsedId.data),
    );
    return NextResponse.json(payment);
  } catch (error) {
    return handlePaymentError(error, {
      requestId,
      operation: "get",
      orderReference: parsedId.data.slice(0, 8),
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: OrderPaymentRouteProps,
) {
  const requestId = randomUUID();
  const parsedId = paymentOrderIdSchema.safeParse((await params).id);
  if (!parsedId.success) {
    return paymentResponse({ error: "Pedido inválido" }, 400, requestId);
  }
  if (!isMercadoPagoBrickConfigurado) {
    console.error("Mercado Pago payment configuration missing", {
      requestId,
      operation: "create",
      orderReference: parsedId.data.slice(0, 8),
      hasAccessToken: Boolean(config.mercadoPago.accessToken),
      hasPublicKey: Boolean(config.mercadoPago.publicKey),
      environment: config.mercadoPago.environment,
    });
    return paymentResponse(
      { error: "Pagamento temporariamente indisponível" },
      503,
      requestId,
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = brickPaymentSchema.safeParse(body);
  if (!parsedBody.success) {
    console.warn("Mercado Pago payment payload rejected", {
      requestId,
      orderReference: parsedId.data.slice(0, 8),
      issues: parsedBody.error.issues.map((issue) => ({
        path: issue.path.join("."),
        code: issue.code,
        message: issue.message,
      })),
    });
    return paymentResponse(
      { error: parsedBody.error.issues[0]?.message ?? "Pagamento inválido" },
      400,
      requestId,
    );
  }

  try {
    const payment = await processOrderBrickPayment(
      parsedId.data,
      await getOrderAccess(parsedId.data),
      parsedBody.data,
      config.nodeEnv === "production"
        ? "https://www.ecomzero.com.br"
        : request.nextUrl.origin,
    );
    return NextResponse.json(payment);
  } catch (error) {
    return handlePaymentError(error, {
      requestId,
      operation: "create",
      orderReference: parsedId.data.slice(0, 8),
      paymentMethod: parsedBody.data.formData.payment_method_id,
    });
  }
}
