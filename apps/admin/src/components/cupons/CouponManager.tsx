"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgePercent, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteCouponAction } from "@/lib/actions/coupon";
import type { CouponListItem } from "@/lib/services/couponAdminService";

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const tipoLabel: Record<CouponListItem["tipo"], string> = {
  percentual: "Percentual",
  valor_fixo: "Valor fixo",
  frete_gratis: "Frete grátis",
};

function discountLabel(coupon: CouponListItem): string {
  if (coupon.tipo === "frete_gratis") return "Frete grátis";
  if (coupon.valor === null) return "—";
  return coupon.tipo === "percentual" ? `${coupon.valor}%` : money(coupon.valor);
}

export default function CouponManager({ coupons }: { coupons: CouponListItem[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function remove(coupon: CouponListItem) {
    if (!window.confirm(`Excluir o cupom ${coupon.codigo}?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCouponAction(coupon.id);
      if (!result.ok) return setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-white/50">{coupons.length} cupom(ns) exclusivo(s) para compras no site.</p>
          <p className="mt-1 text-xs text-white/30">Uso em marketplaces não é contabilizado aqui.</p>
        </div>
        <Link href="/cupons/novo" className="inline-flex items-center gap-2 rounded-lg bg-[#A9EC17] px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-105">
          <Plus className="h-4 w-4" /> Novo cupom
        </Link>
      </div>

      {error ? <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}

      {coupons.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#111111] text-center">
          <BadgePercent className="h-10 w-10 text-white/20" />
          <h2 className="font-display mt-4 font-bold">Nenhum cupom cadastrado</h2>
          <p className="mt-1 text-sm text-white/40">Crie a primeira campanha promocional da loja.</p>
          <Link href="/cupons/novo" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#A9EC17] px-4 py-2.5 text-sm font-semibold text-black">
            <Plus className="h-4 w-4" /> Novo cupom
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#111111]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/[0.08] text-[11px] uppercase text-white/40">
              <tr>
                <th className="px-4 py-3">Cupom</th>
                <th className="px-4 py-3">Desconto</th>
                <th className="px-4 py-3">Uso</th>
                <th className="px-4 py-3">Validade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="border-b border-white/[0.05] last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-mono font-bold text-[#A9EC17]">{coupon.codigo}</p>
                    <p className="text-xs text-white/35">{coupon.descricao ?? tipoLabel[coupon.tipo]}</p>
                  </td>
                  <td className="px-4 py-3 text-white/65">{discountLabel(coupon)}</td>
                  <td className="px-4 py-3 text-white/65">
                    {coupon.usos}/{coupon.limiteUsoTotal ?? "∞"}
                    <p className="text-[11px] text-white/30">{coupon.limiteUsoPorCliente} por cliente</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/55">{coupon.expiraEm ? new Date(coupon.expiraEm).toLocaleString("pt-BR") : "Sem expiração"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${coupon.ativo ? "bg-[#A9EC17]/10 text-[#A9EC17]" : "bg-white/5 text-white/35"}`}>
                      {coupon.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Link href={`/cupons/${coupon.id}/editar`} className="p-2 text-white/45 transition hover:text-white" aria-label={`Editar ${coupon.codigo}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button onClick={() => remove(coupon)} disabled={isPending} className="p-2 text-red-400/60 transition hover:text-red-300 disabled:opacity-50" aria-label={`Excluir ${coupon.codigo}`}>
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
