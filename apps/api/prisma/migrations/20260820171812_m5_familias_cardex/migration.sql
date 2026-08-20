-- AlterTable
ALTER TABLE "familias" ADD COLUMN     "adultoResponsablePresente" BOOLEAN,
ADD COLUMN     "apellido" TEXT,
ADD COLUMN     "areasATrabajar" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "autorizacionAudiovisual" TEXT,
ADD COLUMN     "consentimientoConfidencialidad" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consentimientoMedico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consentimientoPrivacidad" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consentimientoReglamento" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "direccion" TEXT,
ADD COLUMN     "expectativas" TEXT,
ADD COLUMN     "mascotas" TEXT,
ADD COLUMN     "numeroEmergencia" TEXT,
ADD COLUMN     "reglasEspecificas" TEXT;

-- AlterTable
ALTER TABLE "ninos" ADD COLUMN     "autorizacionCambioPanal" BOOLEAN,
ADD COLUMN     "caracter" TEXT,
ADD COLUMN     "conductasRiesgo" TEXT,
ADD COLUMN     "reaccionAnteLoNuevo" TEXT,
ADD COLUMN     "restriccionesPantalla" TEXT,
ADD COLUMN     "tematicasInteres" TEXT;
