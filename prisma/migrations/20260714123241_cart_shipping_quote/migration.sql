-- CreateTable
CREATE TABLE "CheckoutShippingQuote" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutShippingQuote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutShippingQuote_orderId_key" ON "CheckoutShippingQuote"("orderId");

-- CreateIndex
CREATE INDEX "CheckoutShippingQuote_expiresAt_idx" ON "CheckoutShippingQuote"("expiresAt");

-- AddForeignKey
ALTER TABLE "CheckoutShippingQuote" ADD CONSTRAINT "CheckoutShippingQuote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
