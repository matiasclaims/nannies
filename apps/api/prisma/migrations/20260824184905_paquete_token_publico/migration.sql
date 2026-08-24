-- AlterTable
ALTER TABLE "paquetes" ADD COLUMN "tokenPublico" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "paquetes_tokenPublico_key" ON "paquetes"("tokenPublico");
