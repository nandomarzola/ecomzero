"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getCartSessionId, getOrCreateCartSessionId } from "@/lib/session";
import * as cartService from "@/lib/services/cartService";
import { CouponError, normalizeCode } from "@/lib/services/couponService";
import {
  addToCartSchema,
  removeCartItemSchema,
  updateCartItemSchema,
} from "@/lib/validation/cart";
import type { Cart } from "@/types/cart";

// Actions "burras": validam com Zod, chamam o service, revalidam as rotas
// afetadas. Nenhuma regra de negócio aqui — isso vive em cartService.

export type CartActionResult =
  | { success: true; cart: Cart }
  | { success: false; error: string };

function getCartActionError(error: unknown, fallback: string): CartActionResult {
  if (error instanceof cartService.CartQuantityLimitError) {
    return { success: false, error: error.message };
  }

  return { success: false, error: fallback };
}

// Contagem do carrinho não vive em nenhuma página server-rendered (o badge no
// Header é hidratado no client via CartProvider) — só /carrinho precisa
// revalidar; "/" fica de fora de propósito para continuar estático.
function revalidateCart() {
  revalidatePath("/carrinho");
}

export async function addToCartAction(input: unknown): Promise<CartActionResult> {
  const parsed = addToCartSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };

  const sessionId = await getOrCreateCartSessionId();
  try {
    const cart = await cartService.addItem(
      sessionId,
      parsed.data.variantId,
      parsed.data.quantidade,
    );
    revalidateCart();
    return { success: true, cart };
  } catch (error) {
    return getCartActionError(error, "Não foi possível adicionar ao carrinho");
  }
}

export async function updateCartItemAction(input: unknown): Promise<CartActionResult> {
  const parsed = updateCartItemSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };

  const sessionId = await getCartSessionId();
  if (!sessionId) return { success: false, error: "Carrinho não encontrado" };

  try {
    const cart = await cartService.updateItemQuantity(
      sessionId,
      parsed.data.itemId,
      parsed.data.quantidade,
    );
    revalidateCart();
    return { success: true, cart };
  } catch (error) {
    return getCartActionError(error, "Não foi possível atualizar a quantidade");
  }
}

export async function removeCartItemAction(input: unknown): Promise<CartActionResult> {
  const parsed = removeCartItemSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };

  const sessionId = await getCartSessionId();
  if (!sessionId) return { success: false, error: "Carrinho não encontrado" };

  try {
    const cart = await cartService.removeItem(sessionId, parsed.data.itemId);
    revalidateCart();
    return { success: true, cart };
  } catch {
    return { success: false, error: "Não foi possível remover o item" };
  }
}

export async function applyCouponAction(code: unknown): Promise<CartActionResult> {
  if (typeof code !== "string" || normalizeCode(code).length < 3) {
    return { success: false, error: "Informe um código de cupom válido." };
  }
  const sessionId = await getCartSessionId();
  if (!sessionId) return { success: false, error: "Carrinho não encontrado." };

  try {
    const cart = await cartService.applyCoupon(sessionId, code);
    revalidateCart();
    return { success: true, cart };
  } catch (error) {
    if (error instanceof CouponError) return { success: false, error: error.message };
    return { success: false, error: "Não foi possível aplicar o cupom." };
  }
}

export async function autoApplyFirstPurchaseCouponAction(code: unknown): Promise<CartActionResult> {
  if (typeof code !== "string" || normalizeCode(code).length < 3) {
    return { success: false, error: "Campanha inválida." };
  }
  const sessionId = await getCartSessionId();
  if (!sessionId) return { success: false, error: "Carrinho não encontrado." };
  const session = await auth();

  try {
    const cart = await cartService.autoApplyFirstPurchaseCoupon(sessionId, code, {
      userId: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
    });
    revalidateCart();
    return { success: true, cart };
  } catch (error) {
    if (error instanceof CouponError) return { success: false, error: error.message };
    return { success: false, error: "Não foi possível aplicar o benefício automaticamente." };
  }
}

export async function removeCouponAction(): Promise<CartActionResult> {
  const sessionId = await getCartSessionId();
  if (!sessionId) return { success: false, error: "Carrinho não encontrado." };

  try {
    const cart = await cartService.removeCoupon(sessionId);
    revalidateCart();
    return { success: true, cart };
  } catch {
    return { success: false, error: "Não foi possível remover o cupom." };
  }
}

export async function clearCartItemsAction(): Promise<CartActionResult> {
  const sessionId = await getCartSessionId();
  if (!sessionId) return { success: true, cart: await cartService.getCart(null) };

  try {
    const cart = await cartService.clearCart(sessionId);
    revalidateCart();
    return { success: true, cart };
  } catch {
    return { success: false, error: "Não foi possível limpar o carrinho." };
  }
}

// Chamada pelo client (CartProvider) para hidratar/atualizar o badge do
// Header — não afeta a classificação estática/dinâmica de nenhuma rota,
// já que Server Actions rodam sob demanda, fora da renderização da página.
export async function getCartSummaryAction(): Promise<{ itemCount: number }> {
  const sessionId = await getCartSessionId();
  const cart = await cartService.getCart(sessionId);
  return { itemCount: cart.itemCount };
}

export async function getCartAction(): Promise<Cart> {
  const sessionId = await getCartSessionId();
  return cartService.getCart(sessionId);
}
