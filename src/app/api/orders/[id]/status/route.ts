import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasCheckoutOrderAccess } from "@/lib/session";
import {
  getOrderPaymentStatus,
  OrderPaymentServiceError,
} from "@/lib/services/orderPaymentService";
import { paymentOrderIdSchema } from "@/lib/validation/payment";

type OrderStatusRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: OrderStatusRouteProps,
) {
  const parsedId = paymentOrderIdSchema.safeParse((await params).id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  try {
    const [session, hasGuestAccess] = await Promise.all([
      auth(),
      hasCheckoutOrderAccess(parsedId.data),
    ]);
    const order = await getOrderPaymentStatus(parsedId.data, {
      userId: session?.user?.id ?? null,
      hasGuestAccess,
    });
    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof OrderPaymentServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Erro inesperado ao consultar pedido" },
      { status: 500 },
    );
  }
}
