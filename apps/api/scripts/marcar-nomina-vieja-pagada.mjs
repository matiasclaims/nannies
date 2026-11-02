// CORTE del "pendiente por pagar": marca como PAGADAS todas las semanas (dom-sáb)
// hasta una fecha de corte (inclusive), para todas las nannies. Así el nuevo
// indicador "Pendiente por pagar a nannies" arranca limpio y solo cuenta lo que
// quede sin pagar DESPUÉS del corte.
//
// La marca es por (nannie, semana) — la misma que usa la palomita de la nómina.
// Marcar semanas sin actividad es inofensivo (esa semana vale $0).
//
// Dry-run por defecto. Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/marcar-nomina-vieja-pagada.mjs 2026-10-25           (dry-run)
//   node scripts/marcar-nomina-vieja-pagada.mjs 2026-10-25 --apply
//   (la fecha es el ÚLTIMO domingo que ya tienes pagado; se marca hasta ahí.)
//
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}

const SEMANAS_ATRAS = 40; // cuántas semanas hacia atrás del corte se marcan
const corteArg = process.argv.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const APLICAR = process.argv.includes('--apply');
if (!corteArg) {
  console.error('\nUso: node scripts/marcar-nomina-vieja-pagada.mjs <YYYY-MM-DD> [--apply]');
  console.error('     (la fecha es el último domingo ya pagado; se marca hasta esa semana)\n');
  process.exit(1);
}

const iso = (utc) => new Date(utc).toISOString().slice(0, 10);
// Domingo de la semana que contiene la fecha de corte.
const corteUTC = Date.UTC(...corteArg.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))));
const corteDom = corteUTC - new Date(corteUTC).getUTCDay() * 86_400_000;

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const nannies = await prisma.nannie.findMany({ select: { id: true } });

const semanas = [];
for (let i = 0; i < SEMANAS_ATRAS; i++) semanas.push(new Date(corteDom - i * 7 * 86_400_000));
const rows = [];
for (const sem of semanas) for (const n of nannies) rows.push({ nannieId: n.id, semana: sem });

console.log(`\nCorte de pendiente por pagar`);
console.log(`  Corte (domingo): ${iso(corteDom)}  ·  ${SEMANAS_ATRAS} semanas hacia atrás  ·  ${nannies.length} nannies`);
console.log(`  Se marcarían como PAGADAS las semanas desde ${iso(corteDom - (SEMANAS_ATRAS - 1) * 7 * 86_400_000)} hasta ${iso(corteDom)}.`);

if (!APLICAR) {
  const existentes = await prisma.nominaPago.count({ where: { semana: { in: semanas } } });
  console.log(`  Marcas de pagado existentes en ese rango: ${existentes}.  (nuevas se crearían al aplicar)`);
  console.log('\n(DRY-RUN. Nada se creó. Agrega --apply para aplicar.)\n');
  await prisma.$disconnect(); process.exit(0);
}

const r = await prisma.nominaPago.createMany({ data: rows, skipDuplicates: true });
console.log(`\n✔ Corte aplicado: ${r.count} marcas de pagado nuevas (hasta ${iso(corteDom)}). El pendiente ahora cuenta solo lo posterior.\n`);
await prisma.$disconnect();
