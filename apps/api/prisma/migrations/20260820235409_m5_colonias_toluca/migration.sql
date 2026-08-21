-- CreateTable
CREATE TABLE "colonias_toluca" (
    "id" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "colonia" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "precision" TEXT,

    CONSTRAINT "colonias_toluca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "colonias_toluca_municipio_idx" ON "colonias_toluca"("municipio");

-- CreateIndex
CREATE UNIQUE INDEX "colonias_toluca_municipio_colonia_key" ON "colonias_toluca"("municipio", "colonia");
