-- AlterTable
ALTER TABLE "ninos" ADD COLUMN     "apellidos" TEXT;

-- CreateTable
CREATE TABLE "notas_familia" (
    "id" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "autorNombre" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notas_familia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notas_familia_familiaId_idx" ON "notas_familia"("familiaId");

-- AddForeignKey
ALTER TABLE "notas_familia" ADD CONSTRAINT "notas_familia_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "familias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
