-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "sessionId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'draft',
ALTER COLUMN "total" SET DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Order_sessionId_key" ON "Order"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_orderId_variantId_key" ON "OrderItem"("orderId", "variantId");

