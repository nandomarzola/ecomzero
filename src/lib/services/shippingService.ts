import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import {
  MelhorEnvioServiceError,
  melhorEnvioRequest,
} from "@/lib/services/melhorEnvioService";

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

// IDs de serviços do Melhor Envio a cotar. SEM este parâmetro, a conta só
// devolve Correios no /calculate — Jadlog/Loggi/J&T ficam de fora do padrão
// (não é peso/dimensão nem ativação: comprovado que passando `services` elas
// cotam normalmente). Lista: Correios PAC(1)/SEDEX(2)/Mini Envios(17),
// Jadlog .Package(3)/.Com(4)/.Package Centralizado(27), Loggi Express(31)/
// Coleta(32), J&T Standard(33). IDs indisponíveis/sem atendimento são
// filtrados na resposta (vêm com `error`).
const MELHOR_ENVIO_SERVICES = "1,2,3,4,17,27,31,32,33";

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
  const { cepOrigem } = config.melhorEnvio;

  if (!cepOrigem) {
    throw new ShippingServiceError(
      "Cálculo de frete não configurado neste ambiente",
      503,
    );
  }

  let data: unknown;
  try {
    data = await melhorEnvioRequest("/api/v2/me/shipment/calculate", {
      method: "POST",
      body: {
        from: { postal_code: cepOrigem },
        to: { postal_code: cepDestino },
        package: shippingPackage,
        services: MELHOR_ENVIO_SERVICES,
      },
      timeoutMs: 8_000,
    });
  } catch (error) {
    if (error instanceof MelhorEnvioServiceError && error.status === 503) {
      throw new ShippingServiceError(
        "Cálculo de frete não configurado neste ambiente",
        503,
      );
    }
    throw new ShippingServiceError(
      "Serviço de frete indisponível no momento",
      502,
    );
  }

  if (!Array.isArray(data)) {
    throw new ShippingServiceError(
      "Serviço de frete indisponível no momento",
      502,
    );
  }

  const options = (data as MelhorEnvioQuote[])
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

  // O Melhor Envio pode devolver vários serviços da MESMA transportadora (ex.:
  // Jadlog .Package, .Com e .Package Centralizado). Enviamos todos os IDs em
  // `services` de propósito (maior chance de a API cotar), mas para o cliente
  // mantemos só a opção mais barata de cada transportadora — no máximo 1 linha
  // por transportadora — ordenadas da mais barata para a mais cara.
  const cheapestByCarrier = new Map<string, (typeof options)[number]>();
  for (const option of options) {
    const current = cheapestByCarrier.get(option.transportadora);
    if (!current || option.preco < current.preco) {
      cheapestByCarrier.set(option.transportadora, option);
    }
  }

  return [...cheapestByCarrier.values()].sort((a, b) => a.preco - b.preco);
}

export async function calculateShipping(
  variantId: string,
  cepDestino: string,
  quantidade = 1,
): Promise<ShippingOption[]> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
  });

  if (!variant) {
    throw new ShippingServiceError("Variante não encontrada", 422);
  }

  // Mesma simplificação do carrinho: peso = pesoKg × quantidade; as dimensões
  // seguem as da embalagem única (aproximação de empacotamento do MVP, sem
  // bin-packing). O arredondamento evita ruído de ponto flutuante.
  return requestShippingQuote(cepDestino, {
    height: variant.alturaCm,
    width: variant.larguraCm,
    length: variant.comprimentoCm,
    weight: Math.round(variant.pesoKg * quantidade * 1000) / 1000,
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
