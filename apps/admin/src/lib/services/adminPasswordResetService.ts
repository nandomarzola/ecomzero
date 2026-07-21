import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { config } from "@/lib/config";
import { prisma } from "@/lib/db";
import {
  ADMIN_PASSWORD_RESET_TTL_MS,
  createAdminPasswordResetToken,
  getAdminPasswordResetSubject,
  verifyAdminPasswordResetToken,
} from "@/lib/security/adminPasswordReset";
import { sendAdminPasswordResetViaStorefront } from "@/lib/services/adminEmailClient";

export class AdminPasswordResetError extends Error {
  constructor(message = "Link inválido ou expirado.") {
    super(message);
    this.name = "AdminPasswordResetError";
  }
}

function adminBaseUrl() {
  if (config.adminUrl) return config.adminUrl.replace(/\/$/, "");

  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl.replace(/^https?:\/\//, "")}`;

  return config.nodeEnv === "production"
    ? "https://admin.ecomzero.com.br"
    : "http://localhost:3001";
}

export async function requestAdminPasswordReset(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  const admin = await prisma.adminUser.findUnique({
    where: { email },
    select: { id: true, email: true, senhaHash: true },
  });
  if (!admin) return;

  const { token } = createAdminPasswordResetToken({
    adminUserId: admin.id,
    passwordHash: admin.senhaHash,
    secret: config.authSecret,
  });
  const requestId = createHash("sha256")
    .update(token, "utf8")
    .digest("hex")
    .slice(0, 32);
  const resetUrl = `${adminBaseUrl()}/redefinir-senha#token=${encodeURIComponent(token)}`;
  const delivery = await sendAdminPasswordResetViaStorefront({
    adminUserId: admin.id,
    email: admin.email,
    resetUrl,
    requestId,
    expiresInMinutes: ADMIN_PASSWORD_RESET_TTL_MS / 60_000,
  });

  if (!delivery.ok) {
    console.error("[admin-password-reset] falha no envio", {
      adminUserId: admin.id,
      requestId,
    });
  }
}

export async function resetAdminPassword(token: string, newPassword: string) {
  const now = new Date();
  const adminUserId = getAdminPasswordResetSubject(token, now);
  if (!adminUserId) throw new AdminPasswordResetError();

  const admin = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    select: { id: true, senhaHash: true },
  });
  if (
    !admin ||
    !verifyAdminPasswordResetToken({
      token,
      adminUserId: admin.id,
      passwordHash: admin.senhaHash,
      secret: config.authSecret,
      now,
    })
  ) {
    throw new AdminPasswordResetError();
  }

  const senhaHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction(async (transaction) => {
    const claim = await transaction.adminUser.updateMany({
      where: { id: admin.id, senhaHash: admin.senhaHash },
      data: { senhaHash, sessionsValidAfter: now },
    });
    if (claim.count !== 1) throw new AdminPasswordResetError();

    await transaction.adminLoginChallenge.deleteMany({
      where: { adminUserId: admin.id },
    });
  });
}
