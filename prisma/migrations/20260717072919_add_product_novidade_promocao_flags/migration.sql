ALTER TABLE "Product"
ADD COLUMN "isNovidade" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isPromocao" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Product_ativo_isNovidade_idx"
ON "Product"("ativo", "isNovidade");

CREATE INDEX "Product_ativo_isPromocao_idx"
ON "Product"("ativo", "isPromocao");
