-- CreateTable
CREATE TABLE "evaluaciones_nannie" (
    "id" TEXT NOT NULL,
    "nannieId" TEXT NOT NULL,
    "semana" DATE NOT NULL,
    "atencionInfantil" INTEGER NOT NULL,
    "cumplimientoServicio" INTEGER NOT NULL,
    "comunicacion" INTEGER NOT NULL,
    "profesionalismo" INTEGER NOT NULL,
    "puntualidad" INTEGER NOT NULL,
    "calificacion" DECIMAL(4,2) NOT NULL,
    "evaluadaPor" TEXT NOT NULL,
    "nota" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluaciones_nannie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evaluaciones_nannie_nannieId_idx" ON "evaluaciones_nannie"("nannieId");

-- CreateIndex
CREATE UNIQUE INDEX "evaluaciones_nannie_nannieId_semana_key" ON "evaluaciones_nannie"("nannieId", "semana");

-- AddForeignKey
ALTER TABLE "evaluaciones_nannie" ADD CONSTRAINT "evaluaciones_nannie_nannieId_fkey" FOREIGN KEY ("nannieId") REFERENCES "nannies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
