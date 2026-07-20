import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CheckoutForm from "@/components/CheckoutForm";
import { auth } from "@/lib/auth";
import { getCart, reconcileCartCoupon } from "@/lib/services/cartService";
import { qualifiesForFreeShipping } from "@/lib/shippingPolicy";
import { getCartSessionId, getCheckoutOrderAccessId } from "@/lib/session";

export const metadata: Metadata = {
  title: "Finalizar compra",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const [session, sessionId, signedOrderId] = await Promise.all([
    auth(),
    getCartSessionId(),
    getCheckoutOrderAccessId(),
  ]);
  if (!session?.user?.id) {
    redirect("/checkout/identificacao");
  }
  const recoveredCart = await getCart(sessionId, {
    signedOrderId,
    userId: session.user.id,
  });
  if (
    recoveredCart.status === "aguardando_pagamento" &&
    recoveredCart.id
  ) {
    redirect(`/checkout/pagamento/${recoveredCart.id}`);
  }
  const { cart } = await reconcileCartCoupon(sessionId, {
    userId: session.user.id,
    email: session.user.email ?? null,
  });

  return (
    <div className="min-h-screen bg-[#050505]">
      <CheckoutForm
        isLoggedIn
        sessionName={session?.user?.name ?? ""}
        sessionEmail={session?.user?.email ?? ""}
        cartSubtotal={cart.subtotal}
        cartDiscount={cart.discount}
        freeShipping={qualifiesForFreeShipping(
          cart.subtotal,
          cart.coupon?.freeShipping,
        )}
      />
    </div>
  );
}
