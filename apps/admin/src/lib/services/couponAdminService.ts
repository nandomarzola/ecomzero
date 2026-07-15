import { prisma } from "@/lib/db";
import type { CouponInput } from "@/lib/validation/coupon";

export type CouponListItem = {
  id: string;
  codigo: string;
  descricao: string | null;
  tipo: "percentual" | "valor_fixo";
  valor: number;
  valorMinimoPedido: number | null;
  descontoMaximo: number | null;
  limiteUsoTotal: number | null;
  limiteUsoPorCliente: number;
  usos: number;
  inicioEm: string | null;
  expiraEm: string | null;
  ativo: boolean;
};

export class CouponAdminError extends Error {}

export async function listCoupons(): Promise<CouponListItem[]> {
  const coupons = await prisma.coupon.findMany({ orderBy: [{ ativo: "desc" }, { createdAt: "desc" }] });
  return coupons.map((coupon) => ({
    ...coupon,
    tipo: coupon.tipo,
    valor: Number(coupon.valor),
    valorMinimoPedido: coupon.valorMinimoPedido === null ? null : Number(coupon.valorMinimoPedido),
    descontoMaximo: coupon.descontoMaximo === null ? null : Number(coupon.descontoMaximo),
    inicioEm: coupon.inicioEm?.toISOString() ?? null,
    expiraEm: coupon.expiraEm?.toISOString() ?? null,
  }));
}

async function ensureUniqueCode(codigo: string, ignoreId?: string) {
  const existing = await prisma.coupon.findUnique({ where: { codigo }, select: { id: true } });
  if (existing && existing.id !== ignoreId) throw new CouponAdminError("Já existe um cupom com esse código.");
}

const dataFromInput = (input: CouponInput) => ({
  codigo: input.codigo,
  descricao: input.descricao || null,
  tipo: input.tipo,
  valor: input.valor,
  valorMinimoPedido: input.valorMinimoPedido ?? null,
  descontoMaximo: input.tipo === "percentual" ? input.descontoMaximo ?? null : null,
  limiteUsoTotal: input.limiteUsoTotal ?? null,
  limiteUsoPorCliente: input.limiteUsoPorCliente,
  inicioEm: input.inicioEm ?? null,
  expiraEm: input.expiraEm ?? null,
  ativo: input.ativo,
});

export async function createCoupon(input: CouponInput) {
  await ensureUniqueCode(input.codigo);
  return prisma.coupon.create({ data: dataFromInput(input), select: { id: true } });
}

export async function updateCoupon(id: string, input: CouponInput) {
  const existing = await prisma.coupon.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new CouponAdminError("Cupom não encontrado.");
  await ensureUniqueCode(input.codigo, id);
  return prisma.coupon.update({ where: { id }, data: dataFromInput(input), select: { id: true } });
}

export async function deleteCoupon(id: string) {
  const coupon = await prisma.coupon.findUnique({ where: { id }, select: { usos: true } });
  if (!coupon) throw new CouponAdminError("Cupom não encontrado.");
  if (coupon.usos > 0) throw new CouponAdminError("Um cupom já utilizado não pode ser excluído. Desative-o.");
  await prisma.coupon.delete({ where: { id } });
}
