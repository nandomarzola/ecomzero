ALTER TABLE "StoreSettings"
ADD COLUMN "fontFamily" TEXT NOT NULL DEFAULT 'geist',
ADD COLUMN "productCardStyle" TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN "cardCornerStyle" TEXT NOT NULL DEFAULT 'rounded',
ADD COLUMN "showRating" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "showBuyNowButton" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "buttonStyle" TEXT NOT NULL DEFAULT 'filled';
