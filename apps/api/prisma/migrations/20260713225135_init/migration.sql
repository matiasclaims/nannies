-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('DIRECTORA', 'SUBDIRECTORA', 'NANNIE');

-- CreateEnum
CREATE TYPE "Plaza" AS ENUM ('TOLUCA', 'QUERETARO');

-- CreateEnum
CREATE TYPE "RangoPermanente" AS ENUM ('BASE', 'ROOKIE', 'JUNIOR', 'SENIOR');

-- CreateEnum
CREATE TYPE "NivelTarifa" AS ENUM ('BASE', 'TARIFA_25HRS', 'ROOKIE', 'JUNIOR', 'SENIOR');

-- CreateEnum
CREATE TYPE "EstadoNannie" AS ENUM ('ACTIVA', 'PAUSA', 'PRUEBA');

-- CreateEnum
CREATE TYPE "EstadoFamilia" AS ENUM ('ACTIVA', 'INACTIVA', 'SUSPENDIDA');

-- CreateEnum
CREATE TYPE "TipoServicio" AS ENUM ('DAYCARE', 'NIGHTCARE', 'ACOMPANAMIENTO_EVENTO', 'NANNIE_EXPRESS', 'NANNIE_FORANEA', 'NANNIE_FIESTA_PLAYDATE', 'LUDOTECA_MOVIL');

-- CreateEnum
CREATE TYPE "Formato" AS ENUM ('INDIVIDUAL', 'PAQUETE');

-- CreateEnum
CREATE TYPE "EstadoServicio" AS ENUM ('OFERTADO', 'ACEPTADO', 'RECHAZADO', 'COMPLETADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoDisponibilidad" AS ENUM ('DISPONIBLE', 'BLOQUEADO', 'TEMPORAL');

-- CreateEnum
CREATE TYPE "RespuestaOferta" AS ENUM ('ACEPTO', 'RECHAZO');

-- CreateEnum
CREATE TYPE "EstadoPaquete" AS ENUM ('ACTIVO', 'CONSUMIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "nannieId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nannies" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "plaza" "Plaza" NOT NULL,
    "zonas" TEXT[],
    "rangoPermanente" "RangoPermanente" NOT NULL DEFAULT 'BASE',
    "serviciosAcumulados" INTEGER NOT NULL DEFAULT 0,
    "nivelTarifaMesActual" "NivelTarifa" NOT NULL DEFAULT 'BASE',
    "estado" "EstadoNannie" NOT NULL DEFAULT 'PRUEBA',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nannies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "familias" (
    "id" TEXT NOT NULL,
    "nombreContacto" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "plaza" "Plaza" NOT NULL,
    "zona" TEXT,
    "estado" "EstadoFamilia" NOT NULL DEFAULT 'ACTIVA',
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "familias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ninos" (
    "id" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "edad" INTEGER,
    "genero" TEXT,
    "rutinas" TEXT,
    "necesidades" TEXT,
    "salud" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ninos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disponibilidad" (
    "id" TEXT NOT NULL,
    "nannieId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "estado" "EstadoDisponibilidad" NOT NULL DEFAULT 'DISPONIBLE',
    "fechaReintegro" DATE,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disponibilidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicios" (
    "id" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "nannieId" TEXT,
    "plaza" "Plaza" NOT NULL,
    "zona" TEXT NOT NULL,
    "tipoServicio" "TipoServicio" NOT NULL,
    "formato" "Formato" NOT NULL,
    "paqueteId" TEXT,
    "numNinos" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "duracionHoras" INTEGER NOT NULL,
    "estado" "EstadoServicio" NOT NULL DEFAULT 'OFERTADO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ofertas_respuesta" (
    "id" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "nannieId" TEXT NOT NULL,
    "respuesta" "RespuestaOferta" NOT NULL,
    "fechaRespuesta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ofertas_respuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paquetes" (
    "id" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "horasTotales" INTEGER NOT NULL,
    "horasConsumidas" INTEGER NOT NULL DEFAULT 0,
    "precioTotal" DECIMAL(10,2) NOT NULL,
    "fechaContratacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoPaquete" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "paquetes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_nannieId_key" ON "usuarios"("nannieId");

-- CreateIndex
CREATE INDEX "ninos_familiaId_idx" ON "ninos"("familiaId");

-- CreateIndex
CREATE INDEX "disponibilidad_nannieId_fecha_idx" ON "disponibilidad"("nannieId", "fecha");

-- CreateIndex
CREATE INDEX "servicios_nannieId_fecha_idx" ON "servicios"("nannieId", "fecha");

-- CreateIndex
CREATE INDEX "servicios_familiaId_idx" ON "servicios"("familiaId");

-- CreateIndex
CREATE INDEX "servicios_estado_idx" ON "servicios"("estado");

-- CreateIndex
CREATE INDEX "ofertas_respuesta_nannieId_idx" ON "ofertas_respuesta"("nannieId");

-- CreateIndex
CREATE INDEX "paquetes_familiaId_idx" ON "paquetes"("familiaId");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_nannieId_fkey" FOREIGN KEY ("nannieId") REFERENCES "nannies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ninos" ADD CONSTRAINT "ninos_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "familias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disponibilidad" ADD CONSTRAINT "disponibilidad_nannieId_fkey" FOREIGN KEY ("nannieId") REFERENCES "nannies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "familias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_nannieId_fkey" FOREIGN KEY ("nannieId") REFERENCES "nannies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "paquetes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofertas_respuesta" ADD CONSTRAINT "ofertas_respuesta_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofertas_respuesta" ADD CONSTRAINT "ofertas_respuesta_nannieId_fkey" FOREIGN KEY ("nannieId") REFERENCES "nannies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paquetes" ADD CONSTRAINT "paquetes_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "familias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
