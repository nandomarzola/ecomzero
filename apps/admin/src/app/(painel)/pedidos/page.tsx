import { Suspense } from "react";
import { resolveOrderFilter, resolveOrderPeriod } from "@/lib/orders/filters";
import type { OrdersQuery } from "@/lib/orders/href";
import OrdersTabs from "@/components/pedidos/OrdersTabs";
import OrdersToolbar from "@/components/pedidos/OrdersToolbar";
import OrdersTableSection from "@/components/pedidos/OrdersTableSection";
import OrdersTableSkeleton from "@/components/pedidos/OrdersTableSkeleton";
import SummaryCards, { SummaryCardsSkeleton } from "@/components/pedidos/SummaryCards";

// Estado da tela (aba, período, busca, página) vive nos query params da URL —
// compartilhável e navegável com o voltar do browser. Server Component lê os
// params; a busca (client) atualiza a URL com debounce. Cada seção que depende
// de dados fica num <Suspense> keyed pela query, para exibir skeleton na troca.
export const dynamic = "force-dynamic";

type PedidosSearchParams = {
  status?: string;
  periodo?: string;
  q?: string;
  page?: string;
};

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<PedidosSearchParams>;
}) {
  const sp = await searchParams;
  const filter = resolveOrderFilter(sp.status);
  const period = resolveOrderPeriod(sp.periodo);
  const q = sp.q?.trim() ?? "";
  const parsedPage = Number.parseInt(sp.page ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const current: OrdersQuery = { filter: filter.id, period, q, page };
  const tableKey = `${filter.id}|${period}|${q}|${page}`;

  return (
    <div className="space-y-4">
      <Suspense key={period} fallback={<SummaryCardsSkeleton />}>
        <SummaryCards period={period} activeMetric={filter.metric} />
      </Suspense>

      <OrdersTabs current={current} />

      <section className="overflow-hidden rounded-[10px] border border-white/[0.09] bg-[linear-gradient(145deg,#111111,#0C0C0C)]">
        <header className="flex flex-col gap-3 border-b border-white/[0.07] px-4 py-3.5 xl:flex-row xl:items-center xl:justify-between">
          <h2 className="font-display text-[15px] font-bold text-white">{filter.sectionTitle}</h2>
          <div className="xl:min-w-[540px]">
            <OrdersToolbar current={current} />
          </div>
        </header>

        <Suspense key={tableKey} fallback={<OrdersTableSkeleton />}>
          <OrdersTableSection current={current} noun={filter.noun} />
        </Suspense>
      </section>
    </div>
  );
}
