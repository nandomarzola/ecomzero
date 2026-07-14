import { DollarSign, Package, ShoppingBag, Users } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import RecentOrdersTable from "@/components/dashboard/RecentOrdersTable";
import TopProductsList from "@/components/dashboard/TopProductsList";
import QuickActions from "@/components/dashboard/QuickActions";
import { countProducts } from "@/lib/services/productAdminService";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const productCount = await countProducts();
  const stats = [
    { label: "Pedidos Hoje", value: "—", icon: ShoppingBag },
    { label: "Faturamento", value: "—", icon: DollarSign },
    { label: "Produtos", value: productCount.toString(), icon: Package },
    { label: "Clientes", value: "—", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <RecentOrdersTable />
        <TopProductsList />
      </div>

      <QuickActions />
    </div>
  );
}
