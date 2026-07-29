-- CreateTable
CREATE TABLE "finanzas_servicio" (
    "id" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "cobroFamilia" DECIMAL(10,2) NOT NULL,
    "pagoNannie" DECIMAL(10,2),
    "nivelAplicado" "NivelTarifa",
    "comision" DECIMAL(10,2),
    "ajuste" DECIMAL(10,2),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finanzas_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cierres_mes" (
    "id" TEXT NOT NULL,
    "nannieId" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "horasMesPrevio" DECIMAL(6,2) NOT NULL,
    "nivelAsignado" "NivelTarifa" NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cierres_mes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "finanzas_servicio_servicioId_key" ON "finanzas_servicio"("servicioId");

-- CreateIndex
CREATE INDEX "cierres_mes_nannieId_idx" ON "cierres_mes"("nannieId");

-- CreateIndex
CREATE UNIQUE INDEX "cierres_mes_nannieId_anio_mes_key" ON "cierres_mes"("nannieId", "anio", "mes");

-- AddForeignKey
ALTER TABLE "finanzas_servicio" ADD CONSTRAINT "finanzas_servicio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cierres_mes" ADD CONSTRAINT "cierres_mes_nannieId_fkey" FOREIGN KEY ("nannieId") REFERENCES "nannies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
