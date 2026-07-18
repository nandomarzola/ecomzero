"use server";

import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { z } from "zod";
import { auth } from "@/auth";
import { config } from "@/lib/config";
import { prisma } from "@/lib/db";
import {
  buildTotpUri,
  createTwoFactorSetupToken,
  encryptTwoFactorSecret,
  generateRecoveryCodes,
  generateTwoFactorSecret,
  parseRecoveryCodeHashes,
  readTwoFactorSetupToken,
  serializeRecoveryCodeHashes,
  verifyTotp,
} from "@/lib/security/twoFactor";
import { verifyAndConsumeAdminSecondFactor } from "@/lib/services/adminTwoFactorService";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual"),
});

const changePasswordSchema = passwordSchema.extend({
  newPassword: z.string().min(10, "A nova senha deve ter pelo menos 10 caracteres").max(128),
  confirmPassword: z.string(),
}).superRefine((input, context) => {
  if (!/[a-z]/.test(input.newPassword) || !/[A-Z]/.test(input.newPassword) || !/\d/.test(input.newPassword)) {
    context.addIssue({ code: "custom", path: ["newPassword"], message: "Use letra maiúscula, minúscula e número" });
  }
  if (input.newPassword !== input.confirmPassword) {
    context.addIssue({ code: "custom", path: ["confirmPassword"], message: "A confirmação da nova senha não confere" });
  }
  if (input.currentPassword === input.newPassword) {
    context.addIssue({ code: "custom", path: ["newPassword"], message: "A nova senha deve ser diferente da atual" });
  }
});

const enableTwoFactorSchema = z.object({
  setupToken: z.string().min(20),
  code: z.string().trim().regex(/^\d{6}$/, "Informe o código de 6 dígitos"),
});

const protectedTwoFactorSchema = passwordSchema.extend({
  code: z.string().trim().min(6, "Informe o código do autenticador ou de recuperação"),
});

type BasicResult = { ok: true; reauthenticate?: boolean } | { ok: false; error: string };

async function currentAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.adminUser.findUnique({ where: { id: session.user.id } });
}

async function verifyCurrentPassword(admin: { senhaHash: string }, password: string) {
  return bcrypt.compare(password, admin.senhaHash);
}

export async function getAdminSecurityStatus() {
  const admin = await currentAdmin();
  if (!admin) return null;
  return {
    role: admin.role,
    twoFactorEnabled: admin.twoFactorEnabled,
    twoFactorEnabledAt: admin.twoFactorEnabledAt?.toISOString() ?? null,
    recoveryCodesRemaining: parseRecoveryCodeHashes(
      admin.twoFactorRecoveryCodeHashes,
    ).length,
  };
}

export async function changeAdminPasswordAction(input: unknown): Promise<BasicResult> {
  const admin = await currentAdmin();
  if (!admin) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  if (!(await verifyCurrentPassword(admin, parsed.data.currentPassword))) {
    return { ok: false, error: "A senha atual está incorreta." };
  }

  const senhaHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { senhaHash, sessionsValidAfter: new Date() },
  });
  return { ok: true, reauthenticate: true };
}

export async function revokeAdminSessionsAction(input: unknown): Promise<BasicResult> {
  const admin = await currentAdmin();
  if (!admin) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  if (!(await verifyCurrentPassword(admin, parsed.data.currentPassword))) {
    return { ok: false, error: "A senha atual está incorreta." };
  }
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { sessionsValidAfter: new Date() },
  });
  return { ok: true, reauthenticate: true };
}

export async function beginAdminTwoFactorSetupAction(input: unknown) {
  const admin = await currentAdmin();
  if (!admin) return { ok: false as const, error: "Sessão expirada. Faça login novamente." };
  if (admin.twoFactorEnabled) return { ok: false as const, error: "O 2FA já está ativo nesta conta." };
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  if (!(await verifyCurrentPassword(admin, parsed.data.currentPassword))) {
    return { ok: false as const, error: "A senha atual está incorreta." };
  }

  const secret = generateTwoFactorSecret();
  const provisioningUri = buildTotpUri({
    secret,
    accountName: admin.email,
  });
  const setupToken = createTwoFactorSetupToken(
    { adminId: admin.id, secret, expiresAt: Date.now() + 10 * 60 * 1_000 },
    config.authSecret,
  );
  const qrCodeDataUrl = await QRCode.toDataURL(provisioningUri, {
    width: 240,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#050505", light: "#FFFFFF" },
  });
  return {
    ok: true as const,
    secret,
    setupToken,
    qrCodeDataUrl,
  };
}

export async function enableAdminTwoFactorAction(input: unknown) {
  const admin = await currentAdmin();
  if (!admin) return { ok: false as const, error: "Sessão expirada. Faça login novamente." };
  if (admin.twoFactorEnabled) return { ok: false as const, error: "O 2FA já está ativo nesta conta." };
  const parsed = enableTwoFactorSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    const setup = readTwoFactorSetupToken(
      parsed.data.setupToken,
      config.authSecret,
    );
    if (setup.adminId !== admin.id) {
      return { ok: false as const, error: "Configuração de 2FA inválida." };
    }
    const step = verifyTotp(setup.secret, parsed.data.code);
    if (step === null) {
      return { ok: false as const, error: "Código inválido ou expirado." };
    }

    const recoveryCodes = generateRecoveryCodes();
    const now = new Date();
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecretEncrypted: encryptTwoFactorSecret(
          setup.secret,
          config.authSecret,
        ),
        twoFactorRecoveryCodeHashes: serializeRecoveryCodeHashes(
          recoveryCodes,
          config.authSecret,
        ),
        twoFactorLastUsedStep: step,
        twoFactorEnabledAt: now,
        sessionsValidAfter: now,
      },
    });
    return { ok: true as const, recoveryCodes };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Configuração de 2FA inválida.",
    };
  }
}

export async function regenerateAdminRecoveryCodesAction(input: unknown) {
  const admin = await currentAdmin();
  if (!admin) return { ok: false as const, error: "Sessão expirada. Faça login novamente." };
  if (!admin.twoFactorEnabled) return { ok: false as const, error: "Ative o 2FA primeiro." };
  const parsed = protectedTwoFactorSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  if (!(await verifyCurrentPassword(admin, parsed.data.currentPassword))) {
    return { ok: false as const, error: "A senha atual está incorreta." };
  }
  if (!(await verifyAndConsumeAdminSecondFactor(admin, parsed.data.code))) {
    return { ok: false as const, error: "Código de autenticação inválido ou já utilizado." };
  }

  const recoveryCodes = generateRecoveryCodes();
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: {
      twoFactorRecoveryCodeHashes: serializeRecoveryCodeHashes(
        recoveryCodes,
        config.authSecret,
      ),
    },
  });
  return { ok: true as const, recoveryCodes };
}

export async function disableAdminTwoFactorAction(input: unknown): Promise<BasicResult> {
  const admin = await currentAdmin();
  if (!admin) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  if (!admin.twoFactorEnabled) return { ok: false, error: "O 2FA já está desativado." };
  const parsed = protectedTwoFactorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  if (!(await verifyCurrentPassword(admin, parsed.data.currentPassword))) {
    return { ok: false, error: "A senha atual está incorreta." };
  }
  if (!(await verifyAndConsumeAdminSecondFactor(admin, parsed.data.code))) {
    return { ok: false, error: "Código de autenticação inválido ou já utilizado." };
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecretEncrypted: null,
      twoFactorRecoveryCodeHashes: null,
      twoFactorLastUsedStep: null,
      twoFactorEnabledAt: null,
      sessionsValidAfter: new Date(),
    },
  });
  return { ok: true, reauthenticate: true };
}
