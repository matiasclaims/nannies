-- Folio legible y único por paquete (identifica el paquete "en todos lados"
-- para no confundir paquetes de una misma familia). Backfill CRONOLÓGICO por
-- fecha de contratación, de modo que los paquetes más antiguos (agosto 2026 en
-- adelante) tengan los folios más bajos. Estado final = columna INTEGER NOT NULL
-- con default nextval de una secuencia propia + índice único (equivalente a
-- @default(autoincrement()) de Prisma).

-- 1) Columna temporalmente nullable + secuencia.
ALTER TABLE "paquetes" ADD COLUMN "folio" INTEGER;
CREATE SEQUENCE "paquetes_folio_seq";

-- 2) Backfill cronológico (fecha de contratación, luego id para desempatar).
WITH ordenados AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "fechaContratacion" ASC, "id" ASC) AS rn
  FROM "paquetes"
)
UPDATE "paquetes" p SET "folio" = o.rn FROM ordenados o WHERE p."id" = o."id";

-- 3) Avanza la secuencia más allá del máximo asignado (o queda en 1 si no había).
SELECT setval(
  'paquetes_folio_seq',
  COALESCE((SELECT MAX("folio") FROM "paquetes"), 1),
  COALESCE((SELECT MAX("folio") FROM "paquetes"), 0) > 0
);

-- 4) Default + NOT NULL + pertenencia de la secuencia + índice único.
ALTER TABLE "paquetes" ALTER COLUMN "folio" SET DEFAULT nextval('paquetes_folio_seq');
ALTER TABLE "paquetes" ALTER COLUMN "folio" SET NOT NULL;
ALTER SEQUENCE "paquetes_folio_seq" OWNED BY "paquetes"."folio";
CREATE UNIQUE INDEX "paquetes_folio_key" ON "paquetes"("folio");
