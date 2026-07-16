import Link from "next/link";
import { ORDER_FILTERS } from "@/lib/orders/filters";
import { ordersHref, type OrdersQuery } from "@/lib/orders/href";

// Abas de filtro (Todos / Pagos / Não pagos / Feitos / Não feitos). São <Link>s
// server-side: trocam ?status= preservando período e busca, resetando a página.
// Rolagem horizontal no mobile.
export default function OrdersTabs({ current }: { current: OrdersQuery }) {
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
      {ORDER_FILTERS.map((filter) => {
        const Icon = filter.icon;
        const active = filter.id === current.filter;
        return (
          <Link
            key={filter.id}
            href={ordersHref(current, { filter: filter.id, page: 1 })}
            scroll={false}
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-medium transition ${
              active
                ? "border-[#A9EC17]/40 bg-[#A9EC17]/10 text-[#A9EC17]"
                : "border-white/[0.08] bg-[#111111] text-white/60 hover:border-white/15 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.8} />
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}
