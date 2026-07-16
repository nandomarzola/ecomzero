import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CheckoutForm from "@/components/CheckoutForm";
import { auth } from "@/lib/auth";
import { getCart } from "@/lib/services/cartService";
import { qualifiesForFreeShipping } from "@/lib/shippingPolicy";
import { getCartSessionId } from "@/lib/session";

export const metadata: Metadata = {
  title: "Finalizar compra",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const [session, sessionId] = await Promise.all([
    auth(),
    getCartSessionId(),
  ]);
  const cart = await getCart(sessionId);

  if (!session?.user?.id) {
    redirect("/checkout/identificacao");
  }

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
