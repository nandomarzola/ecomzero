import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CheckoutIdentification from "@/components/CheckoutIdentification";
import { auth } from "@/lib/auth";
import { config } from "@/lib/config";
import { getOAuthAvailability } from "@/lib/security/oauth";
import { getCart } from "@/lib/services/cartService";
import { getCartSessionId, getCheckoutOrderAccessId } from "@/lib/session";

export const metadata: Metadata = {
  title: "Identificação",
  description: "Entre ou crie sua conta para finalizar a compra.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutIdentificationPage() {
  const [session, sessionId, signedOrderId] = await Promise.all([
    auth(),
    getCartSessionId(),
    getCheckoutOrderAccessId(),
  ]);

  if (session?.user?.id) {
    redirect("/checkout");
  }

  const cart = await getCart(sessionId, {
    signedOrderId,
    userId: null,
  });
  if (cart.items.length === 0) {
    redirect("/carrinho");
  }
  if (cart.status === "aguardando_pagamento" && cart.id) {
    redirect(`/checkout/pagamento/${cart.id}`);
  }

  return (
    <CheckoutIdentification
      oauthAvailability={getOAuthAvailability(config.oauth)}
    />
  );
}
