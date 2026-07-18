CREATE TABLE "OrderEmailLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "CustomerNotificationType" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "processingToken" TEXT,
    "providerMessageId" TEXT,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEmailLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderEmailLog_orderId_type_key" ON "OrderEmailLog"("orderId", "type");
CREATE INDEX "OrderEmailLog_status_updatedAt_idx" ON "OrderEmailLog"("status", "updatedAt");

ALTER TABLE "OrderEmailLog"
ADD CONSTRAINT "OrderEmailLog_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
