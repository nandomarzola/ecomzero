import { ShoppingBag } from "lucide-react";
import type { RecentOrder } from "@/lib/services/dashboardAdminService";

const statusLabel = { draft: "Carrinho", aguardando_pagamento: "Aguardando pagamento", pago: "Pago", cancelado: "Cancelado" };
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function RecentOrdersTable({ orders }: { orders: RecentOrder[] }) {
  return (
    <section className="rounded-xl border border-white/[0.08] bg-[#111111]">
      <div className="border-b border-white/[0.08] px-5 py-4">
        <h2 className="font-display text-sm font-bold text-white">Últimos pedidos</h2>
      </div>
      {orders.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.08] bg-[#0A0A0A] text-white/25">
          <ShoppingBag className="h-5 w-5" strokeWidth={1.7} />
        </span>
        <p className="mt-4 text-sm font-medium text-white/65">Nenhum pedido para exibir</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-white/35">
          Os pedidos finalizados pela loja aparecerão aqui automaticamente.
        </p>
      </div> : <div className="divide-y divide-white/[0.06]">{orders.map((order) => <div key={order.id} className="grid grid-cols-[1fr_auto] gap-3 px-5 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-white">{order.customer}</p><p className="truncate text-[11px] text-white/35">#{order.id.slice(0, 8)} · {new Date(order.createdAt).toLocaleString("pt-BR")}</p></div><div className="text-right"><p className="text-sm font-semibold text-white">{money(order.total)}</p><p className="mt-0.5 text-[10px] text-[#A9EC17]">{statusLabel[order.status]}</p></div></div>)}</div>}
    </section>
  );
}
