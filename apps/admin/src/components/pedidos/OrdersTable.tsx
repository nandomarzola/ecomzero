import Link from "next/link";
import { ChevronLeft, ChevronRight, PackageSearch } from "lucide-react";
import type { OrdersPage } from "@/lib/services/orderAdminService";
import type { OrdersQuery } from "@/lib/orders/href";
import { ordersHref } from "@/lib/orders/href";
import {
  labelStatusLabel,
  labelStatusTone,
  logisticsStatusLabel,
  paymentMethodLabel,
  shippingModeLabel,
} from "@/lib/orders/status";
import StatusBadge from "@/components/pedidos/StatusBadge";

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function formatDateParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso, time: "" };
  return {
    date: d.toLocaleDateString("pt-BR"),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };
}

const HEAD_CLASS =
  "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-white/45";

export default function OrdersTable({
  data,
  current,
  noun,
}: {
  data: OrdersPage;
  current: OrdersQuery;
  noun: string;
}) {
  if (data.rows.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.08] bg-[#0A0A0A] text-white/30">
          <PackageSearch className="h-5 w-5" strokeWidth={1.7} />
        </span>
        <p className="mt-4 text-sm font-medium text-white/70">Nenhum pedido encontrado</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-white/40">
          {current.q
            ? "Tente ajustar a busca ou trocar o período selecionado."
            : "Assim que houver pedidos neste filtro, eles aparecem aqui."}
        </p>
      </div>
    );
  }

  const first = (data.page - 1) * data.pageSize + 1;
  const last = first + data.rows.length - 1;
  const prevDisabled = data.page <= 1;
  const nextDisabled = data.page >= data.totalPages;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px] border-collapse">
          <thead>
            <tr className="border-b border-white/[0.07]">
              <th className={HEAD_CLASS}>Pedido</th>
              <th className={HEAD_CLASS}>Cliente</th>
              <th className={HEAD_CLASS}>Data</th>
              <th className={HEAD_CLASS}>Pagamento</th>
              <th className={HEAD_CLASS}>Modalidade de frete</th>
              <th className={HEAD_CLASS}>Situação da etiqueta</th>
              <th className={`${HEAD_CLASS} text-right`}>Valor</th>
              <th className={HEAD_CLASS}>Status logístico</th>
              <th className={`${HEAD_CLASS} text-right`}>Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {data.rows.map((order) => {
              const when = formatDateParts(order.createdAt);
              return (
                <tr key={order.id} className="transition hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-[13px] font-medium text-white/85">#{order.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <p className="text-[13px] font-semibold text-white">{order.customer}</p>
                    {order.email && <p className="mt-0.5 text-[11px] text-white/40">{order.email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[13px] text-white/80">{when.date}</p>
                    {when.time && <p className="mt-0.5 text-[11px] text-white/40">{when.time}</p>}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-white/75">
                    {paymentMethodLabel(order.status, order.paymentMethod)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[13px] text-white/75">{shippingModeLabel(order.shippingMode)}</p>
                    {order.shippingService ? (
                      <p className="mt-0.5 text-[11px] text-white/40">{order.shippingService}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3" title={order.shipmentError ?? undefined}>
                    <StatusBadge
                      label={labelStatusLabel(order.labelStatus)}
                      tone={labelStatusTone(order.labelStatus)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] font-semibold text-white">{money(order.total)}</td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] text-white/65">
                      {logisticsStatusLabel(order.labelStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Link
                        href={order.labelStatus === "generated" || order.labelStatus === "printed"
                          ? `/pedidos/${order.id}/etiqueta?autoprint=1`
                          : `/pedidos/${order.id}`}
                        aria-label={`Abrir ação do pedido #${order.id.slice(0, 8)}`}
                        className="inline-flex h-8 items-center justify-center rounded-md border border-white/[0.08] bg-[#1A1A1A] px-3 text-[11px] font-semibold text-white/65 transition hover:border-[#A9EC17]/30 hover:text-[#A9EC17]"
                      >
                        {order.labelStatus === "awaiting_fiscal_document"
                          ? "Definir documento"
                          : order.labelStatus === "awaiting_invoice"
                          ? "Informar NF-e"
                          : order.labelStatus === "ready_to_purchase"
                            ? "Comprar etiqueta"
                            : ["insufficient_balance", "error", "awaiting_shipping_data"].includes(order.labelStatus)
                              ? "Tentar novamente"
                              : ["generated", "printed"].includes(order.labelStatus)
                                ? "Imprimir"
                                : ["posted", "in_transit"].includes(order.labelStatus)
                                  ? "Rastrear"
                                  : "Ver detalhes"}
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-3 sm:flex-row">
        <p className="text-[12px] text-white/45">
          Mostrando <span className="text-white/70">{first}</span> a{" "}
          <span className="text-white/70">{last}</span> de{" "}
          <span className="text-white/70">{data.total}</span> {noun}
        </p>
        <div className="flex items-center gap-2">
          <PageButton
            href={ordersHref(current, { page: data.page - 1 })}
            disabled={prevDisabled}
            direction="prev"
          />
          <span className="flex h-8 min-w-8 items-center justify-center rounded-md border border-[#A9EC17]/40 bg-[#A9EC17]/10 px-2 text-[12px] font-semibold text-[#A9EC17]">
            {data.page}
          </span>
          <PageButton
            href={ordersHref(current, { page: data.page + 1 })}
            disabled={nextDisabled}
            direction="next"
          />
        </div>
      </div>
    </>
  );
}

function PageButton({
  href,
  disabled,
  direction,
}: {
  href: string;
  disabled: boolean;
  direction: "prev" | "next";
}) {
  const label = direction === "prev" ? "Anterior" : "Próxima";
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const base =
    "inline-flex h-8 items-center gap-1 rounded-md border px-3 text-[12px] font-semibold transition";
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={`${base} cursor-not-allowed border-white/[0.06] bg-[#0F0F0F] text-white/25`}
      >
        {direction === "prev" && <Icon className="h-4 w-4" />}
        {label}
        {direction === "next" && <Icon className="h-4 w-4" />}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={`${base} border-white/[0.09] bg-[#1A1A1A] text-white hover:border-[#A9EC17]/30`}
    >
      {direction === "prev" && <Icon className="h-4 w-4" />}
      {label}
      {direction === "next" && <Icon className="h-4 w-4" />}
    </Link>
  );
}
