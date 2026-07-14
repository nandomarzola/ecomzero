import { prisma } from "@/lib/db";
import { config, isMelhorEnvioProducao } from "@/lib/config";
import { getValidAccessToken, MelhorEnvioAuthError } from "./melhorEnvioAuthService";

// Única camada que toca o Prisma para frete — API routes nunca importam
// @/lib/db ou @/generated/prisma diretamente.

export type ShippingOption = {
  id: string;
  transportadora: string;
  servico: string;
  preco: number;
  prazoDias: number;
};

export class ShippingServiceError extends Error {
  status: 503 | 422 | 502;

  constructor(message: string, status: 503 | 422 | 502) {
    super(message);
    this.name = "ShippingServiceError";
    this.status = status;
  }
}

type MelhorEnvioQuote = {
  id: number;
  name: string;
  price?: string;
  delivery_time?: number;
  error?: string;
  company?: { name?: string };
};

type ShippingPackage = {
  height: number;
  width: number;
  length: number;
  weight: number;
};

// Cache (10 min) e rate limit (20 req/min por identificador) da rota
// POST /api/shipping/quote — em Postgres, não em memória, porque a rota
// roda em funções serverless sem estado compartilhado entre instâncias.
const CACHE_TTL_MS = 10 * 60 * 1000;
const CART_QUOTE_TTL_MS = 15 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;

export async function getCachedShippingQuote(
  cacheKey: string,
): Promise<ShippingOption[] | null> {
  const record = await prisma.shippingQuoteCache.findUnique({ where: { cacheKey } });
  if (!record || record.expiresAt < new Date()) return null;
  return record.options as unknown as ShippingOption[];
}

export async function setCachedShippingQuote(
  cacheKey: string,
  options: ShippingOption[],
): Promise<void> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS);
  await prisma.shippingQuoteCache.upsert({
    where: { cacheKey },
    create: { cacheKey, options, expiresAt },
    update: { options, expiresAt },
  });
}

// true = bloqueado. Janela fixa: reseta a contagem quando a janela anterior
// expira, em vez de janela deslizante — suficiente pra esse volume de MVP.
export async function isShippingRateLimited(identifier: string): Promise<boolean> {
  const now = new Date();
  const existing = await prisma.shippingRateLimit.findUnique({ where: { identifier } });

  if (!existing || now.getTime() - existing.windowStart.getTime() > RATE_LIMIT_WINDOW_MS) {
    await prisma.shippingRateLimit.upsert({
      where: { identifier },
      create: { identifier, count: 1, windowStart: now },
      update: { count: 1, windowStart: now },
    });
    return false;
  }

  const updated = await prisma.shippingRateLimit.update({
    where: { identifier },
    data: { count: { increment: 1 } },
  });

  return updated.count > RATE_LIMIT_MAX_REQUESTS;
}

async function requestShippingQuote(
  cepDestino: string,
  shippingPackage: ShippingPackage,
): Promise<ShippingOption[]> {
  const { token, baseUrl, cepOrigem } = config.melhorEnvio;

  if (!cepOrigem) {
    throw new ShippingServiceError(
      "Cálculo de frete não configurado neste ambiente",
      503,
    );
  }

  // Produção usa OAuth com refresh automático (token vem do banco); sandbox/dev
  // continua no token fixo da env var. Ver melhorEnvioAuthService.
  let authToken: string;
  if (isMelhorEnvioProducao) {
    try {
      authToken = await getValidAccessToken();
    } catch (error) {
      if (error instanceof MelhorEnvioAuthError) {
        throw new ShippingServiceError(
          "Cálculo de frete não configurado neste ambiente",
          503,
        );
      }
      throw error;
    }
  } else {
    if (!token) {
      throw new ShippingServiceError(
        "Cálculo de frete não configurado neste ambiente",
        503,
      );
    }
    authToken = token;
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "ecomzero (contato@ecomzero.com.br)",
      },
      body: JSON.stringify({
        from: { postal_code: cepOrigem },
        to: { postal_code: cepDestino },
        package: shippingPackage,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new ShippingServiceError(
      "Serviço de frete indisponível no momento",
      502,
    );
  }

  if (!response.ok) {
    throw new ShippingServiceError(
      "Serviço de frete indisponível no momento",
      502,
    );
  }

  const data = (await response.json().catch(() => null)) as MelhorEnvioQuote[] | null;
  if (!Array.isArray(data)) {
    throw new ShippingServiceError(
      "Serviço de frete indisponível no momento",
      502,
    );
  }

  const options = data
    .filter((quote) => !quote.error && quote.price && quote.delivery_time != null)
    .map((quote) => ({
      id: String(quote.id),
      transportadora: quote.company?.name ?? "Transportadora",
      servico: quote.name,
      preco: Number(quote.price),
      prazoDias: Number(quote.delivery_time),
    }));

  if (options.length === 0) {
    throw new ShippingServiceError("CEP não atendido para este produto", 422);
  }

  return options;
}

export async function calculateShipping(
  variantId: string,
  cepDestino: string,
): Promise<ShippingOption[]> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
  });

  if (!variant) {
    throw new ShippingServiceError("Variante não encontrada", 422);
  }

  return requestShippingQuote(cepDestino, {
    height: variant.alturaCm,
    width: variant.larguraCm,
    length: variant.comprimentoCm,
    weight: variant.pesoKg,
  });
}

export async function calculateCartShipping(
  orderId: string,
  cepDestino: string,
): Promise<ShippingOption[]> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, status: "draft" },
    include: { items: { include: { variant: true } } },
  });

  if (!order || order.items.length === 0) {
    throw new ShippingServiceError("Carrinho vazio ou não encontrado", 422);
  }

  const weight = order.items.reduce(
    (total, item) => total + item.variant.pesoKg * item.quantidade,
    0,
  );

  // Aproximação de empacotamento do MVP: soma o peso de todas as unidades,
  // mas usa a maior dimensão encontrada em cada eixo, sem fazer bin-packing.
  const shippingPackage: ShippingPackage = {
    height: Math.max(...order.items.map((item) => item.variant.alturaCm)),
    width: Math.max(...order.items.map((item) => item.variant.larguraCm)),
    length: Math.max(...order.items.map((item) => item.variant.comprimentoCm)),
    weight: Math.round(weight * 1000) / 1000,
  };

  return requestShippingQuote(cepDestino, shippingPackage);
}

export async function saveCheckoutShippingQuote(
  orderId: string,
  cep: string,
  options: ShippingOption[],
): Promise<{ id: string; expiresAt: Date }> {
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + CART_QUOTE_TTL_MS);

  return prisma.checkoutShippingQuote.upsert({
    where: { orderId },
    create: { orderId, cep, options, createdAt, expiresAt },
    update: { cep, options, createdAt, expiresAt },
    select: { id: true, expiresAt: true },
  });
}
