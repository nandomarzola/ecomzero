-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('draft', 'aguardando_pagamento', 'pago', 'cancelado');

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Order"
ALTER COLUMN "status" TYPE "OrderStatus"
USING (
    CASE "status"
        WHEN 'pending' THEN 'aguardando_pagamento'
        WHEN 'paid' THEN 'pago'
        WHEN 'canceled' THEN 'cancelado'
        WHEN 'cancelled' THEN 'cancelado'
        ELSE "status"
    END
)::"OrderStatus";

ALTER TABLE "Order"
ALTER COLUMN "status" SET DEFAULT 'draft',
ADD COLUMN "bairro" TEXT,
ADD COLUMN "cepDestino" TEXT,
ADD COLUMN "cidade" TEXT,
ADD COLUMN "complemento" TEXT,
ADD COLUMN "cpfCnpj" TEXT,
ADD COLUMN "emailCliente" TEXT,
ADD COLUMN "logradouro" TEXT,
ADD COLUMN "nomeCliente" TEXT,
ADD COLUMN "numero" TEXT,
ADD COLUMN "shippingOptionId" TEXT,
ADD COLUMN "shippingQuoteId" TEXT,
ADD COLUMN "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "telefoneCliente" TEXT,
ADD COLUMN "uf" TEXT,
ADD COLUMN "valorFrete" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Order_shippingQuoteId_key" ON "Order"("shippingQuoteId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shippingQuoteId_fkey" FOREIGN KEY ("shippingQuoteId") REFERENCES "CheckoutShippingQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
