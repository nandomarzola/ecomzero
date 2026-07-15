ALTER TABLE "Order"
ADD COLUMN "mercadoPagoPreferenceId" TEXT,
ADD COLUMN "mercadoPagoInitPoint" TEXT,
ADD COLUMN "mercadoPagoPreferenceExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Order_mercadoPagoPreferenceId_key"
ON "Order"("mercadoPagoPreferenceId");
