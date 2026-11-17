// Prende TODOS los días (dom-sáb) en las colonias de nannie que hoy tienen los
// 7 días apagados (dias = []). El motor de sugerencias solo considera una
// colonia si el día del servicio está activo, así que con días vacíos esas
// nannies nunca salían sugeridas (Paula 2026-11-17).
//
// NO toca las colonias que ya tienen al menos un día elegido (respeta a quien
// configuró sus días a propósito, p. ej. Karen sin domingos).
//
// Dry-run por defecto; idempotente.
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/rellenar-dias-colonias.mjs           (muestra qué cambiaría)
//   node scripts/rellenar-dias-colonias.mjs --apply   (aplica)
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}
const APLICAR = process.argv.includes('--apply');
const TODOS = [0, 1, 2, 3, 4, 5, 6];
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const vacias = await prisma.nannieColonia.findMany({
  where: { dias: { isEmpty: true } },
  select: { id: true, nannie: { select: { nombre: true, estado: true } } },
});
const porNannie = new Map();
for (const v of vacias) {
  const k = `${v.nannie.nombre} (${v.nannie.estado})`;
  porNannie.set(k, (porNannie.get(k) ?? 0) + 1);
}

console.log(`\nColonias de nannie con los 7 días apagados: ${vacias.length}`);
for (const [k, n] of [...porNannie.entries()].sort()) console.log(`   ${k.padEnd(28)} ${n} colonias`);

if (!APLICAR) {
  console.log('\n(DRY-RUN. Nada cambió. Agrega --apply para prender todos los días.)\n');
  await prisma.$disconnect();
  process.exit(0);
}

const r = await prisma.nannieColonia.updateMany({ where: { dias: { isEmpty: true } }, data: { dias: TODOS } });
console.log(`\n✔ Listo: ${r.count} colonias ahora con dom-sáb activos.\n`);
await prisma.$disconnect();
