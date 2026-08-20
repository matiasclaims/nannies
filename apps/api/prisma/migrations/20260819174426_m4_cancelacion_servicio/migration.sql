-- AlterTable
ALTER TABLE "servicios" ADD COLUMN     "canceladaCobrada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "motivoCancelacion" TEXT;
