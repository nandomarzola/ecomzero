import {
  CheckCircle2,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
} from "lucide-react";
import MetricCard from "@/components/dashboard/MetricCard";
import OrdersChart, { type OrdersChartPeriod } from "@/components/dashboard/OrdersChart";
import QuickActions from "@/components/dashboard/QuickActions";
import QuickSummary from "@/components/dashboard/QuickSummary";
import RecentOrdersTable, { type DashboardOrder } from "@/components/dashboard/RecentOrdersTable";
import TopProductsList, { type TopProduct } from "@/components/dashboard/TopProductsList";

const metrics = [
  { label: "Pedidos pagos", value: "0", subtitle: "Hoje", icon: CheckCircle2, active: true },
  { label: "Faturamento pago", value: "R$ 23,76", subtitle: "Hoje", icon: DollarSign },
  { label: "Pedidos feitos", value: "0", subtitle: "Hoje", icon: ShoppingCart },
  { label: "Produtos", value: "1", subtitle: "Cadastrados", icon: Package },
  { label: "Clientes", value: "2", subtitle: "Ativos", icon: Users },
];

const chartPeriods: OrdersChartPeriod[] = [
  {
    id: "7d",
    label: "Últimos 7 dias",
    points: [
      { label: "10/07", value: 6 },
      { label: "11/07", value: 1 },
      { label: "12/07", value: 8 },
      { label: "13/07", value: 3 },
      { label: "14/07", value: 12 },
      { label: "15/07", value: 27 },
      { label: "16/07", value: 9 },
    ],
    metrics: [
      { label: "Faturamento pago", value: "R$ 23,76", active: true },
      { label: "Ticket médio", value: "R$ 0,00" },
      { label: "Conversão", value: "0%" },
    ],
  },
  {
    id: "30d",
    label: "Últimos 30 dias",
    points: [
      { label: "18/06", value: 4 },
      { label: "23/06", value: 9 },
      { label: "28/06", value: 6 },
      { label: "03/07", value: 14 },
      { label: "08/07", value: 11 },
      { label: "13/07", value: 19 },
      { label: "16/07", value: 27 },
    ],
    metrics: [
      { label: "Faturamento pago", value: "R$ 78,42", active: true },
      { label: "Ticket médio", value: "R$ 11,20" },
      { label: "Conversão", value: "1,8%" },
    ],
  },
];

const recentOrders: DashboardOrder[] = [
  { id: "dc0d8a4b", customer: "Lucas Prado", createdAt: "15/07/2026, 21:16:01", total: "R$ 11,88", status: "Aguardando pagamento", tone: "warning", href: "/pedidos" },
  { id: "dadb9da9", customer: "Lucas Prado", createdAt: "15/07/2026, 19:19:35", total: "R$ 11,88", status: "Aguardando pagamento", tone: "warning", href: "/pedidos" },
  { id: "883557de", customer: "Lucas Prado", createdAt: "15/07/2026, 19:07:14", total: "R$ 11,88", status: "Aguardando pagamento", tone: "warning", href: "/pedidos" },
  { id: "c5eceb8b", customer: "Lucas Prado", createdAt: "15/07/2026, 18:54:55", total: "R$ 11,88", status: "Aguardando pagamento", tone: "warning", href: "/pedidos" },
  { id: "dc048c07", customer: "Lucas Prado", createdAt: "15/07/2026, 19:42:45", total: "R$ 11,88", status: "Etiqueta comprada", tone: "success", href: "/pedidos" },
];

const topProducts: TopProduct[] = [];

const quickSummary = [
  { label: "Faturamento pago (7 dias)", value: "R$ 23,76", href: "/pedidos", icon: CheckCircle2 },
  { label: "Pedidos pagos (7 dias)", value: "0", href: "/pedidos", icon: ShoppingCart },
  { label: "Clientes ativos", value: "2", href: "/clientes", icon: Users },
  { label: "Produtos cadastrados", value: "1", href: "/produtos", icon: Package },
];

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <section aria-label="Métricas principais" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.58fr)_minmax(320px,1fr)]">
        <OrdersChart periods={chartPeriods} />
        <TopProductsList products={topProducts} />
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.58fr)_minmax(320px,1fr)]">
        <RecentOrdersTable orders={recentOrders} />
        <QuickSummary items={quickSummary} />
      </div>

      <QuickActions />
    </div>
  );
}
