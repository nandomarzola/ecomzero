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

const handlePaymentError = (error: unknown) => {
  if (error instanceof OrderPaymentServiceError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }
  if (error instanceof MercadoPagoServiceError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }
  if (error instanceof PaymentReconciliationError) {
    return NextResponse.json(
      { error: "O pagamento não corresponde a este pedido" },
      { status: 409 },
    );
  }

  return NextResponse.json(
    { error: "Erro inesperado ao processar pagamento" },
    { status: 500 },
  );
};

export async function GET(
  _request: NextRequest,
  { params }: OrderPaymentRouteProps,
) {
  const parsedId = paymentOrderIdSchema.safeParse((await params).id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }
  if (!isMercadoPagoBrickConfigurado) {
    return NextResponse.json(
      { error: "Pagamento temporariamente indisponível" },
      { status: 503 },
    );
  }

  try {
    const payment = await getOrderBrickPayment(
      parsedId.data,
      await getOrderAccess(parsedId.data),
    );
    return NextResponse.json(payment);
  } catch (error) {
    return handlePaymentError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: OrderPaymentRouteProps,
) {
  const parsedId = paymentOrderIdSchema.safeParse((await params).id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }
  if (!isMercadoPagoBrickConfigurado) {
    return NextResponse.json(
      { error: "Pagamento temporariamente indisponível" },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = brickPaymentSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Pagamento inválido" },
      { status: 400 },
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
    return handlePaymentError(error);
  }
}
