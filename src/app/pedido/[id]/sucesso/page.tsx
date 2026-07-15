import type { Metadata } from "next";
import OrderReturnStatus from "@/components/OrderReturnStatus";

export const metadata: Metadata = {
  title: "Pedido recebido",
  robots: { index: false, follow: false },
};

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <OrderReturnStatus
      tone="success"
      title="Recebemos seu pedido"
      description="O retorno do pagamento foi concluído. Agora estamos aguardando a confirmação oficial do Mercado Pago para atualizar seu pedido."
      orderId={id}
    />
  );
}
