import type { Metadata } from "next";
import CheckoutForm from "@/components/CheckoutForm";
import { auth } from "@/lib/auth";
import { getCart } from "@/lib/services/cartService";
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

  return (
    <div className="min-h-screen bg-[#050505]">
      <CheckoutForm
        isLoggedIn={Boolean(session?.user?.id)}
        sessionName={session?.user?.name ?? ""}
        sessionEmail={session?.user?.email ?? ""}
        cartSubtotal={cart.total}
      />
    </div>
  );
}
