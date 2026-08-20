-- CreateTable
CREATE TABLE "documentos_nannie" (
    "id" TEXT NOT NULL,
    "nannieId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "subidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_nannie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documentos_nannie_nannieId_idx" ON "documentos_nannie"("nannieId");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_nannie_nannieId_clave_key" ON "documentos_nannie"("nannieId", "clave");

-- AddForeignKey
ALTER TABLE "documentos_nannie" ADD CONSTRAINT "documentos_nannie_nannieId_fkey" FOREIGN KEY ("nannieId") REFERENCES "nannies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
