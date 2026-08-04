-- CreateTable
CREATE TABLE "nomina_pagos" (
    "id" TEXT NOT NULL,
    "nannieId" TEXT NOT NULL,
    "semana" DATE NOT NULL,
    "pagadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nomina_pagos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nomina_pagos_nannieId_semana_key" ON "nomina_pagos"("nannieId", "semana");

-- AddForeignKey
ALTER TABLE "nomina_pagos" ADD CONSTRAINT "nomina_pagos_nannieId_fkey" FOREIGN KEY ("nannieId") REFERENCES "nannies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
