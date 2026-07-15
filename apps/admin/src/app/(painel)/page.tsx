import { DollarSign, Package, ShoppingBag, Users } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import RecentOrdersTable from "@/components/dashboard/RecentOrdersTable";
import TopProductsList from "@/components/dashboard/TopProductsList";
import QuickActions from "@/components/dashboard/QuickActions";
import { getDashboardData } from "@/lib/services/dashboardAdminService";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();
  const currency = data.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const stats = [
    { label: "Pedidos Hoje", value: data.ordersToday.toString(), icon: ShoppingBag },
    { label: "Faturamento pago", value: currency, icon: DollarSign },
    { label: "Produtos", value: data.products.toString(), icon: Package },
    { label: "Clientes", value: data.customers.toString(), icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <RecentOrdersTable orders={data.recentOrders} />
        <TopProductsList />
      </div>

      <QuickActions />
    </div>
  );
}
