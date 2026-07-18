/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, PackageSearch, Search } from "lucide-react";
import StatusBadge from "@/components/pedidos/StatusBadge";
import type { MetaCatalogItem } from "@/types/metaCatalog";

const inputClass = "h-10 rounded-lg border border-white/[0.09] bg-[#111111] px-3 text-xs text-white outline-none transition focus:border-[#A9EC17]/40";
const money = (value: number | null) => value === null ? "—" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function MetaCatalogTable({ items }: { items: MetaCatalogItem[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [kind, setKind] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    return items.filter((item) => {
      if (status === "included" && !item.included) return false;
      if (status === "excluded" && item.included) return false;
      if (availability !== "all" && item.availability !== availability) return false;
      if (kind !== "all" && item.kind !== kind) return false;
      if (term && ![item.title, item.sku ?? "", item.metaId ?? "", item.category].some((value) => normalize(value).includes(term))) return false;
      return true;
    });
  }, [availability, items, kind, search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const first = filtered.length ? (currentPage - 1) * pageSize + 1 : 0;
  const last = first ? first + pageItems.length - 1 : 0;
  const resetPage = () => setPage(1);

  return (
    <section className="space-y-4">
      <div><h2 className="font-display text-lg font-bold text-white">Pré-visualização dos produtos</h2><p className="mt-1 text-xs text-white/40">O ID exibido é exatamente o mesmo usado em g:id e content_ids do Pixel.</p></div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_repeat(3,190px)]">
        <label className="relative">
          <span className="sr-only">Buscar produtos</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); resetPage(); }} placeholder="Buscar por nome, SKU, categoria ou ID…" className={`${inputClass} w-full pl-9`} />
        </label>
        <select value={status} onChange={(event) => { setStatus(event.target.value); resetPage(); }} className={inputClass} aria-label="Filtrar por status"><option value="all">Todos os status</option><option value="included">Enviados</option><option value="excluded">Ignorados</option></select>
        <select value={availability} onChange={(event) => { setAvailability(event.target.value); resetPage(); }} className={inputClass} aria-label="Filtrar por disponibilidade"><option value="all">Toda disponibilidade</option><option value="in stock">Em estoque</option><option value="out of stock">Sem estoque</option></select>
        <select value={kind} onChange={(event) => { setKind(event.target.value); resetPage(); }} className={inputClass} aria-label="Filtrar por tipo"><option value="all">Produtos e variações</option><option value="product">Produto</option><option value="variant">Variação</option></select>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111111]">
        {pageItems.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center"><PackageSearch className="h-8 w-8 text-white/20" /><p className="mt-3 text-sm text-white/65">Nenhum item encontrado</p><p className="mt-1 text-xs text-white/35">Ajuste a busca ou os filtros.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1380px] border-collapse text-left">
              <thead><tr className="border-b border-white/[0.07] text-[10px] font-semibold uppercase tracking-wide text-white/40"><th className="px-4 py-3">Produto</th><th className="px-4 py-3">ID enviado à Meta</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Preço</th><th className="px-4 py-3">Promocional</th><th className="px-4 py-3">Estoque</th><th className="px-4 py-3">Disponibilidade</th><th className="px-4 py-3">Status no feed</th><th className="px-4 py-3">Motivo</th></tr></thead>
              <tbody className="divide-y divide-white/[0.05]">
                {pageItems.map((item) => (
                  <tr key={item.rowId} className="align-top transition hover:bg-white/[0.02]">
                    <td className="px-4 py-3"><div className="flex w-64 items-center gap-3"><div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black">{item.imageLink ? <img src={item.imageLink} alt="" className="h-full w-full object-cover" /> : null}</div><div className="min-w-0"><p className="truncate text-xs font-semibold text-white/80">{item.title}</p><p className="truncate text-[10px] text-white/35">{item.category || "Sem categoria"}</p></div></div></td>
                    <td className="px-4 py-3"><code className="block max-w-52 break-all text-[10px] text-sky-200/70">{item.metaId ?? "—"}</code></td>
                    <td className="px-4 py-3 text-xs text-white/55">{item.sku ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-white/55">{item.kind === "variant" ? "Variação" : "Produto"}</td>
                    <td className="px-4 py-3 text-xs font-medium text-white/75">{money(item.price)}</td>
                    <td className="px-4 py-3 text-xs font-medium text-[#A9EC17]/80">{money(item.salePrice)}</td>
                    <td className="px-4 py-3 text-xs text-white/50">{item.quantity === null ? "Não controlado" : item.quantity}</td>
                    <td className="px-4 py-3"><StatusBadge label={item.availability === "in stock" ? "Em estoque" : "Sem estoque"} tone={item.availability === "in stock" ? "success" : "warning"} /></td>
                    <td className="px-4 py-3"><StatusBadge label={item.included ? "Enviado" : "Ignorado"} tone={item.included ? "success" : "neutral"} /></td>
                    <td className="px-4 py-3"><div className="max-w-60 text-[10px] leading-4 text-white/40">{item.exclusionReason ?? "Elegível para sincronização."}{!item.included ? <Link href={`/produtos/${item.productId}/editar`} className="mt-1 block font-semibold text-[#A9EC17] hover:underline">Editar produto</Link> : null}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-3 sm:flex-row">
          <label className="flex items-center gap-2 text-xs text-white/45">Mostrar<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); resetPage(); }} className="rounded-md border border-white/[0.09] bg-[#1A1A1A] px-2 py-1 text-xs text-white">{[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}</select>por página</label>
          <p className="text-xs text-white/40">Mostrando <span className="text-white/65">{first}</span> a <span className="text-white/65">{last}</span> de <span className="text-white/65">{filtered.length}</span> itens</p>
          <div className="flex gap-2"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} aria-label="Página anterior" className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-white/60 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button><span className="flex h-8 min-w-8 items-center justify-center rounded-md border border-[#A9EC17]/35 bg-[#A9EC17]/10 px-2 text-xs font-semibold text-[#A9EC17]">{currentPage}</span><button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} aria-label="Próxima página" className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-white/60 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button></div>
        </div>
      </div>
    </section>
  );
}
