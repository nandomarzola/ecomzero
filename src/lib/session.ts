import { cookies } from "next/headers";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { config } from "@/lib/config";

const CART_COOKIE = "ecomzero_cart_session";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 dias
const CHECKOUT_ORDER_COOKIE = "ecomzero_checkout_order";
const CHECKOUT_ORDER_COOKIE_MAX_AGE = 60 * 60 * 24;

function setCartCookie(
  store: Awaited<ReturnType<typeof cookies>>,
  sessionId: string,
): void {
  store.set(CART_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.nodeEnv === "production",
    maxAge: CART_COOKIE_MAX_AGE,
    path: "/",
  });
}

// Leitura — segura em Server Components (não grava cookie).
export async function getCartSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value ?? null;
}

// Grava cookie — só pode ser chamada de Server Action/Route Handler.
export async function getOrCreateCartSessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CART_COOKIE)?.value;
  if (existing) return existing;

  const sessionId = randomUUID();
  setCartCookie(store, sessionId);
  return sessionId;
}

export async function rotateCartSessionId(): Promise<string> {
  const store = await cookies();
  const sessionId = randomUUID();
  setCartCookie(store, sessionId);
  return sessionId;
}

function verifyCheckoutOrderCookie(value: string | undefined): string | null {
  if (!value) return null;

  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;
  const storedOrderId = value.slice(0, separator);
  const storedSignature = value.slice(separator + 1);
  const expectedSignature = signCheckoutOrder(storedOrderId);
  const storedBuffer = Buffer.from(storedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    storedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(storedBuffer, expectedBuffer)
  ) {
    return null;
  }
  return storedOrderId;
}

export async function getCheckoutOrderAccessId(): Promise<string | null> {
  const store = await cookies();
  return verifyCheckoutOrderCookie(store.get(CHECKOUT_ORDER_COOKIE)?.value);
}

function signCheckoutOrder(orderId: string): string {
  return createHmac("sha256", config.authSecret)
    .update(orderId)
    .digest("base64url");
}

export async function setCheckoutOrderAccess(orderId: string): Promise<void> {
  const store = await cookies();
  const signature = signCheckoutOrder(orderId);
  store.set(CHECKOUT_ORDER_COOKIE, `${orderId}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.nodeEnv === "production",
    maxAge: CHECKOUT_ORDER_COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function hasCheckoutOrderAccess(orderId: string): Promise<boolean> {
  return (await getCheckoutOrderAccessId()) === orderId;
}
