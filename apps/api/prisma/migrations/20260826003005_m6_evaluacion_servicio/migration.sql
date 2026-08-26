-- CreateTable
CREATE TABLE "evaluaciones_servicio" (
    "id" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "calificacion" INTEGER,
    "volveriaContratar" BOOLEAN,
    "comentario" TEXT,
    "respondidoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluaciones_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "evaluaciones_servicio_servicioId_key" ON "evaluaciones_servicio"("servicioId");

-- CreateIndex
CREATE UNIQUE INDEX "evaluaciones_servicio_token_key" ON "evaluaciones_servicio"("token");

-- AddForeignKey
ALTER TABLE "evaluaciones_servicio" ADD CONSTRAINT "evaluaciones_servicio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
