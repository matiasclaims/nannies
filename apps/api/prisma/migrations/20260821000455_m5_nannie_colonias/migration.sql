-- AlterTable
ALTER TABLE "nannies" ADD COLUMN     "coloniasBloqueadas" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "nannie_colonias" (
    "id" TEXT NOT NULL,
    "nannieId" TEXT NOT NULL,
    "coloniaId" TEXT NOT NULL,
    "dias" INTEGER[],

    CONSTRAINT "nannie_colonias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nannie_colonias_nannieId_idx" ON "nannie_colonias"("nannieId");

-- CreateIndex
CREATE UNIQUE INDEX "nannie_colonias_nannieId_coloniaId_key" ON "nannie_colonias"("nannieId", "coloniaId");

-- AddForeignKey
ALTER TABLE "nannie_colonias" ADD CONSTRAINT "nannie_colonias_nannieId_fkey" FOREIGN KEY ("nannieId") REFERENCES "nannies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nannie_colonias" ADD CONSTRAINT "nannie_colonias_coloniaId_fkey" FOREIGN KEY ("coloniaId") REFERENCES "colonias_toluca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
