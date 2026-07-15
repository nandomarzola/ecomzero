import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { config, isMercadoPagoConfigurado } from "@/lib/config";
import { hasCheckoutOrderAccess } from "@/lib/session";
import { MercadoPagoServiceError } from "@/lib/services/mercadoPagoService";
import {
  getOrCreateOrderPaymentPreference,
  OrderPaymentServiceError,
} from "@/lib/services/orderPaymentService";
import { paymentOrderIdSchema } from "@/lib/validation/payment";

type PaymentPreferenceRouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: NextRequest,
  { params }: PaymentPreferenceRouteProps,
) {
  const parsedId = paymentOrderIdSchema.safeParse((await params).id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  if (!isMercadoPagoConfigurado) {
    return NextResponse.json(
      { error: "Pagamento temporariamente indisponível" },
      { status: 503 },
    );
  }

  try {
    const [session, hasGuestAccess] = await Promise.all([
      auth(),
      hasCheckoutOrderAccess(parsedId.data),
    ]);
    const preference = await getOrCreateOrderPaymentPreference(
      parsedId.data,
      {
        userId: session?.user?.id ?? null,
        hasGuestAccess,
      },
      config.nodeEnv === "production"
        ? "https://www.ecomzero.com.br"
        : request.nextUrl.origin,
    );

    return NextResponse.json({
      preferenceId: preference.preferenceId,
      initPoint: preference.initPoint,
      expiresAt: preference.expiresAt,
      reused: preference.reused,
    });
  } catch (error) {
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

    return NextResponse.json(
      { error: "Erro inesperado ao iniciar pagamento" },
      { status: 500 },
    );
  }
}
