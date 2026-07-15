"use client";

import { useState, useTransition } from "react";
import { BadgePercent, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteCouponAction, saveCouponAction } from "@/lib/actions/coupon";
import type { CouponListItem } from "@/lib/services/couponAdminService";

type Draft = {
  id: string | null; codigo: string; descricao: string; tipo: "percentual" | "valor_fixo"; valor: string;
  valorMinimoPedido: string; descontoMaximo: string; limiteUsoTotal: string; limiteUsoPorCliente: string;
  inicioEm: string; expiraEm: string; ativo: boolean;
};
const blankDraft = (): Draft => ({ id: null, codigo: "", descricao: "", tipo: "percentual", valor: "", valorMinimoPedido: "", descontoMaximo: "", limiteUsoTotal: "", limiteUsoPorCliente: "1", inicioEm: "", expiraEm: "", ativo: true });
const inputClass = "rounded-lg border border-white/10 bg-[#090909] px-3 py-2.5 text-sm text-white outline-none focus:border-[#A9EC17]/50";
const dateValue = (value: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CouponManager({ coupons }: { coupons: CouponListItem[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function edit(coupon: CouponListItem) {
    setError(null);
    setDraft({ id: coupon.id, codigo: coupon.codigo, descricao: coupon.descricao ?? "", tipo: coupon.tipo, valor: String(coupon.valor), valorMinimoPedido: coupon.valorMinimoPedido === null ? "" : String(coupon.valorMinimoPedido), descontoMaximo: coupon.descontoMaximo === null ? "" : String(coupon.descontoMaximo), limiteUsoTotal: coupon.limiteUsoTotal === null ? "" : String(coupon.limiteUsoTotal), limiteUsoPorCliente: String(coupon.limiteUsoPorCliente), inicioEm: dateValue(coupon.inicioEm), expiraEm: dateValue(coupon.expiraEm), ativo: coupon.ativo });
  }
  function submit(event: React.FormEvent) {
    event.preventDefault(); if (!draft) return; setError(null);
    startTransition(async () => { const result = await saveCouponAction(draft.id, draft); if (!result.ok) return setError(result.error); setDraft(null); router.refresh(); });
  }
  function remove(coupon: CouponListItem) {
    if (!window.confirm(`Excluir o cupom ${coupon.codigo}?`)) return;
    startTransition(async () => { const result = await deleteCouponAction(coupon.id); if (!result.ok) return setError(result.error); router.refresh(); });
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-white/50">{coupons.length} cupom(ns) exclusivo(s) para compras no site.</p><p className="mt-1 text-xs text-white/30">Uso em marketplaces não é contabilizado aqui.</p></div><button onClick={() => { setDraft(blankDraft()); setError(null); }} className="inline-flex items-center gap-2 rounded-lg bg-[#A9EC17] px-4 py-2.5 text-sm font-semibold text-black"><Plus className="h-4 w-4" /> Novo cupom</button></div>
    {draft ? <form onSubmit={submit} className="rounded-xl border border-[#A9EC17]/20 bg-[#111111] p-5">
      <div className="mb-5 flex items-center justify-between"><div><h2 className="font-display font-bold">{draft.id ? "Editar cupom" : "Novo cupom"}</h2><p className="mt-1 text-xs text-white/40">Defina validade e limites para controlar a campanha.</p></div><button type="button" onClick={() => setDraft(null)}><X className="h-5 w-5 text-white/40" /></button></div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-white/60">Código<input required value={draft.codigo} onChange={(e) => setDraft({ ...draft, codigo: e.target.value.toUpperCase() })} className={inputClass} placeholder="BEMVINDO10" /></label>
        <label className="flex flex-col gap-1 text-xs text-white/60">Tipo<select value={draft.tipo} onChange={(e) => setDraft({ ...draft, tipo: e.target.value as Draft["tipo"] })} className={inputClass}><option value="percentual">Percentual</option><option value="valor_fixo">Valor fixo</option></select></label>
        <label className="flex flex-col gap-1 text-xs text-white/60">Valor {draft.tipo === "percentual" ? "(%)" : "(R$)"}<input required type="number" min="0.01" max={draft.tipo === "percentual" ? 100 : undefined} step="0.01" value={draft.valor} onChange={(e) => setDraft({ ...draft, valor: e.target.value })} className={inputClass} /></label>
        <label className="flex flex-col gap-1 text-xs text-white/60">Pedido mínimo (R$)<input type="number" min="0" step="0.01" value={draft.valorMinimoPedido} onChange={(e) => setDraft({ ...draft, valorMinimoPedido: e.target.value })} className={inputClass} placeholder="Sem mínimo" /></label>
        {draft.tipo === "percentual" ? <label className="flex flex-col gap-1 text-xs text-white/60">Desconto máximo (R$)<input type="number" min="0" step="0.01" value={draft.descontoMaximo} onChange={(e) => setDraft({ ...draft, descontoMaximo: e.target.value })} className={inputClass} placeholder="Sem teto" /></label> : null}
        <label className="flex flex-col gap-1 text-xs text-white/60">Limite total de usos<input type="number" min="1" value={draft.limiteUsoTotal} onChange={(e) => setDraft({ ...draft, limiteUsoTotal: e.target.value })} className={inputClass} placeholder="Ilimitado" /></label>
        <label className="flex flex-col gap-1 text-xs text-white/60">Limite por cliente<input required type="number" min="1" value={draft.limiteUsoPorCliente} onChange={(e) => setDraft({ ...draft, limiteUsoPorCliente: e.target.value })} className={inputClass} /></label>
        <label className="flex flex-col gap-1 text-xs text-white/60">Início<input type="datetime-local" value={draft.inicioEm} onChange={(e) => setDraft({ ...draft, inicioEm: e.target.value })} className={inputClass} /></label>
        <label className="flex flex-col gap-1 text-xs text-white/60">Expiração<input type="datetime-local" value={draft.expiraEm} onChange={(e) => setDraft({ ...draft, expiraEm: e.target.value })} className={inputClass} /></label>
        <label className="flex flex-col gap-1 text-xs text-white/60 md:col-span-2">Descrição<textarea value={draft.descricao} onChange={(e) => setDraft({ ...draft, descricao: e.target.value })} className={`${inputClass} min-h-20`} /></label>
        <label className="flex items-center gap-2 text-sm text-white/65"><input type="checkbox" checked={draft.ativo} onChange={(e) => setDraft({ ...draft, ativo: e.target.checked })} className="accent-[#A9EC17]" /> Cupom ativo</label>
      </div>
      {error ? <p className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
      <div className="mt-5 flex gap-3"><button disabled={isPending} className="inline-flex items-center gap-2 rounded-lg bg-[#A9EC17] px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar</button><button type="button" onClick={() => setDraft(null)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60">Cancelar</button></div>
    </form> : error ? <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
    {coupons.length === 0 ? <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#111111] text-center"><BadgePercent className="h-10 w-10 text-white/20" /><h2 className="font-display mt-4 font-bold">Nenhum cupom cadastrado</h2><p className="mt-1 text-sm text-white/40">Crie a primeira campanha promocional da loja.</p></div> : <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#111111]"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-white/[0.08] text-[11px] uppercase text-white/40"><tr><th className="px-4 py-3">Cupom</th><th className="px-4 py-3">Desconto</th><th className="px-4 py-3">Uso</th><th className="px-4 py-3">Validade</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr></thead><tbody>{coupons.map((coupon) => <tr key={coupon.id} className="border-b border-white/[0.05] last:border-0"><td className="px-4 py-3"><p className="font-mono font-bold text-[#A9EC17]">{coupon.codigo}</p><p className="text-xs text-white/35">{coupon.descricao ?? "Sem descrição"}</p></td><td className="px-4 py-3 text-white/65">{coupon.tipo === "percentual" ? `${coupon.valor}%` : money(coupon.valor)}</td><td className="px-4 py-3 text-white/65">{coupon.usos}/{coupon.limiteUsoTotal ?? "∞"}<p className="text-[11px] text-white/30">{coupon.limiteUsoPorCliente} por cliente</p></td><td className="px-4 py-3 text-xs text-white/55">{coupon.expiraEm ? new Date(coupon.expiraEm).toLocaleString("pt-BR") : "Sem expiração"}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${coupon.ativo ? "bg-[#A9EC17]/10 text-[#A9EC17]" : "bg-white/5 text-white/35"}`}>{coupon.ativo ? "Ativo" : "Inativo"}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-1"><button onClick={() => edit(coupon)} className="p-2 text-white/45 hover:text-white"><Pencil className="h-4 w-4" /></button><button onClick={() => remove(coupon)} className="p-2 text-red-400/60 hover:text-red-300"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>}
  </div>;
}
