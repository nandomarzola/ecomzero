import type { Metadata } from "next";
import OrderReturnStatus from "@/components/OrderReturnStatus";
import { resolveOrderReturnStatus } from "@/lib/paymentReturn";

export const metadata: Metadata = {
  title: "Pagamento não concluído",
  robots: { index: false, follow: false },
};

export default async function OrderFailurePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const order = await resolveOrderReturnStatus(id, await searchParams);
  return (
    <OrderReturnStatus
      tone="failure"
      title="Pagamento não concluído"
      description="Não recebemos uma confirmação de pagamento. Seu pedido continua aguardando pagamento e nenhuma aprovação será presumida por esta tela."
      orderId={id}
      initialOrderStatus={order?.status ?? null}
      initialPurchaseData={order?.status === "pago" ? { total: order.total, items: order.items } : null}
    />
  );
}
