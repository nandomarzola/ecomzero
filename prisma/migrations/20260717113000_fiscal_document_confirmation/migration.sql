ALTER TYPE "ShippingLabelStatus" ADD VALUE IF NOT EXISTS 'awaiting_fiscal_document' BEFORE 'awaiting_invoice';

CREATE TYPE "FiscalDocumentType" AS ENUM ('nota_fiscal', 'declaracao_conteudo');

ALTER TABLE "ShippingSettings"
ADD COLUMN "documentoFiscalPadrao" "FiscalDocumentType" NOT NULL DEFAULT 'declaracao_conteudo';

ALTER TABLE "Shipment"
ADD COLUMN "tipoDocumentoFiscalConfirmadoEm" TIMESTAMP(3),
ALTER COLUMN "tipoDocumentoFiscal" TYPE "FiscalDocumentType"
USING (
  CASE
    WHEN "tipoDocumentoFiscal" IN ('nota_fiscal', 'declaracao_conteudo')
      THEN "tipoDocumentoFiscal"::"FiscalDocumentType"
    ELSE NULL
  END
);

UPDATE "Shipment"
SET "tipoDocumentoFiscalConfirmadoEm" = COALESCE("compradoEm", "createdAt")
WHERE "melhorEnvioId" IS NOT NULL
  AND "tipoDocumentoFiscal" IS NOT NULL;
