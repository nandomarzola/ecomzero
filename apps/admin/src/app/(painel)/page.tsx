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
import RecentOrdersTable from "@/components/dashboard/RecentOrdersTable";
import TopProductsList from "@/components/dashboard/TopProductsList";
import { getDashboardData } from "@/lib/services/dashboardAdminService";

export const dynamic = "force-dynamic";

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const percent = (value: number) =>
  `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export default async function DashboardPage() {
  const data = await getDashboardData();
  const sevenDays = data.periods.find((period) => period.id === "7d")!;

  const metrics = [
    {
      label: "Pedidos pagos",
      value: String(data.paidOrdersToday),
      subtitle: "Hoje",
      icon: CheckCircle2,
      active: true,
    },
    {
      label: "Faturamento pago",
      value: money(data.revenueToday),
      subtitle: "Hoje",
      icon: DollarSign,
    },
    {
      label: "Pedidos feitos",
      value: String(data.ordersToday),
      subtitle: "Hoje",
      icon: ShoppingCart,
    },
    {
      label: "Produtos",
      value: String(data.products),
      subtitle: "Cadastrados",
      icon: Package,
    },
    {
      label: "Clientes",
      value: String(data.customers),
      subtitle: "Ativos",
      icon: Users,
    },
  ];

  const chartPeriods: OrdersChartPeriod[] = data.periods.map((period) => ({
    id: period.id,
    label: period.label,
    points: period.points,
    metrics: [
      { label: "Faturamento pago", value: money(period.revenue), active: true },
      { label: "Ticket médio", value: money(period.averageTicket) },
      { label: "Conversão", value: percent(period.conversion) },
    ],
  }));

  const quickSummary = [
    {
      label: "Faturamento pago (7 dias)",
      value: money(sevenDays.revenue),
      href: "/pedidos",
      icon: CheckCircle2,
    },
    {
      label: "Pedidos pagos (7 dias)",
      value: String(sevenDays.paidOrders),
      href: "/pedidos",
      icon: ShoppingCart,
    },
    {
      label: "Clientes ativos",
      value: String(data.customers),
      href: "/clientes",
      icon: Users,
    },
    {
      label: "Produtos cadastrados",
      value: String(data.products),
      href: "/produtos",
      icon: Package,
    },
  ];

  return (
    <div className="space-y-4">
      <section aria-label="Métricas principais" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.58fr)_minmax(320px,1fr)]">
        <OrdersChart periods={chartPeriods} />
        <TopProductsList products={data.topProducts.map((product) => ({
          ...product,
          value: money(product.value),
        }))} />
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.58fr)_minmax(320px,1fr)]">
        <RecentOrdersTable orders={data.recentOrders} />
        <QuickSummary items={quickSummary} />
      </div>

      <QuickActions />
    </div>
  );
}
