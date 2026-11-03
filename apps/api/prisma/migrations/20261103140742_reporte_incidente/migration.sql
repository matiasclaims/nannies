-- CreateTable
CREATE TABLE "reportes_incidente" (
    "id" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "servicioId" TEXT,
    "ninoId" TEXT,
    "nannieId" TEXT,
    "paqueteId" TEXT,
    "fechaHoraIncidente" TIMESTAMP(3) NOT NULL,
    "lugar" TEXT NOT NULL,
    "relatoNannie" TEXT NOT NULL,
    "medidasInmediatas" TEXT,
    "evolucionMenor" TEXT,
    "doctor" TEXT,
    "fechaConsulta" DATE,
    "diagnostico" TEXT,
    "tratamiento" TEXT,
    "documentacionEntregada" TEXT,
    "medidasNannies" TEXT,
    "coberturaAplico" BOOLEAN NOT NULL DEFAULT false,
    "coberturaImporte" DECIMAL(10,2),
    "anexos" TEXT,
    "creadoPor" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reportes_incidente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reportes_incidente_familiaId_idx" ON "reportes_incidente"("familiaId");

-- CreateIndex
CREATE INDEX "reportes_incidente_nannieId_idx" ON "reportes_incidente"("nannieId");

-- CreateIndex
CREATE INDEX "reportes_incidente_servicioId_idx" ON "reportes_incidente"("servicioId");

-- AddForeignKey
ALTER TABLE "reportes_incidente" ADD CONSTRAINT "reportes_incidente_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "familias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_incidente" ADD CONSTRAINT "reportes_incidente_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_incidente" ADD CONSTRAINT "reportes_incidente_ninoId_fkey" FOREIGN KEY ("ninoId") REFERENCES "ninos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_incidente" ADD CONSTRAINT "reportes_incidente_nannieId_fkey" FOREIGN KEY ("nannieId") REFERENCES "nannies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_incidente" ADD CONSTRAINT "reportes_incidente_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "paquetes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
