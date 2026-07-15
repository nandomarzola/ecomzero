import type { Metadata } from "next";
import OrderReturnStatus from "@/components/OrderReturnStatus";
import { resolveOrderReturnStatus } from "@/lib/paymentReturn";

export const metadata: Metadata = {
  title: "Pagamento pendente",
  robots: { index: false, follow: false },
};

export default async function OrderPendingPage({
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
      tone="pending"
      title="Pagamento em análise"
      description="Seu pedido foi registrado e o pagamento ainda está sendo processado. Aguarde a confirmação oficial antes de realizar uma nova tentativa."
      orderId={id}
      initialOrderStatus={order?.status ?? null}
    />
  );
}
