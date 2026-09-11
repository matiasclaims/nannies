-- CreateTable
CREATE TABLE "evaluaciones_coord_servicio" (
    "id" TEXT NOT NULL,
    "nannieId" TEXT NOT NULL,
    "servicioId" TEXT,
    "paqueteId" TEXT,
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

    CONSTRAINT "evaluaciones_coord_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "evaluaciones_coord_servicio_servicioId_key" ON "evaluaciones_coord_servicio"("servicioId");

-- CreateIndex
CREATE INDEX "evaluaciones_coord_servicio_nannieId_idx" ON "evaluaciones_coord_servicio"("nannieId");

-- CreateIndex
CREATE UNIQUE INDEX "evaluaciones_coord_servicio_paqueteId_nannieId_key" ON "evaluaciones_coord_servicio"("paqueteId", "nannieId");

-- AddForeignKey
ALTER TABLE "evaluaciones_coord_servicio" ADD CONSTRAINT "evaluaciones_coord_servicio_nannieId_fkey" FOREIGN KEY ("nannieId") REFERENCES "nannies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluaciones_coord_servicio" ADD CONSTRAINT "evaluaciones_coord_servicio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluaciones_coord_servicio" ADD CONSTRAINT "evaluaciones_coord_servicio_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "paquetes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
