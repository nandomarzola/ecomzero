import { config } from "@/lib/config";
import { prisma } from "@/lib/db";
import {
  decryptTwoFactorSecret,
  findRecoveryCodeHash,
  parseRecoveryCodeHashes,
  verifyTotp,
} from "@/lib/security/twoFactor";

type AdminSecondFactorState = {
  id: string;
  twoFactorSecretEncrypted: string | null;
  twoFactorRecoveryCodeHashes: string | null;
};

export async function verifyAndConsumeAdminSecondFactor(
  admin: AdminSecondFactorState,
  code: string,
): Promise<boolean> {
  if (!admin.twoFactorSecretEncrypted) return false;

  if (/^\d{6}$/.test(code.trim())) {
    try {
      const secret = decryptTwoFactorSecret(
        admin.twoFactorSecretEncrypted,
        config.authSecret,
      );
      const step = verifyTotp(secret, code);
      if (step === null) return false;
      const updated = await prisma.adminUser.updateMany({
        where: {
          id: admin.id,
          OR: [
            { twoFactorLastUsedStep: null },
            { twoFactorLastUsedStep: { lt: step } },
          ],
        },
        data: { twoFactorLastUsedStep: step },
      });
      return updated.count === 1;
    } catch {
      return false;
    }
  }

  const hashes = parseRecoveryCodeHashes(admin.twoFactorRecoveryCodeHashes);
  const matched = findRecoveryCodeHash(code, hashes, config.authSecret);
  if (!matched) return false;
  const remaining = JSON.stringify(hashes.filter((hash) => hash !== matched));
  const updated = await prisma.adminUser.updateMany({
    where: {
      id: admin.id,
      twoFactorRecoveryCodeHashes: admin.twoFactorRecoveryCodeHashes,
    },
    data: { twoFactorRecoveryCodeHashes: remaining },
  });
  return updated.count === 1;
}
