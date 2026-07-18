import { createHash, randomBytes } from "node:crypto";

export const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1_000;
export const PASSWORD_RESET_REQUEST_COOLDOWN_MS = 60 * 1_000;

export function createPasswordResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isPasswordResetTokenUsable(
  token: { expiresAt: Date; usedAt: Date | null },
  now = new Date(),
): boolean {
  return token.usedAt === null && token.expiresAt.getTime() > now.getTime();
}
