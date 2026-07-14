import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { config } from "@/lib/config";

const CART_COOKIE = "ecomzero_cart_session";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 dias

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
