-- AlterTable
ALTER TABLE "servicios" ADD COLUMN     "coloniaId" TEXT;

-- AddForeignKey
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_coloniaId_fkey" FOREIGN KEY ("coloniaId") REFERENCES "colonias_toluca"("id") ON DELETE SET NULL ON UPDATE CASCADE;
