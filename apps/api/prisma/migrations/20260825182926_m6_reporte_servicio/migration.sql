-- CreateTable
CREATE TABLE "reportes_servicio" (
    "id" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "actividades" TEXT NOT NULL,
    "animoNino" TEXT NOT NULL,
    "incidentes" TEXT,
    "notas" TEXT,
    "autorNombre" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reportes_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reportes_servicio_servicioId_key" ON "reportes_servicio"("servicioId");

-- AddForeignKey
ALTER TABLE "reportes_servicio" ADD CONSTRAINT "reportes_servicio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
