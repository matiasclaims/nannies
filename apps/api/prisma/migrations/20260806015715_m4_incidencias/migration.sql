-- CreateEnum
CREATE TYPE "EstadoIncidencia" AS ENUM ('ACUMULANDO', 'APLICADA', 'DESCARTADA');

-- CreateTable
CREATE TABLE "incidencias" (
    "id" TEXT NOT NULL,
    "nannieId" TEXT NOT NULL,
    "regla" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registradaPor" TEXT NOT NULL,
    "nota" TEXT,
    "estado" "EstadoIncidencia" NOT NULL DEFAULT 'ACUMULANDO',
    "aplicadaEn" TIMESTAMP(3),

    CONSTRAINT "incidencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incidencias_nannieId_regla_idx" ON "incidencias"("nannieId", "regla");

-- AddForeignKey
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_nannieId_fkey" FOREIGN KEY ("nannieId") REFERENCES "nannies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
