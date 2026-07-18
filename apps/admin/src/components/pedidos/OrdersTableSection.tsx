import { listOrdersPaged } from "@/lib/services/orderAdminService";
import type { OrdersQuery } from "@/lib/orders/href";
import OrdersTable from "@/components/pedidos/OrdersTable";
import { requireVerifiedAdmin } from "@/lib/security/adminAuthorization";

// Async Server Component — faz a query paginada/filtrada e entrega para a tabela
// presentacional. Isolado num boundary <Suspense> na página para o skeleton.
export default async function OrdersTableSection({
  current,
  noun,
}: {
  current: OrdersQuery;
  noun: string;
}) {
  const [data, authorization] = await Promise.all([
    listOrdersPaged({
      filter: current.filter,
      period: current.period,
      search: current.q,
      page: current.page,
    }),
    requireVerifiedAdmin(),
  ]);

  return <OrdersTable data={data} current={current} noun={noun} canManageFinancial={authorization.ok && authorization.admin.role === "owner"} />;
}
