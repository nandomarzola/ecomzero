import {
  CheckCircle2,
  Clock3,
  ListChecks,
  ShoppingCart,
  XCircle,
  type LucideIcon,
} from "lucide-react";

// Config das abas/filtros da tela de Pedidos. Sem Prisma aqui de propósito —
// este módulo é importado tanto por Server Components quanto pela toolbar client,
// então não pode arrastar `@/lib/db`. A tradução filtro → cláusula Prisma vive
// em `orderAdminService.ts`.

export type OrderFilterId = "todos" | "pagos" | "nao-pagos" | "feitos" | "nao-feitos";

export type OrderFilter = {
  id: OrderFilterId;
  label: string; // aba
  sectionTitle: string; // título da tabela
  noun: string; // usado no rodapé "Mostrando X a Y de Z {noun}"
  icon: LucideIcon;
  /** chave do card de resumo que fica destacado quando esta aba está ativa */
  metric: "pagos" | "naoPagos" | "feitos" | "naoFeitos";
};

export const ORDER_FILTERS: OrderFilter[] = [
  { id: "todos", label: "Todos", sectionTitle: "Todos os pedidos", noun: "pedidos", icon: ListChecks, metric: "feitos" },
  { id: "pagos", label: "Pagos", sectionTitle: "Pedidos pagos", noun: "pedidos pagos", icon: CheckCircle2, metric: "pagos" },
  { id: "nao-pagos", label: "Não pagos", sectionTitle: "Pedidos não pagos", noun: "pedidos não pagos", icon: Clock3, metric: "naoPagos" },
  { id: "feitos", label: "Feitos", sectionTitle: "Pedidos feitos", noun: "pedidos feitos", icon: ShoppingCart, metric: "feitos" },
  { id: "nao-feitos", label: "Não feitos", sectionTitle: "Pedidos não feitos", noun: "pedidos não feitos", icon: XCircle, metric: "naoFeitos" },
];

// Print da referência abre com a aba "Pagos" ativa.
export const DEFAULT_ORDER_FILTER: OrderFilterId = "pagos";

export function resolveOrderFilter(value: string | undefined): OrderFilter {
  return (
    ORDER_FILTERS.find((filter) => filter.id === value) ??
    ORDER_FILTERS.find((filter) => filter.id === DEFAULT_ORDER_FILTER)!
  );
}

export type OrderPeriodId = "hoje" | "7d" | "30d" | "tudo";

export const ORDER_PERIODS: { id: OrderPeriodId; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "tudo", label: "Todo o período" },
];

export const DEFAULT_ORDER_PERIOD: OrderPeriodId = "7d";

export function resolveOrderPeriod(value: string | undefined): OrderPeriodId {
  return ORDER_PERIODS.some((period) => period.id === value)
    ? (value as OrderPeriodId)
    : DEFAULT_ORDER_PERIOD;
}

export const ORDERS_PAGE_SIZE = 10;
