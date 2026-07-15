ALTER TABLE "Order"
ADD COLUMN "mercadoPagoPaymentId" TEXT,
ADD COLUMN "mercadoPagoPaymentStatus" TEXT,
ADD COLUMN "pagoEm" TIMESTAMP(3);

CREATE UNIQUE INDEX "Order_mercadoPagoPaymentId_key"
ON "Order"("mercadoPagoPaymentId");
