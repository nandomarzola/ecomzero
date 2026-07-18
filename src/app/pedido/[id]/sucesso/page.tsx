import type { Metadata } from "next";
import OrderReturnStatus from "@/components/OrderReturnStatus";
import { resolveOrderReturnStatus } from "@/lib/paymentReturn";

export const metadata: Metadata = {
  title: "Pedido recebido",
  robots: { index: false, follow: false },
};

export default async function OrderSuccessPage({
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
      tone="success"
      title="Recebemos seu pedido"
      description="O retorno do pagamento foi concluído. Agora estamos aguardando a confirmação oficial do Mercado Pago para atualizar seu pedido."
      orderId={id}
      initialOrderStatus={order?.status ?? null}
      initialPurchaseData={order ? { total: order.total, items: order.items } : null}
    />
  );
}
