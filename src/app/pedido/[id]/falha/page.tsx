import type { Metadata } from "next";
import OrderReturnStatus from "@/components/OrderReturnStatus";

export const metadata: Metadata = {
  title: "Pagamento não concluído",
  robots: { index: false, follow: false },
};

export default async function OrderFailurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <OrderReturnStatus
      tone="failure"
      title="Pagamento não concluído"
      description="Não recebemos uma confirmação de pagamento. Seu pedido continua aguardando pagamento e nenhuma aprovação será presumida por esta tela."
      orderId={id}
    />
  );
}
