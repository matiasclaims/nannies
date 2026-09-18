-- CreateEnum
CREATE TYPE "EstadoCobro" AS ENUM ('DEFINIDO', 'POR_DEFINIR');

-- AlterTable
ALTER TABLE "servicios" ADD COLUMN     "esDesborde" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estadoCobro" "EstadoCobro" NOT NULL DEFAULT 'DEFINIDO';
