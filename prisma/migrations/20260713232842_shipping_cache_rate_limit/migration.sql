-- CreateTable
CREATE TABLE "ShippingQuoteCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingQuoteCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingRateLimit" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShippingRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShippingQuoteCache_cacheKey_key" ON "ShippingQuoteCache"("cacheKey");

-- CreateIndex
CREATE INDEX "ShippingQuoteCache_expiresAt_idx" ON "ShippingQuoteCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingRateLimit_identifier_key" ON "ShippingRateLimit"("identifier");

-- CreateIndex
CREATE INDEX "ShippingRateLimit_windowStart_idx" ON "ShippingRateLimit"("windowStart");

