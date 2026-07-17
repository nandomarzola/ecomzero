import { AlertTriangle, FileCheck2, FileClock, Gift } from "lucide-react";
import { getMelhorEnvioBalance } from "@/lib/services/melhorEnvioAdminService";
import { getOrdersSummary } from "@/lib/services/orderAdminService";
import type { OrderFilter, OrderPeriodId } from "@/lib/orders/filters";
import OrderSummaryCard, { type SummaryTone } from "@/components/pedidos/OrderSummaryCard";

// Async Server Component — busca os totais do período e monta os 4 cards.
// O card correspondente à aba ativa fica destacado (verde).
export default async function SummaryCards({
  period,
  activeMetric,
}: {
  period: OrderPeriodId;
  activeMetric: OrderFilter["metric"];
}) {
  const [summary, balance] = await Promise.all([
    getOrdersSummary(period),
    getMelhorEnvioBalance(),
  ]);
  const balanceError = balance.error;
  const balanceValue = balance.value;
  const hasBalance = balanceValue !== null;
  const isStaleBalance = balance.status === "stale";
  const authorizationError = balanceError
    ? /unauthor|autoriz|permiss/i.test(balanceError)
    : false;

  const cards: {
    metric: OrderFilter["metric"];
    label: string;
    value: string;
    subtitle: string;
    icon: typeof FileClock;
    tone: SummaryTone;
  }[] = [
    { metric: "aguardando", label: "Pagos aguardando etiqueta", value: String(summary.aguardando), subtitle: "Ação pendente", icon: FileClock, tone: "amber" },
    { metric: "geradas", label: "Etiquetas geradas", value: String(summary.geradas), subtitle: "No período", icon: FileCheck2, tone: "green" },
    { metric: "manuais", label: "Frete grátis / manual", value: String(summary.manuais), subtitle: "Ação da loja", icon: Gift, tone: "blue" },
    { metric: "problemas", label: "Erros ou sem saldo", value: String(summary.problemas), subtitle: "Precisam de atenção", icon: AlertTriangle, tone: "purple" },
  ];

  return (
    <div className="space-y-2">
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
      <p
        className={`text-right text-[11px] ${balance.status === "live" ? "text-white/35" : "text-amber-300/80"}`}
        title={balanceError ?? undefined}
      >
        Melhor Carteira: {hasBalance
          ? balanceValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
          : authorizationError
            ? "Reautorize a conta Melhor Envio"
            : balanceError ?? "Não foi possível consultar o saldo"}
        {isStaleBalance ? " · última consulta conhecida (desatualizada)" : ""}
        {isStaleBalance && balanceError ? ` · falha ao atualizar: ${balanceError}` : ""}
        {balance.checkedAt
          ? ` · ${new Date(balance.checkedAt).toLocaleString("pt-BR")}`
          : ""}
      </p>
    </div>
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
