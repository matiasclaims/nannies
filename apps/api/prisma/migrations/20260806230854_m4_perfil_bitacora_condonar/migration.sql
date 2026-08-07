-- AlterEnum
ALTER TYPE "EstadoIncidencia" ADD VALUE 'CONDONADA';

-- AlterTable
ALTER TABLE "nannies" ADD COLUMN     "especialidad" TEXT;

-- CreateTable
CREATE TABLE "notas_nannie" (
    "id" TEXT NOT NULL,
    "nannieId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "autorNombre" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notas_nannie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notas_nannie_nannieId_idx" ON "notas_nannie"("nannieId");

-- AddForeignKey
ALTER TABLE "notas_nannie" ADD CONSTRAINT "notas_nannie_nannieId_fkey" FOREIGN KEY ("nannieId") REFERENCES "nannies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
