import type { Metadata } from "next";
import OrderReturnStatus from "@/components/OrderReturnStatus";

export const metadata: Metadata = {
  title: "Pagamento pendente",
  robots: { index: false, follow: false },
};

export default async function OrderPendingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <OrderReturnStatus
      tone="pending"
      title="Pagamento em análise"
      description="Seu pedido foi registrado e o pagamento ainda está sendo processado. Aguarde a confirmação oficial antes de realizar uma nova tentativa."
      orderId={id}
    />
  );
}
