import { prisma } from "@/lib/db";
import type { CouponInput } from "@/lib/validation/coupon";

export type CouponListItem = {
  id: string;
  codigo: string;
  descricao: string | null;
  tipo: "percentual" | "valor_fixo" | "frete_gratis";
  valor: number | null;
  valorMinimoPedido: number | null;
  descontoMaximo: number | null;
  limiteUsoTotal: number | null;
  limiteUsoPorCliente: number;
  usos: number;
  aplicaEm: "toda_loja" | "categoria" | "produto";
  categoriaId: string | null;
  produtoId: string | null;
  combinavel: boolean;
  exibirNoSite: boolean;
  primeiraCompra: boolean;
  inicioEm: string | null;
  expiraEm: string | null;
  ativo: boolean;
};

export class CouponAdminError extends Error {}

export async function listCoupons(): Promise<CouponListItem[]> {
  const coupons = await prisma.coupon.findMany({ orderBy: [{ ativo: "desc" }, { createdAt: "desc" }] });
  return coupons.map((coupon) => ({
    id: coupon.id,
    codigo: coupon.codigo,
    descricao: coupon.descricao,
    tipo: coupon.tipo,
    valor: coupon.valor === null ? null : Number(coupon.valor),
    valorMinimoPedido: coupon.valorMinimoPedido === null ? null : Number(coupon.valorMinimoPedido),
    descontoMaximo: coupon.descontoMaximo === null ? null : Number(coupon.descontoMaximo),
    limiteUsoTotal: coupon.limiteUsoTotal,
    limiteUsoPorCliente: coupon.limiteUsoPorCliente,
    usos: coupon.usos,
    aplicaEm: coupon.aplicaEm,
    categoriaId: coupon.categoriaId,
    produtoId: coupon.produtoId,
    combinavel: coupon.combinavel,
    exibirNoSite: coupon.exibirNoSite,
    primeiraCompra: coupon.primeiraCompra,
    inicioEm: coupon.inicioEm?.toISOString() ?? null,
    expiraEm: coupon.expiraEm?.toISOString() ?? null,
    ativo: coupon.ativo,
  }));
}

export async function getCoupon(id: string): Promise<CouponListItem | null> {
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) return null;
  return {
    id: coupon.id,
    codigo: coupon.codigo,
    descricao: coupon.descricao,
    tipo: coupon.tipo,
    valor: coupon.valor === null ? null : Number(coupon.valor),
    valorMinimoPedido: coupon.valorMinimoPedido === null ? null : Number(coupon.valorMinimoPedido),
    descontoMaximo: coupon.descontoMaximo === null ? null : Number(coupon.descontoMaximo),
    limiteUsoTotal: coupon.limiteUsoTotal,
    limiteUsoPorCliente: coupon.limiteUsoPorCliente,
    usos: coupon.usos,
    aplicaEm: coupon.aplicaEm,
    categoriaId: coupon.categoriaId,
    produtoId: coupon.produtoId,
    combinavel: coupon.combinavel,
    exibirNoSite: coupon.exibirNoSite,
    primeiraCompra: coupon.primeiraCompra,
    inicioEm: coupon.inicioEm?.toISOString() ?? null,
    expiraEm: coupon.expiraEm?.toISOString() ?? null,
    ativo: coupon.ativo,
  };
}

async function ensureUniqueCode(codigo: string, ignoreId?: string) {
  const existing = await prisma.coupon.findUnique({ where: { codigo }, select: { id: true } });
  if (existing && existing.id !== ignoreId) throw new CouponAdminError("Já existe um cupom com esse código.");
}

const dataFromInput = (input: CouponInput) => {
  const isFreeShipping = input.tipo === "frete_gratis";
  const isPercentage = input.tipo === "percentual";
  return {
    codigo: input.codigo,
    descricao: input.descricao || null,
    tipo: input.tipo,
    // frete grátis não tem valor de desconto; percentual/valor_fixo têm.
    valor: isFreeShipping ? null : input.valor ?? null,
    valorMinimoPedido: input.valorMinimoPedido ?? null,
    // teto de desconto só faz sentido para percentual.
    descontoMaximo: isPercentage ? input.descontoMaximo ?? null : null,
    limiteUsoTotal: input.limiteUsoTotal ?? null,
    limiteUsoPorCliente: input.limiteUsoPorCliente,
    aplicaEm: input.aplicaEm,
    categoriaId: input.aplicaEm === "categoria" ? input.categoriaId ?? null : null,
    produtoId: input.aplicaEm === "produto" ? input.produtoId ?? null : null,
    combinavel: input.combinavel,
    exibirNoSite: input.exibirNoSite,
    primeiraCompra: input.primeiraCompra,
    inicioEm: input.inicioEm ?? null,
    expiraEm: input.expiraEm ?? null,
    ativo: input.ativo,
  };
};

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
