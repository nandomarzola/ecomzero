"use server";

import { createHash } from "node:crypto";
import { z } from "zod";
import {
  ADMIN_LOGIN_MAX_SENDS_PER_WINDOW,
} from "@/lib/security/adminLoginChallenge";
import {
  clearAttempts,
  clientIp,
  isRateLimited,
  rateLimitKey,
  registerAttempt,
} from "@/lib/security/authRateLimit";
import {
  AdminLoginChallengeError,
  cancelAdminLoginChallenge,
  challengeRateLimitIdentity,
  issueAdminLoginChallenge,
  resendAdminLoginChallenge,
  validateAdminPassword,
} from "@/lib/services/adminLoginChallengeService";

const LOGIN_MAX_FAILURES = 5;

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe a senha"),
});

const challengeSchema = z.object({
  challengeToken: z.string().min(40).max(100),
});

function challengeError(error: unknown) {
  if (error instanceof AdminLoginChallengeError) {
    return {
      ok: false as const,
      error: error.message,
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }
  return {
    ok: false as const,
    error: "Não foi possível iniciar a verificação. Tente novamente.",
    retryAfterSeconds: 0,
  };
}

export async function beginAdminLoginAction(input: unknown) {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos.", retryAfterSeconds: 0 };
  }
  const ip = await clientIp();
  const ipKey = rateLimitKey("login-admin-ip", ip);
  const emailKey = rateLimitKey("login-admin-email", parsed.data.email);
  if (
    (await isRateLimited(ipKey, LOGIN_MAX_FAILURES)) ||
    (await isRateLimited(emailKey, LOGIN_MAX_FAILURES))
  ) {
    return { ok: false as const, error: "Muitas tentativas. Aguarde alguns minutos.", retryAfterSeconds: 0 };
  }

  const admin = await validateAdminPassword(
    parsed.data.email,
    parsed.data.password,
  );
  if (!admin) {
    await Promise.all([registerAttempt(ipKey), registerAttempt(emailKey)]);
    return { ok: false as const, error: "E-mail ou senha inválidos.", retryAfterSeconds: 0 };
  }
  await Promise.all([clearAttempts(ipKey), clearAttempts(emailKey)]);
  if (!admin.twoFactorEnabled) {
    return { ok: true as const, requiresVerification: false as const };
  }

  const sendIpKey = rateLimitKey("admin-login-code-send-ip", ip);
  const sendAdminKey = rateLimitKey("admin-login-code-send-admin", admin.id);
  if (
    (await isRateLimited(sendIpKey, ADMIN_LOGIN_MAX_SENDS_PER_WINDOW)) ||
    (await isRateLimited(sendAdminKey, ADMIN_LOGIN_MAX_SENDS_PER_WINDOW))
  ) {
    return { ok: false as const, error: "Limite de envios atingido. Aguarde 15 minutos.", retryAfterSeconds: 0 };
  }

  try {
    const challenge = await issueAdminLoginChallenge(admin);
    if (challenge.emailSent) {
      await Promise.all([
        registerAttempt(sendIpKey),
        registerAttempt(sendAdminKey),
      ]);
    }
    return {
      ok: true as const,
      requiresVerification: true as const,
      ...challenge,
    };
  } catch (error) {
    return challengeError(error);
  }
}

export async function resendAdminLoginCodeAction(input: unknown) {
  const parsed = challengeSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Verificação inválida.", retryAfterSeconds: 0 };
  const ip = await clientIp();
  const identity = await challengeRateLimitIdentity(parsed.data.challengeToken);
  if (!identity) return { ok: false as const, error: "A verificação expirou. Entre novamente.", retryAfterSeconds: 0 };
  const tokenFingerprint = createHash("sha256").update(parsed.data.challengeToken).digest("hex").slice(0, 32);
  const keys = [
    rateLimitKey("admin-login-code-resend-ip", ip),
    rateLimitKey("admin-login-code-resend-admin", identity),
    rateLimitKey("admin-login-code-resend-token", tokenFingerprint),
  ];
  if ((await Promise.all(keys.map((key) => isRateLimited(key, ADMIN_LOGIN_MAX_SENDS_PER_WINDOW)))).some(Boolean)) {
    return { ok: false as const, error: "Limite de reenvios atingido. Aguarde 15 minutos.", retryAfterSeconds: 0 };
  }
  try {
    const challenge = await resendAdminLoginChallenge(parsed.data.challengeToken);
    await Promise.all(keys.map(registerAttempt));
    return { ok: true as const, ...challenge };
  } catch (error) {
    return challengeError(error);
  }
}

export async function cancelAdminLoginChallengeAction(input: unknown) {
  const parsed = challengeSchema.safeParse(input);
  if (parsed.success) await cancelAdminLoginChallenge(parsed.data.challengeToken);
  return { ok: true as const };
}
