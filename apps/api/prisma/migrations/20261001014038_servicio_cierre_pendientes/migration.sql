-- AlterTable
ALTER TABLE "servicios" ADD COLUMN     "encuestaCerrada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reporteCerrado" BOOLEAN NOT NULL DEFAULT false;
