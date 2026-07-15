import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  getCartSessionId,
  rotateCartSessionId,
  setCheckoutOrderAccess,
} from "@/lib/session";
import {
  CheckoutServiceError,
  createOrderFromCart,
} from "@/lib/services/checkoutService";
import { checkoutSchema } from "@/lib/validation/checkout";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const sessionId = await getCartSessionId();
    if (!sessionId) {
      return NextResponse.json(
        { error: "Carrinho vazio ou não encontrado" },
        { status: 422 },
      );
    }

    const session = await auth();
    const order = await createOrderFromCart(
      sessionId,
      parsed.data,
      session?.user?.id ?? null,
    );
    await setCheckoutOrderAccess(order.orderId);
    await rotateCartSessionId();
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof CheckoutServiceError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    return NextResponse.json(
      { error: "Erro inesperado ao criar pedido" },
      { status: 500 },
    );
  }
}
