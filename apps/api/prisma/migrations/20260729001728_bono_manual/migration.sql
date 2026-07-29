-- CreateTable
CREATE TABLE "bonos" (
    "id" TEXT NOT NULL,
    "nannieId" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "motivo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bonos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bonos_nannieId_idx" ON "bonos"("nannieId");

-- AddForeignKey
ALTER TABLE "bonos" ADD CONSTRAINT "bonos_nannieId_fkey" FOREIGN KEY ("nannieId") REFERENCES "nannies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
