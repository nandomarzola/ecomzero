import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const ADMIN_PASSWORD_RESET_TTL_MS = 30 * 60 * 1_000;

type ResetTokenPayload = {
  version: 1;
  adminUserId: string;
  expiresAt: number;
  nonce: string;
};

function parseToken(token: string): {
  encodedPayload: string;
  signature: Buffer;
  payload: ResetTokenPayload;
} | null {
  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<ResetTokenPayload>;
    const signature = Buffer.from(encodedSignature, "base64url");
    if (
      payload.version !== 1 ||
      typeof payload.adminUserId !== "string" ||
      payload.adminUserId.length < 20 ||
      typeof payload.expiresAt !== "number" ||
      !Number.isSafeInteger(payload.expiresAt) ||
      typeof payload.nonce !== "string" ||
      payload.nonce.length < 20 ||
      signature.length !== 32
    ) {
      return null;
    }

    return {
      encodedPayload,
      signature,
      payload: payload as ResetTokenPayload,
    };
  } catch {
    return null;
  }
}

function signPayload(
  encodedPayload: string,
  passwordHash: string,
  secret: string,
) {
  return createHmac("sha256", secret)
    .update(encodedPayload, "utf8")
    .update("\0", "utf8")
    .update(passwordHash, "utf8")
    .digest();
}

export function createAdminPasswordResetToken(input: {
  adminUserId: string;
  passwordHash: string;
  secret: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const expiresAt = now.getTime() + ADMIN_PASSWORD_RESET_TTL_MS;
  const payload: ResetTokenPayload = {
    version: 1,
    adminUserId: input.adminUserId,
    expiresAt,
    nonce: randomBytes(24).toString("base64url"),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = signPayload(
    encodedPayload,
    input.passwordHash,
    input.secret,
  ).toString("base64url");

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date(expiresAt),
  };
}

export function getAdminPasswordResetSubject(
  token: string,
  now = new Date(),
): string | null {
  const parsed = parseToken(token);
  if (!parsed || parsed.payload.expiresAt <= now.getTime()) return null;
  if (
    parsed.payload.expiresAt >
    now.getTime() + ADMIN_PASSWORD_RESET_TTL_MS + 60_000
  ) {
    return null;
  }
  return parsed.payload.adminUserId;
}

export function verifyAdminPasswordResetToken(input: {
  token: string;
  adminUserId: string;
  passwordHash: string;
  secret: string;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  const parsed = parseToken(input.token);
  if (
    !parsed ||
    parsed.payload.adminUserId !== input.adminUserId ||
    parsed.payload.expiresAt <= now.getTime() ||
    parsed.payload.expiresAt >
      now.getTime() + ADMIN_PASSWORD_RESET_TTL_MS + 60_000
  ) {
    return false;
  }

  const expected = signPayload(
    parsed.encodedPayload,
    input.passwordHash,
    input.secret,
  );
  return timingSafeEqual(parsed.signature, expected);
}
