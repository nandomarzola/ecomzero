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

CREATE TABLE "AdminLoginChallenge" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "sendCount" INTEGER NOT NULL DEFAULT 1,
  "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AdminLoginChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminLoginChallenge_adminUserId_key" ON "AdminLoginChallenge"("adminUserId");
CREATE UNIQUE INDEX "AdminLoginChallenge_tokenHash_key" ON "AdminLoginChallenge"("tokenHash");
CREATE INDEX "AdminLoginChallenge_expiresAt_idx" ON "AdminLoginChallenge"("expiresAt");
CREATE INDEX "AdminLoginChallenge_consumedAt_idx" ON "AdminLoginChallenge"("consumedAt");

ALTER TABLE "AdminLoginChallenge"
ADD CONSTRAINT "AdminLoginChallenge_adminUserId_fkey"
FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
