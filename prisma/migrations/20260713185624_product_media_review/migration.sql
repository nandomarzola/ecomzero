-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "avaliacaoMedia" DOUBLE PRECISION,
ADD COLUMN     "comentarios" JSONB,
ADD COLUMN     "totalAvaliacoes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "videos" TEXT[] DEFAULT ARRAY[]::TEXT[];

