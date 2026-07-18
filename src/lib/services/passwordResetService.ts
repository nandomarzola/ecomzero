import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { hashPassword } from "@/lib/security/password";
import {
  createPasswordResetToken,
  hashPasswordResetToken,
  isPasswordResetTokenUsable,
  PASSWORD_RESET_REQUEST_COOLDOWN_MS,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from "@/lib/security/passwordReset";
import { sendPasswordResetEmail } from "@/lib/services/emailService";

export class PasswordResetServiceError extends Error {
  code: "INVALID_OR_EXPIRED_TOKEN";

  constructor(message: string) {
    super(message);
    this.name = "PasswordResetServiceError";
    this.code = "INVALID_OR_EXPIRED_TOKEN";
  }
}

export async function requestPasswordReset(emailInput: string): Promise<void> {
  const email = emailInput.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, senhaHash: true },
  });

  if (!user?.senhaHash) return;

  const now = new Date();
  const existingToken = await prisma.passwordResetToken.findUnique({
    where: { userId: user.id },
    select: { createdAt: true },
  });

  if (
    existingToken &&
    existingToken.createdAt.getTime() >
      now.getTime() - PASSWORD_RESET_REQUEST_COOLDOWN_MS
  ) {
    return;
  }

  const token = createPasswordResetToken();
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS);

  await prisma.passwordResetToken.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tokenHash,
      expiresAt,
      createdAt: now,
    },
    update: {
      tokenHash,
      expiresAt,
      usedAt: null,
      createdAt: now,
    },
  });

  const resetUrl = `${config.storefrontUrl.replace(/\/$/, "")}/redefinir-senha#token=${encodeURIComponent(token)}`;

  const delivery = await sendPasswordResetEmail({
    userId: user.id,
    requestId: tokenHash.slice(0, 32),
    to: user.email,
    name: user.name?.trim() || "cliente EcomZero",
    resetUrl,
    expiresInMinutes: PASSWORD_RESET_TOKEN_TTL_MS / 60_000,
  });

  if (delivery.status !== "sent") {
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, tokenHash, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  const tokenHash = hashPasswordResetToken(token);
  const now = new Date();
  const candidate = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { expiresAt: true, usedAt: true },
  });

  if (!candidate || !isPasswordResetTokenUsable(candidate, now)) {
    throw new PasswordResetServiceError("Link inválido ou expirado");
  }

  const senhaHash = await hashPassword(newPassword);

  await prisma.$transaction(async (transaction) => {
    const resetToken = await transaction.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });

    if (!resetToken || !isPasswordResetTokenUsable(resetToken, now)) {
      throw new PasswordResetServiceError("Link inválido ou expirado");
    }

    const claim = await transaction.passwordResetToken.updateMany({
      where: {
        id: resetToken.id,
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });

    if (claim.count !== 1) {
      throw new PasswordResetServiceError("Link inválido ou expirado");
    }

    await transaction.user.update({
      where: { id: resetToken.userId },
      data: {
        senhaHash,
        sessionsValidAfter: now,
      },
    });
  });
}
