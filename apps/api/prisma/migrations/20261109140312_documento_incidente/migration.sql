-- CreateTable
CREATE TABLE "documentos_incidente" (
    "id" TEXT NOT NULL,
    "incidenteId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "subidoPor" TEXT NOT NULL,
    "subidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_incidente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documentos_incidente_incidenteId_idx" ON "documentos_incidente"("incidenteId");

-- AddForeignKey
ALTER TABLE "documentos_incidente" ADD CONSTRAINT "documentos_incidente_incidenteId_fkey" FOREIGN KEY ("incidenteId") REFERENCES "reportes_incidente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
