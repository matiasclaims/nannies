-- CreateEnum
CREATE TYPE "PrioridadBacklog" AS ENUM ('BAJA', 'MEDIA', 'ALTA');

-- CreateEnum
CREATE TYPE "EstadoBacklog" AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'HECHO');

-- CreateTable
CREATE TABLE "backlog_items" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "prioridad" "PrioridadBacklog" NOT NULL DEFAULT 'MEDIA',
    "estado" "EstadoBacklog" NOT NULL DEFAULT 'PENDIENTE',
    "origenReporteId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backlog_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "backlog_items_estado_idx" ON "backlog_items"("estado");
