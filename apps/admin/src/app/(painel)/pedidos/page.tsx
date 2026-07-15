import RecentOrdersTable from "@/components/dashboard/RecentOrdersTable";
import { listOrders } from "@/lib/services/dashboardAdminService";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const orders = await listOrders();
  return <div className="space-y-4"><p className="text-sm text-white/50">{orders.length} pedido(s) enviado(s) ao checkout. Carrinhos ainda em edição não são exibidos.</p><RecentOrdersTable orders={orders} /></div>;
}
