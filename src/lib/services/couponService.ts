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
  subtotal: number,
  shippingCost: number,
): { productDiscount: number; shippingDiscount: number; freeShipping: boolean } {
  if (coupon.tipo === "frete_gratis") {
    return { productDiscount: 0, shippingDiscount: round2(Math.max(0, shippingCost)), freeShipping: true };
  }

  const valor = Number(coupon.valor ?? 0);
  let discount =
    coupon.tipo === "percentual" ? (subtotal * valor) / 100 : valor;

  // Teto de desconto (só percentual, mas aplicamos defensivamente se existir).
  if (coupon.descontoMaximo !== null) {
    discount = Math.min(discount, Number(coupon.descontoMaximo));
  }
  // Nunca descontar mais que o valor dos produtos.
  discount = Math.min(discount, subtotal);
  return { productDiscount: round2(Math.max(0, discount)), shippingDiscount: 0, freeShipping: false };
}

// ── Carrinho (preview, sem identidade) ──────────────────────────────────────
export async function validateForCart(code: string, subtotal: number): Promise<AppliedCoupon> {
  const coupon = await findCoupon(prisma, code);
  if (!coupon) throw new CouponError("Cupom não encontrado.", "NOT_FOUND");
  assertUsableNow(coupon, subtotal);
  const { productDiscount, freeShipping } = computeDiscount(coupon, subtotal, 0);
  return { couponId: coupon.id, code: coupon.codigo, tipo: coupon.tipo, productDiscount, freeShipping };
}

// Revalida um cupom JÁ aplicado quando o carrinho muda. Retorna null se ele
// deixou de ser válido (ex.: subtotal caiu abaixo do mínimo) — o carrinho então
// remove o cupom silenciosamente.
export async function revalidateAppliedCoupon(
  couponId: string,
  subtotal: number,
): Promise<AppliedCoupon | null> {
  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon) return null;
  try {
    assertUsableNow(coupon, subtotal);
  } catch {
    return null;
  }
  const { productDiscount, freeShipping } = computeDiscount(coupon, subtotal, 0);
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
    shippingCost: number;
    userId: string | null;
    email: string | null;
  },
): Promise<CheckoutDiscount> {
  const coupon = await db.coupon.findUnique({ where: { id: params.couponId } });
  if (!coupon) throw new CouponError("Cupom não encontrado.", "NOT_FOUND");

  assertUsableNow(coupon, params.subtotal);

  // (e) limite por cliente — conta redemptions anteriores deste cliente.
  const customerKey = customerKeyFrom(params.userId, params.email);
  const orConditions: Prisma.CouponRedemptionWhereInput[] = [];
  if (params.userId) orConditions.push({ userId: params.userId });
  if (customerKey) orConditions.push({ customerKey });
  if (orConditions.length > 0) {
    const used = await db.couponRedemption.count({
      where: { couponId: coupon.id, orderId: { not: params.orderId }, OR: orConditions },
    });
    if (used >= coupon.limiteUsoPorCliente) {
      throw new CouponError("Você já atingiu o limite de uso deste cupom.", "CUSTOMER_LIMIT");
    }
  }

  // (g) primeira compra — nenhum pedido pago anterior do cliente.
  if (coupon.primeiraCompra) {
    const priorPaidWhere: Prisma.OrderWhereInput[] = [];
    if (params.userId) priorPaidWhere.push({ userId: params.userId });
    if (params.email) priorPaidWhere.push({ emailCliente: params.email.trim().toLowerCase() });
    if (priorPaidWhere.length > 0) {
      const priorPaid = await db.order.count({
        where: { status: "pago", id: { not: params.orderId }, OR: priorPaidWhere },
      });
      if (priorPaid > 0) {
        throw new CouponError("Este cupom é válido apenas para a primeira compra.", "FIRST_PURCHASE_ONLY");
      }
    }
  }

  const { productDiscount, shippingDiscount, freeShipping } = computeDiscount(
    coupon,
    params.subtotal,
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
