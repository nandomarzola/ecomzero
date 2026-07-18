ALTER TABLE "StoreSettings"
ADD COLUMN "metaCatalogFeedAtivo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "metaCatalogIncludeOutOfStock" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "metaCatalogIncludeSalePrice" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "metaCatalogIncludeImages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "metaCatalogDefaultBrand" TEXT NOT NULL DEFAULT 'EcomZero',
ADD COLUMN "metaCatalogDefaultCategory" TEXT NOT NULL DEFAULT '',
ADD COLUMN "metaCatalogLastValidatedAt" TIMESTAMP(3);
