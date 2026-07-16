CREATE TYPE "ShippingMode" AS ENUM (
    'legacy',
    'melhor_envio',
    'free_shipping_coupon',
    'free_shipping_threshold',
    'external'
);

CREATE TYPE "ShippingPayer" AS ENUM ('customer', 'store', 'external', 'unknown');

CREATE TYPE "ShippingLabelStatus" AS ENUM (
    'not_applicable',
    'awaiting_payment',
    'awaiting_shipping_data',
    'awaiting_invoice',
    'ready_to_purchase',
    'insufficient_balance',
    'processing',
    'purchased',
    'generated',
    'printed',
    'posted',
    'in_transit',
    'delivered',
    'error',
    'external',
    'canceled'
);

CREATE TYPE "ShippingLabelSource" AS ENUM ('automatic', 'manual', 'external');

ALTER TABLE "Order"
ADD COLUMN "shippingMode" "ShippingMode" NOT NULL DEFAULT 'legacy',
ADD COLUMN "shippingProvider" TEXT,
ADD COLUMN "shippingService" TEXT,
ADD COLUMN "shippingAmountCharged" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "shippingPayer" "ShippingPayer" NOT NULL DEFAULT 'unknown',
ADD COLUMN "shippingEstimatedDays" INTEGER;

UPDATE "Order" AS orders
SET
    "shippingAmountCharged" = orders."valorFrete",
    "shippingMode" = CASE
        WHEN orders."shippingOptionId" IS NOT NULL THEN 'melhor_envio'::"ShippingMode"
        WHEN orders."status" <> 'draft'
             AND EXISTS (
                 SELECT 1
                 FROM "Coupon" AS coupon
                 WHERE coupon."id" = orders."couponId"
                   AND coupon."tipo" = 'frete_gratis'
             ) THEN 'free_shipping_coupon'::"ShippingMode"
        WHEN orders."status" <> 'draft'
             AND orders."valorFrete" = 0
             AND orders."subtotal" >= 100 THEN 'free_shipping_threshold'::"ShippingMode"
        ELSE 'legacy'::"ShippingMode"
    END,
    "shippingProvider" = CASE
        WHEN orders."shippingOptionId" IS NOT NULL THEN 'melhor_envio'
        ELSE NULL
    END,
    "shippingPayer" = CASE
        WHEN orders."shippingOptionId" IS NOT NULL THEN 'customer'::"ShippingPayer"
        WHEN orders."status" <> 'draft' AND orders."valorFrete" = 0 THEN 'store'::"ShippingPayer"
        ELSE 'unknown'::"ShippingPayer"
    END;

ALTER TABLE "Shipment"
ADD COLUMN "labelStatus" "ShippingLabelStatus" NOT NULL DEFAULT 'awaiting_shipping_data',
ADD COLUMN "labelSource" "ShippingLabelSource",
ADD COLUMN "serviceId" TEXT,
ADD COLUMN "prazoDias" INTEGER,
ADD COLUMN "custoEstimado" DECIMAL(10,2),
ADD COLUMN "custoEtiqueta" DECIMAL(10,2),
ADD COLUMN "referenciaEtiqueta" TEXT,
ADD COLUMN "ultimoErroCodigo" TEXT,
ADD COLUMN "tentativas" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "processandoEm" TIMESTAMP(3),
ADD COLUMN "processamentoToken" TEXT,
ADD COLUMN "ultimaTentativaEm" TIMESTAMP(3),
ADD COLUMN "saldoConsultadoEm" TIMESTAMP(3),
ADD COLUMN "impressoEm" TIMESTAMP(3),
ADD COLUMN "canceladoEm" TIMESTAMP(3);

UPDATE "Shipment"
SET
    "labelSource" = 'manual',
    "labelStatus" = CASE
        WHEN "status" = 'creating' THEN 'processing'::"ShippingLabelStatus"
        WHEN "status" = 'pending' THEN 'ready_to_purchase'::"ShippingLabelStatus"
        WHEN "status" = 'released' THEN 'purchased'::"ShippingLabelStatus"
        WHEN "status" = 'generated' THEN 'generated'::"ShippingLabelStatus"
        WHEN "status" = 'received' THEN 'in_transit'::"ShippingLabelStatus"
        WHEN "status" = 'posted' THEN 'posted'::"ShippingLabelStatus"
        WHEN "status" = 'delivered' THEN 'delivered'::"ShippingLabelStatus"
        WHEN "status" IN ('cancelled', 'canceled') THEN 'canceled'::"ShippingLabelStatus"
        WHEN "ultimoErro" IS NOT NULL THEN 'error'::"ShippingLabelStatus"
        ELSE 'awaiting_shipping_data'::"ShippingLabelStatus"
    END;

CREATE TABLE "ShipmentEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "ShippingLabelStatus",
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MelhorEnvioBalanceCache" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "saldo" DECIMAL(12,2),
    "disponivel" BOOLEAN NOT NULL DEFAULT false,
    "consultadoEm" TIMESTAMP(3),
    "ultimoErro" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MelhorEnvioBalanceCache_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Order_status_shippingMode_idx" ON "Order"("status", "shippingMode");
CREATE INDEX "Shipment_labelStatus_idx" ON "Shipment"("labelStatus");
CREATE INDEX "Shipment_processandoEm_idx" ON "Shipment"("processandoEm");
CREATE INDEX "ShipmentEvent_shipmentId_createdAt_idx" ON "ShipmentEvent"("shipmentId", "createdAt");

ALTER TABLE "ShipmentEvent"
ADD CONSTRAINT "ShipmentEvent_shipmentId_fkey"
FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
