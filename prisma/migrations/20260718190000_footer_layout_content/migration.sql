ALTER TABLE "StoreSettings"
ADD COLUMN "footerBenefits" JSONB,
ADD COLUMN "footerSecurityItems" JSONB;

ALTER TABLE "StoreSettings"
ALTER COLUMN "mensagemFooter" SET DEFAULT 'Este site utiliza conexão segura e não armazena os dados do seu cartão.';

UPDATE "StoreSettings"
SET "mensagemFooter" = 'Este site utiliza conexão segura e não armazena os dados do seu cartão.'
WHERE "mensagemFooter" = 'Produtos úteis para facilitar o seu dia a dia.';
