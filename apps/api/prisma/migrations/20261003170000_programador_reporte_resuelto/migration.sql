-- AlterEnum
ALTER TYPE "Rol" ADD VALUE 'PROGRAMADOR';

-- AlterTable
ALTER TABLE "reportes_problema" ADD COLUMN     "notaResolucion" TEXT,
ADD COLUMN     "resueltoEn" TIMESTAMP(3);
