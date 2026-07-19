import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

export const ADMIN_LOGIN_CODE_TTL_MS = 10 * 60 * 1_000;
export const ADMIN_LOGIN_RESEND_COOLDOWN_SECONDS = 60;
export const ADMIN_LOGIN_MAX_CODE_ATTEMPTS = 5;
export const ADMIN_LOGIN_MAX_SENDS_PER_WINDOW = 5;

function hmac(value: string, masterKey: string, purpose: string): string {
  return createHmac("sha256", masterKey)
    .update(`ecomzero-admin-login:${purpose}:v1:${value}`)
    .digest("hex");
}

export function generateAdminLoginCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function generateAdminLoginToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashAdminLoginToken(token: string, masterKey: string): string {
  return hmac(token, masterKey, "challenge-token");
}

export function hashAdminLoginCode(code: string, masterKey: string): string {
  return hmac(code.trim(), masterKey, "email-code");
}

export function adminLoginCodeMatches(
  code: string,
  expectedHash: string,
  masterKey: string,
): boolean {
  if (!/^\d{6}$/.test(code.trim())) return false;
  const candidate = Buffer.from(hashAdminLoginCode(code, masterKey));
  const expected = Buffer.from(expectedHash);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function maskAdminEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "e-mail cadastrado";
  const visible = localPart.charAt(0);
  return `${visible}${"*".repeat(Math.max(2, Math.min(4, localPart.length - 1)))}@${domain}`;
}

export function resendCooldownSeconds(
  lastSentAt: Date,
  now = new Date(),
): number {
  const elapsed = Math.floor((now.getTime() - lastSentAt.getTime()) / 1_000);
  return Math.max(0, ADMIN_LOGIN_RESEND_COOLDOWN_SECONDS - elapsed);
}
