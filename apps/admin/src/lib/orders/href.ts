import {
  DEFAULT_ORDER_FILTER,
  DEFAULT_ORDER_PERIOD,
  type OrderFilterId,
  type OrderPeriodId,
} from "@/lib/orders/filters";

// Estado da tela de Pedidos que vive na URL (compartilhável / navegável com
// voltar do browser). Helper puro — usado pelo Server Component (abas, paginação)
// e pela toolbar client (busca, período).
export type OrdersQuery = {
  filter: OrderFilterId;
  period: OrderPeriodId;
  q: string;
  page: number;
};

export function ordersHref(current: OrdersQuery, overrides: Partial<OrdersQuery>): string {
  const next: OrdersQuery = { ...current, ...overrides };
  const params = new URLSearchParams();
  // Só serializa o que difere do padrão → URLs limpas (/pedidos = Pagos, 7 dias).
  if (next.filter !== DEFAULT_ORDER_FILTER) params.set("status", next.filter);
  if (next.period !== DEFAULT_ORDER_PERIOD) params.set("periodo", next.period);
  if (next.q.trim()) params.set("q", next.q.trim());
  if (next.page > 1) params.set("page", String(next.page));
  const qs = params.toString();
  return qs ? `/pedidos?${qs}` : "/pedidos";
}
