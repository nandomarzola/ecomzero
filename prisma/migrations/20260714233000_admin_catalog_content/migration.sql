CREATE TYPE "ProductKind" AS ENUM ('simples', 'variacoes');
CREATE TYPE "CouponDiscountType" AS ENUM ('percentual', 'valor_fixo');
CREATE TYPE "BannerPosition" AS ENUM ('hero_slide', 'home_middle', 'home_bottom');

ALTER TABLE "Product"
ADD COLUMN "tipo" "ProductKind" NOT NULL DEFAULT 'simples',
ADD COLUMN "categoryId" TEXT;

CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descricao" TEXT,
    "parentId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "CouponDiscountType" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "valorMinimoPedido" DECIMAL(10,2),
    "descontoMaximo" DECIMAL(10,2),
    "limiteUsoTotal" INTEGER,
    "limiteUsoPorCliente" INTEGER NOT NULL DEFAULT 1,
    "usos" INTEGER NOT NULL DEFAULT 0,
    "inicioEm" TIMESTAMP(3),
    "expiraEm" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT,
    "orderId" TEXT NOT NULL,
    "customerKey" TEXT NOT NULL,
    "valorDesconto" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "imagemUrl" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "linkUrl" TEXT,
    "posicao" "BannerPosition" NOT NULL,
    "largura" INTEGER NOT NULL,
    "altura" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "inicioEm" TIMESTAMP(3),
    "expiraEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoreSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "nomeLoja" TEXT NOT NULL DEFAULT 'EcomZero',
    "descricaoFooter" TEXT NOT NULL DEFAULT 'Produtos inteligentes, úteis e de qualidade para transformar sua rotina.',
    "mensagemFooter" TEXT NOT NULL DEFAULT 'Produtos úteis para facilitar o seu dia a dia.',
    "barraAnuncioAtiva" BOOLEAN NOT NULL DEFAULT false,
    "barraAnuncioTexto" TEXT,
    "barraAnuncioLink" TEXT,
    "emailSuporte" TEXT,
    "telefoneSuporte" TEXT,
    "whatsapp" TEXT,
    "linkShopee" TEXT,
    "linkInstagram" TEXT,
    "linkFacebook" TEXT,
    "linkTiktok" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Category_parentId_ordem_idx" ON "Category"("parentId", "ordem");
CREATE UNIQUE INDEX "Coupon_codigo_key" ON "Coupon"("codigo");
CREATE INDEX "Coupon_ativo_inicioEm_expiraEm_idx" ON "Coupon"("ativo", "inicioEm", "expiraEm");
CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");
CREATE INDEX "CouponRedemption_couponId_customerKey_idx" ON "CouponRedemption"("couponId", "customerKey");
CREATE INDEX "CouponRedemption_userId_idx" ON "CouponRedemption"("userId");
CREATE INDEX "Banner_posicao_ativo_ordem_idx" ON "Banner"("posicao", "ativo", "ordem");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey"
FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "StoreSettings" (
    "id",
    "nomeLoja",
    "descricaoFooter",
    "mensagemFooter",
    "barraAnuncioAtiva",
    "updatedAt"
) VALUES (
    'singleton',
    'EcomZero',
    'Produtos inteligentes, úteis e de qualidade para transformar sua rotina.',
    'Produtos úteis para facilitar o seu dia a dia.',
    false,
    CURRENT_TIMESTAMP
);
