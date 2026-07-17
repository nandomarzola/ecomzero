-- Segmentação regional das mensagens da Barra de Anúncio.
-- Idempotente: seguro re-rodar (dev já pode ter a coluna aplicada direto).
ALTER TABLE "AnnouncementBarItem"
  ADD COLUMN IF NOT EXISTS "regioesElegiveis" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "AnnouncementBarItem"
SET "regioesElegiveis" = ARRAY[]::TEXT[]
WHERE "regioesElegiveis" IS NULL;

ALTER TABLE "AnnouncementBarItem"
  ALTER COLUMN "regioesElegiveis" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "regioesElegiveis" SET NOT NULL;
