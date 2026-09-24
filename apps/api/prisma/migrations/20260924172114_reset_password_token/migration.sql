-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "resetTokenExp" TIMESTAMP(3),
ADD COLUMN     "resetTokenHash" TEXT;
