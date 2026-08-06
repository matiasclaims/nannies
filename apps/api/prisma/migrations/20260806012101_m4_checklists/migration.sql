-- AlterTable
ALTER TABLE "nannies" ADD COLUMN     "cursosCompletados" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "documentosEntregados" TEXT[] DEFAULT ARRAY[]::TEXT[];
