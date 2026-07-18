import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;

function base32Encode(input: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input: string): Buffer {
  const normalized = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) throw new Error("Segredo TOTP inválido.");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

function deriveKey(masterKey: string, purpose: string): Buffer {
  return createHmac("sha256", masterKey)
    .update(`ecomzero-admin-2fa:${purpose}:v1`)
    .digest();
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function generateHotp(secret: string, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", base32Decode(secret))
    .update(counterBuffer)
    .digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function generateTwoFactorSecret(): string {
  return base32Encode(randomBytes(20));
}

export function currentTotpStep(now = Date.now()): number {
  return Math.floor(now / 1_000 / TOTP_PERIOD_SECONDS);
}

export function generateTotp(secret: string, now = Date.now()): string {
  return generateHotp(secret, currentTotpStep(now));
}

export function verifyTotp(
  secret: string,
  code: string,
  now = Date.now(),
): number | null {
  const normalized = code.trim();
  if (!/^\d{6}$/.test(normalized)) return null;
  const step = currentTotpStep(now);

  for (const offset of [-1, 0, 1]) {
    const candidateStep = step + offset;
    if (candidateStep >= 0 && safeEqual(generateHotp(secret, candidateStep), normalized)) {
      return candidateStep;
    }
  }

  return null;
}

export function buildTotpUri(input: {
  secret: string;
  accountName: string;
  issuer?: string;
}): string {
  const issuer = input.issuer ?? "ECOMZERO Admin";
  const label = `${issuer}:${input.accountName}`;
  const params = new URLSearchParams({
    secret: input.secret,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

function sealJson(payload: unknown, masterKey: string, purpose: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(masterKey, purpose), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function unsealJson<T>(token: string, masterKey: string, purpose: string): T {
  const [version, ivValue, tagValue, ciphertextValue] = token.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Token de segurança inválido.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    deriveKey(masterKey, purpose),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext) as T;
}

export function encryptTwoFactorSecret(secret: string, masterKey: string): string {
  return sealJson({ secret }, masterKey, "stored-secret");
}

export function decryptTwoFactorSecret(token: string, masterKey: string): string {
  const payload = unsealJson<{ secret?: unknown }>(token, masterKey, "stored-secret");
  if (typeof payload.secret !== "string" || !payload.secret) {
    throw new Error("Segredo TOTP inválido.");
  }
  return payload.secret;
}

export function createTwoFactorSetupToken(
  input: { adminId: string; secret: string; expiresAt: number },
  masterKey: string,
): string {
  return sealJson(input, masterKey, "setup-token");
}

export function readTwoFactorSetupToken(
  token: string,
  masterKey: string,
  now = Date.now(),
): { adminId: string; secret: string } {
  const payload = unsealJson<{
    adminId?: unknown;
    secret?: unknown;
    expiresAt?: unknown;
  }>(token, masterKey, "setup-token");
  if (
    typeof payload.adminId !== "string" ||
    typeof payload.secret !== "string" ||
    typeof payload.expiresAt !== "number" ||
    payload.expiresAt < now
  ) {
    throw new Error("A configuração do 2FA expirou. Inicie novamente.");
  }
  return { adminId: payload.adminId, secret: payload.secret };
}

export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = base32Encode(randomBytes(7)).slice(0, 10);
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z2-7]/g, "");
}

export function hashRecoveryCode(code: string, masterKey: string): string {
  return createHmac("sha256", deriveKey(masterKey, "recovery-code"))
    .update(normalizeRecoveryCode(code))
    .digest("hex");
}

export function serializeRecoveryCodeHashes(codes: string[], masterKey: string): string {
  return JSON.stringify(codes.map((code) => hashRecoveryCode(code, masterKey)));
}

export function parseRecoveryCodeHashes(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && /^[a-f0-9]{64}$/.test(item)).slice(0, 20)
      : [];
  } catch {
    return [];
  }
}

export function findRecoveryCodeHash(
  code: string,
  hashes: string[],
  masterKey: string,
): string | null {
  const candidate = hashRecoveryCode(code, masterKey);
  return hashes.find((hash) => safeEqual(hash, candidate)) ?? null;
}

export function fingerprintSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex").slice(0, 12);
}
