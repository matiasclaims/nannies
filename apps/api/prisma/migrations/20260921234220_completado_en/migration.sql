-- AlterTable
ALTER TABLE "servicios" ADD COLUMN     "completadoEn" TIMESTAMP(3);

-- Backfill: los servicios ya COMPLETADOS toman su fecha de servicio como fecha
-- de completado (proxy del histórico), para que la nómina/margen por completadoEn
-- no pierda datos previos.
UPDATE "servicios" SET "completadoEn" = "fecha" WHERE "estado" = 'COMPLETADO' AND "completadoEn" IS NULL;
