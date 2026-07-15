import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import MercadoPagoPayment from "@/components/MercadoPagoPayment";
import { auth } from "@/lib/auth";
import { config } from "@/lib/config";
import { hasCheckoutOrderAccess } from "@/lib/session";
import {
  getOrderPaymentPageData,
  OrderPaymentServiceError,
} from "@/lib/services/orderPaymentService";
import { paymentOrderIdSchema } from "@/lib/validation/payment";

export const metadata: Metadata = {
  title: "Pagamento",
  robots: { index: false, follow: false },
};

type PaymentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PaymentPage({ params }: PaymentPageProps) {
  const parsedId = paymentOrderIdSchema.safeParse((await params).id);
  if (!parsedId.success) notFound();

  const [session, hasGuestAccess] = await Promise.all([
    auth(),
    hasCheckoutOrderAccess(parsedId.data),
  ]);

  let order;
  try {
    order = await getOrderPaymentPageData(parsedId.data, {
      userId: session?.user?.id ?? null,
      hasGuestAccess,
    });
  } catch (error) {
    if (error instanceof OrderPaymentServiceError) {
      if (error.code === "ORDER_NOT_FOUND") notFound();
      redirect("/carrinho");
    }
    throw error;
  }

  if (order.status === "pago") {
    redirect(`/pedido/${order.orderId}/sucesso`);
  }
  if (order.status === "cancelado") {
    redirect(`/pedido/${order.orderId}/falha`);
  }
  if (!config.mercadoPago.publicKey || !config.mercadoPago.accessToken) {
    return (
      <div className="min-h-[65vh] bg-[#050505] px-4 py-20">
        <section className="mx-auto max-w-[620px] rounded-xl border border-red-400/20 bg-red-400/[0.05] p-7 text-center">
          <h1 className="font-display text-2xl font-extrabold text-white">
            Pagamento temporariamente indisponível
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/50">
            Seu pedido foi salvo. Tente novamente em alguns instantes.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <MercadoPagoPayment
        order={order}
        publicKey={config.mercadoPago.publicKey}
      />
    </div>
  );
}
