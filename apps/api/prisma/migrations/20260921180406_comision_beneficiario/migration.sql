-- AlterTable
ALTER TABLE "finanzas_servicio" ADD COLUMN     "comisionBeneficiarioId" TEXT;

-- AlterTable
ALTER TABLE "paquetes" ADD COLUMN     "comision" DECIMAL(10,2),
ADD COLUMN     "comisionBeneficiarioId" TEXT;
