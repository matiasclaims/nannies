-- CreateEnum
CREATE TYPE "TipoReferencia" AS ENUM ('LABORAL', 'PERSONAL');

-- CreateTable
CREATE TABLE "referencias_nannie" (
    "id" TEXT NOT NULL,
    "nannieId" TEXT NOT NULL,
    "tipo" "TipoReferencia" NOT NULL,
    "orden" INTEGER NOT NULL,
    "nombre" TEXT,
    "telefono" TEXT,
    "aniosConocer" INTEGER,
    "empresa" TEXT,
    "puesto" TEXT,
    "parentesco" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referencias_nannie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "referencias_nannie_nannieId_idx" ON "referencias_nannie"("nannieId");

-- CreateIndex
CREATE UNIQUE INDEX "referencias_nannie_nannieId_tipo_orden_key" ON "referencias_nannie"("nannieId", "tipo", "orden");

-- AddForeignKey
ALTER TABLE "referencias_nannie" ADD CONSTRAINT "referencias_nannie_nannieId_fkey" FOREIGN KEY ("nannieId") REFERENCES "nannies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
