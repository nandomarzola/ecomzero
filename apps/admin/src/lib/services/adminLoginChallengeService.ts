import bcrypt from "bcryptjs";
import { config } from "@/lib/config";
import { prisma } from "@/lib/db";
import {
  ADMIN_LOGIN_CODE_TTL_MS,
  ADMIN_LOGIN_MAX_CODE_ATTEMPTS,
  adminLoginCodeMatches,
  generateAdminLoginCode,
  generateAdminLoginToken,
  hashAdminLoginCode,
  hashAdminLoginToken,
  maskAdminEmail,
  resendCooldownSeconds,
} from "@/lib/security/adminLoginChallenge";
import {
  findRecoveryCodeHash,
  parseRecoveryCodeHashes,
} from "@/lib/security/twoFactor";
import { sendAdminLoginCodeViaStorefront } from "@/lib/services/adminEmailClient";

const DUMMY_PASSWORD_HASH =
  "$2b$12$4j/YCPB6oHNSBBpPVnk2L.fpJSP1wy39KKX3Cd5.D1lPOdBTqTG3G";

export class AdminLoginChallengeError extends Error {
  constructor(
    message: string,
    readonly code:
      | "cooldown"
      | "delivery_failed"
      | "expired"
      | "invalid",
    readonly retryAfterSeconds = 0,
  ) {
    super(message);
    this.name = "AdminLoginChallengeError";
  }
}

export async function validateAdminPassword(email: string, password: string) {
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  const valid = await bcrypt.compare(
    password,
    admin?.senhaHash ?? DUMMY_PASSWORD_HASH,
  );
  return admin && valid ? admin : null;
}

type ChallengeResult = {
  challengeToken: string;
  maskedEmail: string;
  expiresAt: string;
  retryAfterSeconds: number;
  emailSent: boolean;
};

async function deliverChallenge(input: {
  challengeId: string;
  email: string;
  code: string;
  requestId: string;
}) {
  return sendAdminLoginCodeViaStorefront({
    ...input,
    expiresInMinutes: ADMIN_LOGIN_CODE_TTL_MS / 60_000,
  });
}

export async function issueAdminLoginChallenge(admin: {
  id: string;
  email: string;
}): Promise<ChallengeResult> {
  const now = new Date();
  await prisma.adminLoginChallenge.deleteMany({
    where: { expiresAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1_000) } },
  });

  const existing = await prisma.adminLoginChallenge.findUnique({
    where: { adminUserId: admin.id },
  });
  const cooldown = existing ? resendCooldownSeconds(existing.lastSentAt, now) : 0;
  if (existing && cooldown > 0) {
    throw new AdminLoginChallengeError(
      `Aguarde ${cooldown}s para solicitar outro código.`,
      "cooldown",
      cooldown,
    );
  }

  const token = generateAdminLoginToken();
  const tokenHash = hashAdminLoginToken(token, config.authSecret);
  const code = generateAdminLoginCode();
  const expiresAt = new Date(now.getTime() + ADMIN_LOGIN_CODE_TTL_MS);
  const challenge = await prisma.adminLoginChallenge.upsert({
    where: { adminUserId: admin.id },
    create: {
      adminUserId: admin.id,
      tokenHash,
      codeHash: hashAdminLoginCode(code, config.authSecret),
      expiresAt,
      attempts: 0,
      sendCount: 1,
      lastSentAt: now,
    },
    update: {
      tokenHash,
      codeHash: hashAdminLoginCode(code, config.authSecret),
      expiresAt,
      attempts: 0,
      sendCount: { increment: 1 },
      lastSentAt: now,
      consumedAt: null,
    },
  });
  const delivery = await deliverChallenge({
    challengeId: challenge.id,
    email: admin.email,
    code,
    requestId: tokenHash.slice(0, 24),
  });
  if (!delivery.ok) {
    await prisma.adminLoginChallenge.deleteMany({
      where: { id: challenge.id, tokenHash },
    });
    throw new AdminLoginChallengeError(
      "Não foi possível enviar o código agora. Tente novamente.",
      "delivery_failed",
    );
  }

  return {
    challengeToken: token,
    maskedEmail: maskAdminEmail(admin.email),
    expiresAt: expiresAt.toISOString(),
    retryAfterSeconds: resendCooldownSeconds(now, now),
    emailSent: true,
  };
}

export async function challengeRateLimitIdentity(token: string) {
  const challenge = await prisma.adminLoginChallenge.findUnique({
    where: { tokenHash: hashAdminLoginToken(token, config.authSecret) },
    select: { adminUserId: true },
  });
  return challenge?.adminUserId ?? null;
}

export async function resendAdminLoginChallenge(
  token: string,
): Promise<ChallengeResult> {
  const tokenHash = hashAdminLoginToken(token, config.authSecret);
  const challenge = await prisma.adminLoginChallenge.findUnique({
    where: { tokenHash },
    include: { adminUser: { select: { email: true } } },
  });
  const now = new Date();
  if (!challenge || challenge.consumedAt || challenge.expiresAt <= now) {
    throw new AdminLoginChallengeError(
      "A verificação expirou. Volte e entre novamente.",
      "expired",
    );
  }
  const cooldown = resendCooldownSeconds(challenge.lastSentAt, now);
  if (cooldown > 0) {
    throw new AdminLoginChallengeError(
      `Aguarde ${cooldown}s para reenviar.`,
      "cooldown",
      cooldown,
    );
  }

  const code = generateAdminLoginCode();
  const nextState = {
    codeHash: hashAdminLoginCode(code, config.authSecret),
    expiresAt: new Date(now.getTime() + ADMIN_LOGIN_CODE_TTL_MS),
    attempts: 0,
    sendCount: challenge.sendCount + 1,
    lastSentAt: now,
  };
  await prisma.adminLoginChallenge.update({
    where: { id: challenge.id },
    data: nextState,
  });
  const delivery = await deliverChallenge({
    challengeId: challenge.id,
    email: challenge.adminUser.email,
    code,
    requestId: `${tokenHash.slice(0, 16)}-${nextState.sendCount}`,
  });
  if (!delivery.ok) {
    await prisma.adminLoginChallenge.updateMany({
      where: { id: challenge.id, tokenHash },
      data: {
        codeHash: challenge.codeHash,
        expiresAt: challenge.expiresAt,
        attempts: challenge.attempts,
        sendCount: challenge.sendCount,
        lastSentAt: challenge.lastSentAt,
      },
    });
    throw new AdminLoginChallengeError(
      "Não foi possível reenviar o código agora.",
      "delivery_failed",
    );
  }

  return {
    challengeToken: token,
    maskedEmail: maskAdminEmail(challenge.adminUser.email),
    expiresAt: nextState.expiresAt.toISOString(),
    retryAfterSeconds: resendCooldownSeconds(now, now),
    emailSent: true,
  };
}

export async function consumeAdminEmailChallenge(token: string, code: string) {
  const tokenHash = hashAdminLoginToken(token, config.authSecret);
  const challenge = await prisma.adminLoginChallenge.findUnique({
    where: { tokenHash },
    include: { adminUser: true },
  });
  const now = new Date();
  if (
    !challenge ||
    challenge.consumedAt ||
    challenge.expiresAt <= now ||
    challenge.attempts >= ADMIN_LOGIN_MAX_CODE_ATTEMPTS
  ) {
    return null;
  }
  if (!adminLoginCodeMatches(code, challenge.codeHash, config.authSecret)) {
    await prisma.adminLoginChallenge.updateMany({
      where: {
        id: challenge.id,
        consumedAt: null,
        attempts: { lt: ADMIN_LOGIN_MAX_CODE_ATTEMPTS },
      },
      data: { attempts: { increment: 1 } },
    });
    return null;
  }
  const consumed = await prisma.adminLoginChallenge.updateMany({
    where: {
      id: challenge.id,
      tokenHash,
      codeHash: challenge.codeHash,
      consumedAt: null,
      expiresAt: { gt: now },
      attempts: { lt: ADMIN_LOGIN_MAX_CODE_ATTEMPTS },
    },
    data: { consumedAt: now },
  });
  return consumed.count === 1 ? challenge.adminUser : null;
}

export async function consumeAdminRecoveryChallenge(
  token: string,
  recoveryCode: string,
) {
  const tokenHash = hashAdminLoginToken(token, config.authSecret);
  const challenge = await prisma.adminLoginChallenge.findUnique({
    where: { tokenHash },
    include: { adminUser: true },
  });
  const now = new Date();
  if (!challenge || challenge.consumedAt || challenge.expiresAt <= now) return null;
  const hashes = parseRecoveryCodeHashes(
    challenge.adminUser.twoFactorRecoveryCodeHashes,
  );
  const matched = findRecoveryCodeHash(
    recoveryCode,
    hashes,
    config.authSecret,
  );
  if (!matched) return null;
  const remaining = JSON.stringify(hashes.filter((hash) => hash !== matched));

  try {
    await prisma.$transaction(async (transaction) => {
      const consumed = await transaction.adminLoginChallenge.updateMany({
        where: {
          id: challenge.id,
          tokenHash,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });
      const recoveryConsumed = await transaction.adminUser.updateMany({
        where: {
          id: challenge.adminUser.id,
          twoFactorRecoveryCodeHashes:
            challenge.adminUser.twoFactorRecoveryCodeHashes,
        },
        data: { twoFactorRecoveryCodeHashes: remaining },
      });
      if (consumed.count !== 1 || recoveryConsumed.count !== 1) {
        throw new Error("Desafio já consumido.");
      }
    });
    return challenge.adminUser;
  } catch {
    return null;
  }
}

export async function cancelAdminLoginChallenge(token: string) {
  await prisma.adminLoginChallenge.deleteMany({
    where: { tokenHash: hashAdminLoginToken(token, config.authSecret) },
  });
}
