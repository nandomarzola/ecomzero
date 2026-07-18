import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

// Validação e cálculo de cupom da loja. ÚNICA camada que toca Prisma para cupom
// no carrinho/checkout. Duas etapas de validação:
//   - `validateForCart`: tudo que NÃO depende da identidade do cliente (o
//     carrinho é anônimo). Usada ao aplicar o cupom no carrinho — é um preview.
//   - `validateForCheckout`: validação AUTORITATIVA no momento do checkout, com
//     identidade (limite por cliente, primeira compra). É o que decide o valor
//     realmente cobrado, então roda dentro da transação de criação do pedido.

export type CouponErrorCode =
  | "NOT_FOUND"
  | "INACTIVE"
  | "NOT_STARTED"
  | "EXPIRED"
  | "MIN_ORDER"
  | "NOT_APPLICABLE"
  | "TOTAL_LIMIT"
  | "CUSTOMER_LIMIT"
  | "FIRST_PURCHASE_ONLY";

export class CouponError extends Error {
  constructor(
    message: string,
    public readonly code: CouponErrorCode,
  ) {
    super(message);
    this.name = "CouponError";
  }
}

type CouponRow = Prisma.CouponGetPayload<object>;
type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

export type CouponCartLine = {
  productId: string;
  categoryId: string | null;
  quantity: number;
  unitPrice: number;
};

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const round2 = (value: number) => Math.round(value * 100) / 100;

export type AppliedCoupon = {
  couponId: string;
  code: string;
  tipo: "percentual" | "valor_fixo" | "frete_gratis";
  /** desconto sobre os PRODUTOS (0 para frete_gratis) */
  productDiscount: number;
  /** true quando o cupom zera o frete */
  freeShipping: boolean;
};

export type CheckoutDiscount = {
  couponId: string;
  code: string;
  /** desconto total salvo no pedido = desconto de produtos + frete zerado (se houver) */
  descontoCupom: number;
  freeShipping: boolean;
};

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function customerKeyFrom(userId: string | null, email: string | null): string {
  return (userId ?? email?.trim().toLowerCase() ?? "").trim();
}

async function findCoupon(db: PrismaClientLike, code: string): Promise<CouponRow | null> {
  return db.coupon.findUnique({ where: { codigo: normalizeCode(code) } });
}

// Checa validade independente de identidade (a–d da spec).
function assertUsableNow(coupon: CouponRow, subtotal: number): void {
  if (!coupon.ativo) throw new CouponError("Este cupom não está ativo.", "INACTIVE");

  const now = new Date();
  if (coupon.inicioEm && now < coupon.inicioEm) {
    throw new CouponError("Este cupom ainda não está válido.", "NOT_STARTED");
  }
  if (coupon.expiraEm && now > coupon.expiraEm) {
    throw new CouponError("Este cupom expirou.", "EXPIRED");
  }
  if (coupon.valorMinimoPedido && subtotal < Number(coupon.valorMinimoPedido)) {
    throw new CouponError(
      `Pedido mínimo de ${money(Number(coupon.valorMinimoPedido))} não atingido.`,
      "MIN_ORDER",
    );
  }
  if (coupon.limiteUsoTotal !== null && coupon.usos >= coupon.limiteUsoTotal) {
    throw new CouponError("Este cupom atingiu o limite total de usos.", "TOTAL_LIMIT");
  }
}

// Cálculo do desconto. `shippingCost` só importa para frete_gratis.
export function computeDiscount(
  coupon: CouponRow,
  eligibleSubtotal: number,
  shippingCost: number,
): { productDiscount: number; shippingDiscount: number; freeShipping: boolean } {
  if (coupon.tipo === "frete_gratis") {
    return { productDiscount: 0, shippingDiscount: round2(Math.max(0, shippingCost)), freeShipping: true };
  }

  const valor = Number(coupon.valor ?? 0);
  let discount =
    coupon.tipo === "percentual" ? (eligibleSubtotal * valor) / 100 : valor;

  // Teto de desconto (só percentual, mas aplicamos defensivamente se existir).
  if (coupon.descontoMaximo !== null) {
    discount = Math.min(discount, Number(coupon.descontoMaximo));
  }
  // Nunca descontar mais que o valor dos produtos.
  discount = Math.min(discount, eligibleSubtotal);
  return { productDiscount: round2(Math.max(0, discount)), shippingDiscount: 0, freeShipping: false };
}

const subtotalFromLines = (lines: CouponCartLine[]) => round2(
  lines.reduce((total, line) => total + line.unitPrice * line.quantity, 0),
);

async function eligibleSubtotalForCoupon(
  db: PrismaClientLike,
  coupon: CouponRow,
  lines: CouponCartLine[],
): Promise<number> {
  if (coupon.aplicaEm === "toda_loja") return subtotalFromLines(lines);

  if (coupon.aplicaEm === "produto") {
    return round2(lines
      .filter((line) => line.productId === coupon.produtoId)
      .reduce((total, line) => total + line.unitPrice * line.quantity, 0));
  }

  if (!coupon.categoriaId) return 0;
  const categories = await db.category.findMany({ select: { id: true, parentId: true } });
  const eligibleIds = new Set([coupon.categoriaId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) {
      if (category.parentId && eligibleIds.has(category.parentId) && !eligibleIds.has(category.id)) {
        eligibleIds.add(category.id);
        changed = true;
      }
    }
  }
  return round2(lines
    .filter((line) => line.categoryId && eligibleIds.has(line.categoryId))
    .reduce((total, line) => total + line.unitPrice * line.quantity, 0));
}

function assertApplicable(coupon: CouponRow, eligibleSubtotal: number): void {
  if (coupon.aplicaEm !== "toda_loja" && eligibleSubtotal <= 0) {
    throw new CouponError("Este cupom não se aplica aos produtos do carrinho.", "NOT_APPLICABLE");
  }
}

// ── Carrinho (preview, sem identidade) ──────────────────────────────────────
export async function validateForCart(code: string, lines: CouponCartLine[]): Promise<AppliedCoupon> {
  const coupon = await findCoupon(prisma, code);
  if (!coupon) throw new CouponError("Cupom não encontrado.", "NOT_FOUND");
  const subtotal = subtotalFromLines(lines);
  assertUsableNow(coupon, subtotal);
  const eligibleSubtotal = await eligibleSubtotalForCoupon(prisma, coupon, lines);
  assertApplicable(coupon, eligibleSubtotal);
  const { productDiscount, freeShipping } = computeDiscount(coupon, eligibleSubtotal, 0);
  return { couponId: coupon.id, code: coupon.codigo, tipo: coupon.tipo, productDiscount, freeShipping };
}

// Revalida um cupom JÁ aplicado quando o carrinho muda. Retorna null se ele
// deixou de ser válido (ex.: subtotal caiu abaixo do mínimo) — o carrinho então
// remove o cupom silenciosamente.
export async function revalidateAppliedCoupon(
  couponId: string,
  lines: CouponCartLine[],
): Promise<AppliedCoupon | null> {
  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon) return null;
  try {
    const subtotal = subtotalFromLines(lines);
    assertUsableNow(coupon, subtotal);
    const eligibleSubtotal = await eligibleSubtotalForCoupon(prisma, coupon, lines);
    assertApplicable(coupon, eligibleSubtotal);
    const { productDiscount, freeShipping } = computeDiscount(coupon, eligibleSubtotal, 0);
    return { couponId: coupon.id, code: coupon.codigo, tipo: coupon.tipo, productDiscount, freeShipping };
  } catch {
    return null;
  }
}

async function assertCustomerEligibility(
  db: PrismaClientLike,
  coupon: CouponRow,
  params: { orderId: string; userId: string | null; email: string | null },
): Promise<void> {
  // Conta PEDIDOS em voo (aguardando_pagamento) + pagos, não só redemptions
  // (que só existem após o pagamento). Fecha a janela em que o cliente cria
  // vários pedidos com o cupom antes de pagar qualquer um. Rodando na transação
  // Serializable do checkout, o SSI do Postgres serializa checkouts concorrentes.
  const customerOr: Prisma.OrderWhereInput[] = [];
  if (params.userId) customerOr.push({ userId: params.userId });
  if (params.email) customerOr.push({ emailCliente: params.email.trim().toLowerCase() });
  if (customerOr.length > 0) {
    const used = await db.order.count({
      where: {
        couponId: coupon.id,
        id: { not: params.orderId },
        status: { in: ["aguardando_pagamento", "pago"] },
        OR: customerOr,
      },
    });
    if (used >= coupon.limiteUsoPorCliente) {
      throw new CouponError("Você já atingiu o limite de uso deste cupom.", "CUSTOMER_LIMIT");
    }
  }

  if (coupon.primeiraCompra) {
    const priorPaidWhere: Prisma.OrderWhereInput[] = [];
    if (params.userId) priorPaidWhere.push({ userId: params.userId });
    if (params.email) priorPaidWhere.push({ emailCliente: params.email.trim().toLowerCase() });
    if (priorPaidWhere.length > 0) {
      const priorPaid = await db.order.count({
        where: { status: "pago", id: { not: params.orderId }, OR: priorPaidWhere },
      });
      if (priorPaid > 0) {
        throw new CouponError("Oferta exclusiva para a primeira compra.", "FIRST_PURCHASE_ONLY");
      }
    }
  }
}

export async function validateForAutomaticCampaign(
  code: string,
  params: {
    orderId: string;
    lines: CouponCartLine[];
    userId: string | null;
    email: string | null;
  },
): Promise<AppliedCoupon | null> {
  const coupon = await findCoupon(prisma, code);
  if (!coupon) return null;

  const subtotal = subtotalFromLines(params.lines);
  assertUsableNow(coupon, subtotal);
  const eligibleSubtotal = await eligibleSubtotalForCoupon(prisma, coupon, params.lines);
  assertApplicable(coupon, eligibleSubtotal);
  await assertCustomerEligibility(prisma, coupon, params);
  const { productDiscount, freeShipping } = computeDiscount(coupon, eligibleSubtotal, 0);
  return { couponId: coupon.id, code: coupon.codigo, tipo: coupon.tipo, productDiscount, freeShipping };
}

// ── Checkout (autoritativo, com identidade) ─────────────────────────────────
// Roda dentro da transação de criação do pedido (recebe o `tx`).
export async function validateForCheckout(
  db: PrismaClientLike,
  params: {
    couponId: string;
    orderId: string;
    subtotal: number;
    lines: CouponCartLine[];
    shippingCost: number;
    userId: string | null;
    email: string | null;
  },
): Promise<CheckoutDiscount> {
  const coupon = await db.coupon.findUnique({ where: { id: params.couponId } });
  if (!coupon) throw new CouponError("Cupom não encontrado.", "NOT_FOUND");

  assertUsableNow(coupon, params.subtotal);
  const eligibleSubtotal = await eligibleSubtotalForCoupon(db, coupon, params.lines);
  assertApplicable(coupon, eligibleSubtotal);

  await assertCustomerEligibility(db, coupon, params);

  // Limite total autoritativo: conta pedidos em voo + pagos (não `coupon.usos`,
  // que só incrementa na confirmação do pagamento e deixa janela de corrida).
  if (coupon.limiteUsoTotal !== null) {
    const totalUsed = await db.order.count({
      where: {
        couponId: coupon.id,
        id: { not: params.orderId },
        status: { in: ["aguardando_pagamento", "pago"] },
      },
    });
    if (totalUsed >= coupon.limiteUsoTotal) {
      throw new CouponError("Este cupom atingiu o limite total de usos.", "TOTAL_LIMIT");
    }
  }

  const { productDiscount, shippingDiscount, freeShipping } = computeDiscount(
    coupon,
    eligibleSubtotal,
    params.shippingCost,
  );
  return {
    couponId: coupon.id,
    code: coupon.codigo,
    descontoCupom: round2(productDiscount + shippingDiscount),
    freeShipping,
  };
}

// ── Registro de uso (na confirmação do pagamento) ───────────────────────────
// Idempotente: CouponRedemption.orderId é único. Só incrementa `usos` quando
// cria a redemption (primeira vez). Deve rodar dentro da transação que marca o
// pedido como pago.
export async function recordCouponUsage(
  db: PrismaClientLike,
  params: {
    couponId: string;
    orderId: string;
    userId: string | null;
    email: string | null;
    valorDesconto: number;
  },
): Promise<void> {
  const existing = await db.couponRedemption.findUnique({ where: { orderId: params.orderId } });
  if (existing) return; // já registrado (webhook reentrante) — não incrementa de novo.

  await db.couponRedemption.create({
    data: {
      couponId: params.couponId,
      orderId: params.orderId,
      userId: params.userId,
      customerKey: customerKeyFrom(params.userId, params.email),
      valorDesconto: new Prisma.Decimal(params.valorDesconto),
    },
  });
  await db.coupon.update({
    where: { id: params.couponId },
    data: { usos: { increment: 1 } },
  });
}
