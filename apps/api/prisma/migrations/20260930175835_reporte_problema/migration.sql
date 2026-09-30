-- CreateEnum
CREATE TYPE "TipoReporteProblema" AS ENUM ('ERROR', 'SUGERENCIA', 'DUDA');

-- CreateTable
CREATE TABLE "reportes_problema" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "autorNombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "tipo" "TipoReporteProblema" NOT NULL DEFAULT 'ERROR',
    "descripcion" TEXT NOT NULL,
    "url" TEXT,
    "userAgent" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'NUEVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reportes_problema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reportes_problema_creadoEn_idx" ON "reportes_problema"("creadoEn");
