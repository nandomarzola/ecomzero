import { timingSafeEqual } from "node:crypto";

/** Comparação de strings em tempo constante (evita vazar o segredo por timing). */
export function safeCompare(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
