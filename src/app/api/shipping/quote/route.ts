import { NextResponse, type NextRequest } from "next/server";
import { isMelhorEnvioConfigurado } from "@/lib/config";
import { shippingQuoteSchema } from "@/lib/validation/shipping";
import {
  calculateShipping,
  getCachedShippingQuote,
  isShippingRateLimited,
  setCachedShippingQuote,
  ShippingServiceError,
} from "@/lib/services/shippingService";

// Rota "burra": config-check → rate limit → valida com Zod → cache → chama o
// service → devolve resposta. MVP com UI simples (ver ShippingCalculator na
// página de produto). Cache e rate limit em Postgres (shippingService.ts) —
// não em memória, porque a rota roda em funções serverless sem estado
// compartilhado entre instâncias.
export async function POST(request: NextRequest) {
  if (!isMelhorEnvioConfigurado) {
    return NextResponse.json(
      { error: "Cálculo de frete não configurado neste ambiente" },
      { status: 503 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "desconhecido";
  if (await isShippingRateLimited(ip)) {
    return NextResponse.json(
      { error: "Muitas requisições — tente novamente em instantes" },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = shippingQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { variantId, cep, quantidade } = parsed.data;
  // Cache inclui a quantidade: o resultado depende dela (peso × quantidade),
  // então quantidades diferentes NÃO podem colidir na mesma chave.
  const cacheKey = `${variantId}:${cep}:${quantidade}`;
  const cached = await getCachedShippingQuote(cacheKey);
  if (cached) {
    return NextResponse.json({ options: cached });
  }

  try {
    const options = await calculateShipping(variantId, cep, quantidade);
    await setCachedShippingQuote(cacheKey, options);
    return NextResponse.json({ options });
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
