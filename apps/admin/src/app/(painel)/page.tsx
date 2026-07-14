import { DollarSign, Package, ShoppingBag, Users } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import RecentOrdersTable from "@/components/dashboard/RecentOrdersTable";
import TopProductsList from "@/components/dashboard/TopProductsList";
import QuickActions from "@/components/dashboard/QuickActions";

// Dados de exemplo — sem backend ainda. Trocar por fetch real quando a API existir.
const stats = [
  { label: "Pedidos Hoje", value: "18", icon: ShoppingBag },
  { label: "Faturamento", value: "R$ 3.240,00", icon: DollarSign },
  { label: "Produtos", value: "8", icon: Package },
  { label: "Clientes", value: "132", icon: Users },
];

export default function DashboardPage() {
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
