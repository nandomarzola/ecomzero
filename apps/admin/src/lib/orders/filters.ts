import {
  AlertTriangle,
  Clock3,
  FileCheck2,
  FileClock,
  Gift,
  ListChecks,
  PackageCheck,
  Route,
  Truck,
  type LucideIcon,
} from "lucide-react";

// Config das abas/filtros da tela de Pedidos. Sem Prisma aqui de propósito —
// este módulo é importado tanto por Server Components quanto pela toolbar client,
// então não pode arrastar `@/lib/db`. A tradução filtro → cláusula Prisma vive
// em `orderAdminService.ts`.

export type OrderFilterId =
  | "todos"
  | "aguardando-pagamento"
  | "aguardando-etiqueta"
  | "etiqueta-gerada"
  | "frete-gratis"
  | "com-problema"
  | "postados"
  | "em-transito"
  | "entregues";

export type OrderFilter = {
  id: OrderFilterId;
  label: string; // aba
  sectionTitle: string; // título da tabela
  noun: string; // usado no rodapé "Mostrando X a Y de Z {noun}"
  icon: LucideIcon;
  /** chave do card de resumo que fica destacado quando esta aba está ativa */
  metric: "aguardando" | "geradas" | "manuais" | "problemas";
};

export const ORDER_FILTERS: OrderFilter[] = [
  { id: "todos", label: "Todos", sectionTitle: "Todos os pedidos", noun: "pedidos", icon: ListChecks, metric: "aguardando" },
  { id: "aguardando-pagamento", label: "Aguardando pagamento", sectionTitle: "Pedidos aguardando pagamento", noun: "pedidos aguardando pagamento", icon: Clock3, metric: "aguardando" },
  { id: "aguardando-etiqueta", label: "Aguardando etiqueta", sectionTitle: "Pedidos aguardando etiqueta", noun: "pedidos aguardando etiqueta", icon: FileClock, metric: "aguardando" },
  { id: "etiqueta-gerada", label: "Etiqueta gerada", sectionTitle: "Pedidos com etiqueta gerada", noun: "pedidos com etiqueta", icon: FileCheck2, metric: "geradas" },
  { id: "frete-gratis", label: "Frete grátis / manual", sectionTitle: "Frete grátis com ação manual", noun: "pedidos com frete grátis", icon: Gift, metric: "manuais" },
  { id: "com-problema", label: "Com problema", sectionTitle: "Pedidos que precisam de atenção", noun: "pedidos com problema", icon: AlertTriangle, metric: "problemas" },
  { id: "postados", label: "Postados", sectionTitle: "Pedidos postados", noun: "pedidos postados", icon: PackageCheck, metric: "geradas" },
  { id: "em-transito", label: "Em trânsito", sectionTitle: "Pedidos em trânsito", noun: "pedidos em trânsito", icon: Truck, metric: "geradas" },
  { id: "entregues", label: "Entregues", sectionTitle: "Pedidos entregues", noun: "pedidos entregues", icon: Route, metric: "geradas" },
];

// Print da referência abre com a aba "Pagos" ativa.
export const DEFAULT_ORDER_FILTER: OrderFilterId = "aguardando-etiqueta";

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
