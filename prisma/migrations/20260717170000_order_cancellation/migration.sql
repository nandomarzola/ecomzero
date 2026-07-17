CREATE TYPE "OrderCancellationReason" AS ENUM (
    'customer_request',
    'out_of_stock',
    'suspected_fraud',
    'other'
);

CREATE TYPE "OrderCancellationStatus" AS ENUM (
    'processing',
    'failed',
    'completed'
);

CREATE TABLE "OrderCancellation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reason" "OrderCancellationReason" NOT NULL,
    "note" TEXT,
    "requestedBy" TEXT NOT NULL,
    "previousOrderStatus" "OrderStatus" NOT NULL,
    "status" "OrderCancellationStatus" NOT NULL DEFAULT 'processing',
    "shipmentCanceled" BOOLEAN NOT NULL DEFAULT false,
    "mercadoPagoRefundId" TEXT,
    "mercadoPagoRefundStatus" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "processingToken" TEXT,
    "processingStartedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderCancellation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "OrderStatus",
    "message" TEXT,
    "actorEmail" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderCancellation_orderId_key" ON "OrderCancellation"("orderId");
CREATE INDEX "OrderCancellation_status_processingStartedAt_idx" ON "OrderCancellation"("status", "processingStartedAt");
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");

ALTER TABLE "OrderCancellation"
ADD CONSTRAINT "OrderCancellation_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderEvent"
ADD CONSTRAINT "OrderEvent_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
