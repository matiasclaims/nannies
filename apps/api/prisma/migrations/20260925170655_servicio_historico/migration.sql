-- AlterTable
ALTER TABLE "servicios" ADD COLUMN     "esHistorico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notaHistorica" TEXT;
