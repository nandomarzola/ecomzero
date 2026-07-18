CREATE TYPE "AdminRole" AS ENUM ('owner', 'staff');

ALTER TABLE "AdminUser"
ADD COLUMN "role" "AdminRole" NOT NULL DEFAULT 'owner',
ADD COLUMN "sessionsValidAfter" TIMESTAMP(3),
ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "twoFactorSecretEncrypted" TEXT,
ADD COLUMN "twoFactorRecoveryCodeHashes" TEXT,
ADD COLUMN "twoFactorLastUsedStep" INTEGER,
ADD COLUMN "twoFactorEnabledAt" TIMESTAMP(3);

ALTER TABLE "AdminUser"
ADD CONSTRAINT "AdminUser_two_factor_state_check"
CHECK (
  NOT "twoFactorEnabled" OR (
    "twoFactorSecretEncrypted" IS NOT NULL AND
    "twoFactorRecoveryCodeHashes" IS NOT NULL AND
    "twoFactorEnabledAt" IS NOT NULL
  )
);
