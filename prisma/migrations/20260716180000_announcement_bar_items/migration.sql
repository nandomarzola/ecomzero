ALTER TABLE "StoreSettings"
ADD COLUMN "barraAnuncioCor" TEXT,
ADD COLUMN "barraAnuncioVelocidade" INTEGER NOT NULL DEFAULT 5;

CREATE TABLE "AnnouncementBarItem" (
  "id" TEXT NOT NULL,
  "texto" TEXT NOT NULL,
  "link" TEXT,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AnnouncementBarItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnnouncementBarItem_ativo_ordem_idx" ON "AnnouncementBarItem"("ativo", "ordem");

INSERT INTO "AnnouncementBarItem" ("id", "texto", "link", "ordem", "ativo", "createdAt", "updatedAt")
SELECT
  'legacy-announcement-singleton',
  LEFT("barraAnuncioTexto", 80),
  "barraAnuncioLink",
  0,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "StoreSettings"
WHERE "id" = 'singleton'
  AND "barraAnuncioTexto" IS NOT NULL
  AND BTRIM("barraAnuncioTexto") <> ''
ON CONFLICT ("id") DO NOTHING;
