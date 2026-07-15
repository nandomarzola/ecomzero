import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CheckoutIdentification from "@/components/CheckoutIdentification";
import { auth } from "@/lib/auth";
import { getCart } from "@/lib/services/cartService";
import { getCartSessionId } from "@/lib/session";

export const metadata: Metadata = {
  title: "Identificação",
  description: "Entre ou crie sua conta para finalizar a compra.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutIdentificationPage() {
  const [session, sessionId] = await Promise.all([auth(), getCartSessionId()]);

  if (session?.user?.id) {
    redirect("/checkout");
  }

  const cart = await getCart(sessionId);
  if (cart.items.length === 0) {
    redirect("/carrinho");
  }

  return <CheckoutIdentification />;
}
