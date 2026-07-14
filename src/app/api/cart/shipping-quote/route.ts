import { NextResponse, type NextRequest } from "next/server";
import { isMelhorEnvioConfigurado } from "@/lib/config";
import { getCartSessionId } from "@/lib/session";
import { getCart } from "@/lib/services/cartService";
import {
  calculateCartShipping,
  isShippingRateLimited,
  saveCheckoutShippingQuote,
  ShippingServiceError,
} from "@/lib/services/shippingService";
import { cartShippingQuoteSchema } from "@/lib/validation/shipping";

export async function POST(request: NextRequest) {
  if (!isMelhorEnvioConfigurado) {
    return NextResponse.json(
      { error: "Cálculo de frete não configurado neste ambiente" },
      { status: 503 },
    );
  }

  try {
    const ip = request.headers.get("x-forwarded-for") ?? "desconhecido";
    if (await isShippingRateLimited(ip)) {
      return NextResponse.json(
        { error: "Muitas requisições — tente novamente em instantes" },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = cartShippingQuoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const sessionId = await getCartSessionId();
    if (!sessionId) {
      return NextResponse.json(
        { error: "Carrinho vazio ou não encontrado" },
        { status: 422 },
      );
    }

    const cart = await getCart(sessionId);
    if (!cart.id || cart.items.length === 0) {
      return NextResponse.json(
        { error: "Carrinho vazio ou não encontrado" },
        { status: 422 },
      );
    }

    const options = await calculateCartShipping(cart.id, parsed.data.cep);
    const quote = await saveCheckoutShippingQuote(
      cart.id,
      parsed.data.cep,
      options,
    );

    return NextResponse.json({
      quoteId: quote.id,
      expiresAt: quote.expiresAt,
      options,
    });
  } catch (error) {
    if (error instanceof ShippingServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Erro inesperado ao calcular frete" },
      { status: 502 },
    );
  }
}
