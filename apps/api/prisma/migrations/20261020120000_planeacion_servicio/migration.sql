-- CreateTable
CREATE TABLE "planeaciones_servicio" (
    "id" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "autorNombre" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planeaciones_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "planeaciones_servicio_servicioId_key" ON "planeaciones_servicio"("servicioId");

-- AddForeignKey
ALTER TABLE "planeaciones_servicio" ADD CONSTRAINT "planeaciones_servicio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
