-- CreateEnum
CREATE TYPE "CouponAppliesTo" AS ENUM ('toda_loja', 'categoria', 'produto');

-- AlterEnum
ALTER TYPE "CouponDiscountType" ADD VALUE 'frete_gratis';

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "aplicaEm" "CouponAppliesTo" NOT NULL DEFAULT 'toda_loja',
ADD COLUMN     "categoriaId" TEXT,
ADD COLUMN     "combinavel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "exibirNoSite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "primeiraCompra" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "produtoId" TEXT,
ALTER COLUMN "valor" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "couponId" TEXT,
ADD COLUMN     "descontoCupom" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Order_couponId_idx" ON "Order"("couponId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

