ALTER TABLE "Category"
ADD COLUMN "imagemUrl" TEXT,
ADD COLUMN "destaque" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "metaTitulo" TEXT,
ADD COLUMN "metaDescricao" TEXT;
