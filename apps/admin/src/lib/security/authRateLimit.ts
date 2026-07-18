import { headers } from "next/headers";
import { prisma } from "@/lib/db";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

export function rateLimitKey(scope: string, value: string): string {
  return `${scope}:${(value || "").trim().toLowerCase() || "desconhecido"}`;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "desconhecido"
  );
}

/** true quando o identificador já estourou `max` tentativas na janela atual. */
export async function isRateLimited(
  identifier: string,
  max: number,
): Promise<boolean> {
  const existing = await prisma.authRateLimit.findUnique({
    where: { identifier },
  });
  if (!existing) return false;
  if (Date.now() - existing.windowStart.getTime() > WINDOW_MS) return false;
  return existing.count >= max;
}

/** Conta +1 tentativa, iniciando nova janela se a anterior expirou. */
export async function registerAttempt(identifier: string): Promise<void> {
  const now = new Date();
  const existing = await prisma.authRateLimit.findUnique({
    where: { identifier },
  });
  if (!existing || now.getTime() - existing.windowStart.getTime() > WINDOW_MS) {
    await prisma.authRateLimit.upsert({
      where: { identifier },
      create: { identifier, count: 1, windowStart: now },
      update: { count: 1, windowStart: now },
    });
    return;
  }
  await prisma.authRateLimit.update({
    where: { identifier },
    data: { count: { increment: 1 } },
  });
}

/** Zera o contador — chamar após login bem-sucedido. */
export async function clearAttempts(identifier: string): Promise<void> {
  await prisma.authRateLimit.deleteMany({ where: { identifier } });
}
