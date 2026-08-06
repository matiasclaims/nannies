-- AlterEnum
ALTER TYPE "EstadoNannie" ADD VALUE 'BAJA';

-- AlterTable
ALTER TABLE "nannies" ADD COLUMN     "capacitacionCompleta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "color" TEXT,
ADD COLUMN     "documentacionCompleta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "telefono" TEXT;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "debeCambiarPassword" BOOLEAN NOT NULL DEFAULT false;
