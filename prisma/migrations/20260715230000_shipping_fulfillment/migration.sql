CREATE TABLE "ShippingSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "nomeRemetente" TEXT NOT NULL,
    "emailRemetente" TEXT NOT NULL,
    "telefoneRemetente" TEXT NOT NULL,
    "cpfCnpjRemetente" TEXT NOT NULL,
    "inscricaoEstadual" TEXT,
    "atividadeEconomica" TEXT,
    "cepOrigem" TEXT NOT NULL,
    "logradouroOrigem" TEXT NOT NULL,
    "numeroOrigem" TEXT NOT NULL,
    "complementoOrigem" TEXT,
    "bairroOrigem" TEXT NOT NULL,
    "cidadeOrigem" TEXT NOT NULL,
    "ufOrigem" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "melhorEnvioId" TEXT,
    "melhorEnvioProtocol" TEXT,
    "status" TEXT NOT NULL DEFAULT 'creating',
    "transportadora" TEXT,
    "servico" TEXT,
    "codigoRastreio" TEXT,
    "urlRastreio" TEXT,
    "urlEtiqueta" TEXT,
    "tipoDocumentoFiscal" TEXT,
    "chaveNotaFiscal" TEXT,
    "ultimoErro" TEXT,
    "compradoEm" TIMESTAMP(3),
    "geradoEm" TIMESTAMP(3),
    "postadoEm" TIMESTAMP(3),
    "entregueEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Shipment_orderId_key" ON "Shipment"("orderId");
CREATE UNIQUE INDEX "Shipment_melhorEnvioId_key" ON "Shipment"("melhorEnvioId");
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

ALTER TABLE "Shipment"
ADD CONSTRAINT "Shipment_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
