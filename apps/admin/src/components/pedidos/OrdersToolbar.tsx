"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Search } from "lucide-react";
import { ORDER_PERIODS, resolveOrderPeriod } from "@/lib/orders/filters";
import { ordersHref, type OrdersQuery } from "@/lib/orders/href";

// Toolbar da tabela: busca (debounce 300ms) + botão Filtros + dropdown de período.
// Estado atual chega por props (do Server Component) — não usamos useSearchParams
// aqui de propósito (ver references/nextjs-gotchas.md).
export default function OrdersToolbar({ current }: { current: OrdersQuery }) {
  const router = useRouter();
  const [term, setTerm] = useState(current.q);
  const [periodOpen, setPeriodOpen] = useState(false);

  // Busca com debounce: só navega 300ms depois da última tecla. O guard evita
  // push redundante quando o termo já bate com a URL (inclusive na montagem e
  // logo após a navegação concluir).
  useEffect(() => {
    if (term.trim() === current.q.trim()) return;
    const timeout = setTimeout(() => {
      router.replace(ordersHref(current, { q: term, page: 1 }), { scroll: false });
    }, 300);
    return () => clearTimeout(timeout);
  }, [term, current, router]);

  const activePeriodLabel =
    ORDER_PERIODS.find((p) => p.id === resolveOrderPeriod(current.period))?.label ?? "Período";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:min-w-[240px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Buscar pedido, cliente ou código..."
          className="h-9 w-full rounded-lg border border-white/[0.09] bg-[#0F0F0F] pl-9 pr-3 text-[13px] text-white placeholder:text-white/35 outline-none transition focus:border-[#A9EC17]/40"
        />
      </div>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setPeriodOpen((open) => !open)}
          className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-white/[0.09] bg-[#1A1A1A] px-3 text-[13px] font-medium text-white/80 transition hover:border-[#A9EC17]/30 sm:w-auto"
        >
          {activePeriodLabel}
          <ChevronDown className="h-4 w-4 text-white/55" />
        </button>

        {periodOpen && (
          <>
            <button
              type="button"
              aria-label="Fechar"
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setPeriodOpen(false)}
            />
            <div className="absolute right-0 z-20 mt-1.5 w-48 overflow-hidden rounded-lg border border-white/[0.1] bg-[#111111] py-1 shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
              {ORDER_PERIODS.map((period) => {
                const active = period.id === resolveOrderPeriod(current.period);
                return (
                  <Link
                    key={period.id}
                    href={ordersHref(current, { period: period.id, page: 1 })}
                    onClick={() => setPeriodOpen(false)}
                    scroll={false}
                    className={`flex items-center justify-between px-3 py-2 text-[13px] transition hover:bg-white/[0.04] ${
                      active ? "text-[#A9EC17]" : "text-white/75"
                    }`}
                  >
                    {period.label}
                    {active && <Check className="h-4 w-4" />}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
