import { CheckCircle2, Clock3, ShoppingCart, XCircle } from "lucide-react";
import { getOrdersSummary } from "@/lib/services/orderAdminService";
import type { OrderFilter, OrderPeriodId } from "@/lib/orders/filters";
import OrderSummaryCard, { type SummaryTone } from "@/components/pedidos/OrderSummaryCard";

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Async Server Component — busca os totais do período e monta os 4 cards.
// O card correspondente à aba ativa fica destacado (verde).
export default async function SummaryCards({
  period,
  activeMetric,
}: {
  period: OrderPeriodId;
  activeMetric: OrderFilter["metric"];
}) {
  const summary = await getOrdersSummary(period);

  const cards: {
    metric: OrderFilter["metric"];
    label: string;
    value: string;
    subtitle: string;
    icon: typeof CheckCircle2;
    tone: SummaryTone;
  }[] = [
    { metric: "pagos", label: "Pedidos pagos", value: String(summary.pagos.count), subtitle: money(summary.pagos.total), icon: CheckCircle2, tone: "green" },
    { metric: "naoPagos", label: "Pedidos não pagos", value: String(summary.naoPagos.count), subtitle: money(summary.naoPagos.total), icon: Clock3, tone: "amber" },
    { metric: "feitos", label: "Pedidos feitos", value: String(summary.feitos.count), subtitle: "Total", icon: ShoppingCart, tone: "blue" },
    { metric: "naoFeitos", label: "Pedidos não feitos", value: String(summary.naoFeitos.count), subtitle: "Total", icon: XCircle, tone: "purple" },
  ];

  return (
    <section aria-label="Resumo de pedidos" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <OrderSummaryCard
          key={card.metric}
          label={card.label}
          value={card.value}
          subtitle={card.subtitle}
          icon={card.icon}
          tone={card.tone}
          active={card.metric === activeMetric}
        />
      ))}
    </section>
  );
}

export function SummaryCardsSkeleton() {
  return (
    <section aria-hidden className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex min-h-[104px] items-center gap-4 rounded-[10px] border border-white/[0.09] bg-[linear-gradient(145deg,#111111,#0C0C0C)] p-4 sm:p-5"
        >
          <span className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-white/[0.07] sm:h-12 sm:w-12" />
          <div className="min-w-0 flex-1 space-y-2">
            <span className="block h-2.5 w-20 animate-pulse rounded bg-white/[0.07]" />
            <span className="block h-6 w-12 animate-pulse rounded bg-white/[0.07]" />
            <span className="block h-2 w-16 animate-pulse rounded bg-white/[0.07]" />
          </div>
        </div>
      ))}
    </section>
  );
}
