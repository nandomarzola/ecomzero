import Link from "next/link";
import { CheckCircle2, ChevronDown, ChevronRight, Clock3 } from "lucide-react";

export type DashboardOrder = {
  id: string;
  customer: string;
  createdAt: string;
  total: string | number;
  status: string;
  tone?: "success" | "warning" | "danger";
  href?: string;
  shipmentStatus?: string | null;
  labelStatus?: string | null;
};

const orderStatusLabel: Record<string, string> = {
  draft: "Carrinho",
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  cancelado: "Cancelado",
};

const shipmentStatusLabel: Record<string, string> = {
  creating: "Criando envio",
  pending: "No carrinho do Melhor Envio",
  released: "Etiqueta comprada",
  generated: "Etiqueta gerada",
  posted: "Postado",
  delivered: "Entregue",
  undelivered: "Não entregue",
  cancelled: "Envio cancelado",
  canceled: "Envio cancelado",
  paused: "Envio pausado",
  suspended: "Envio suspenso",
};

const labelStatusLabel: Record<string, string> = {
  not_applicable: "Não aplicável",
  awaiting_payment: "Aguardando pagamento",
  awaiting_shipping_data: "Aguardando dados de envio",
  awaiting_invoice: "Aguardando NF-e",
  ready_to_purchase: "Pronto para compra",
  insufficient_balance: "Saldo insuficiente",
  processing: "Gerando etiqueta",
  purchased: "Etiqueta comprada",
  generated: "Etiqueta gerada",
  printed: "Etiqueta impressa",
  posted: "Postado",
  in_transit: "Em trânsito",
  delivered: "Entregue",
  error: "Erro na etiqueta",
  external: "Envio externo",
  canceled: "Etiqueta cancelada",
};

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function orderTone(order: DashboardOrder) {
  if (order.tone) return order.tone;
  if (["error", "canceled", "insufficient_balance"].includes(order.labelStatus ?? "")) return "danger";
  if (["awaiting_payment", "awaiting_shipping_data", "awaiting_invoice", "ready_to_purchase"].includes(order.labelStatus ?? "")) return "warning";
  if (["purchased", "generated", "printed", "posted", "in_transit", "delivered"].includes(order.labelStatus ?? "")) return "success";
  if (order.status === "cancelado" || ["cancelled", "canceled", "undelivered"].includes(order.shipmentStatus ?? "")) return "danger";
  if (order.status === "pago" || ["released", "generated", "posted", "delivered"].includes(order.shipmentStatus ?? "")) return "success";
  return "warning";
}

function formatCreatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-BR");
}

export default function RecentOrdersTable({ orders }: { orders: DashboardOrder[] }) {
  return (
    <section className="overflow-hidden rounded-[9px] border border-white/[0.09] bg-[linear-gradient(145deg,#111111,#0C0C0C)]">
      <header className="flex min-h-[50px] items-center justify-between gap-4 border-b border-white/[0.07] px-4">
        <h2 className="font-display text-[15px] font-bold text-white">Últimos pedidos pagos</h2>
        <Link
          href="/pedidos"
          className="inline-flex h-8 items-center gap-2 rounded-md border border-white/[0.07] bg-[#1A1A1A] px-3 text-[10px] font-semibold text-white transition hover:border-[#A9EC17]/30"
        >
          Ver todos
          <ChevronDown className="h-3.5 w-3.5 text-white/55" />
        </Link>
      </header>

      <div className="divide-y divide-white/[0.055] px-3">
        {orders.map((order) => {
          const tone = orderTone(order);
          const StatusIcon = tone === "success" ? CheckCircle2 : Clock3;
          const status = order.labelStatus && order.labelStatus !== "not_applicable"
            ? labelStatusLabel[order.labelStatus] ?? order.labelStatus
            : order.shipmentStatus
              ? shipmentStatusLabel[order.shipmentStatus] ?? order.shipmentStatus
              : orderStatusLabel[order.status] ?? order.status;
          return (
            <Link
              key={order.id}
              href={order.href ?? `/pedidos/${order.id}`}
              className="group flex min-h-[50px] items-center gap-3 px-1.5 py-2 transition hover:bg-white/[0.025]"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${tone === "success" ? "bg-[#A9EC17]/10 text-[#A9EC17]" : tone === "danger" ? "bg-red-400/10 text-red-300" : "bg-amber-400/10 text-amber-300"}`}>
                <StatusIcon className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[11px] font-semibold text-white">{order.customer}</strong>
                <span className="mt-0.5 block truncate text-[9px] text-white/40">#{order.id.slice(0, 8)} · {formatCreatedAt(order.createdAt)}</span>
              </span>
              <span className="shrink-0 text-right">
                <strong className="block text-[11px] font-bold text-white">{typeof order.total === "number" ? money(order.total) : order.total}</strong>
                <span className={`mt-0.5 block text-[9px] ${tone === "success" ? "text-[#A9EC17]" : tone === "danger" ? "text-red-300" : "text-amber-300"}`}>
                  {status}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-white/35 transition group-hover:translate-x-0.5 group-hover:text-[#A9EC17]" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
