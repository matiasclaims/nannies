// Limpieza de encuestas de FAMILIA (papás) pendientes ANTERIORES al arranque del
// sistema (19-sep-2026). Borra solo las que NO se han respondido y cuyo servicio
// tiene fecha < 19-sep. Las respondidas nunca se tocan; nada posterior al 19 se
// toca. (Las encuestas de COORDINACIÓN pendientes son derivadas: no hay registros
// que borrar, se filtran por fecha en la bandeja.)
//
// Uso:
//   node scripts/encuestas-previas-corte.mjs           (dry-run, solo cuenta)
//   node scripts/encuestas-previas-corte.mjs --apply   (borra)
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}
const CORTE = new Date('2026-09-19T00:00:00.000Z');
const APLICAR = process.argv.includes('--apply');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

// Encuestas de papás SIN responder cuyo servicio es anterior al corte.
const previas = await prisma.evaluacionServicio.findMany({
  where: { respondidoEn: null, servicio: { fecha: { lt: CORTE } } },
  select: { id: true, servicio: { select: { id: true, fecha: true } } },
});
// Referencia informativa: cuántas respondidas previas hay (NO se tocan).
const respondidasPrevias = await prisma.evaluacionServicio.count({
  where: { respondidoEn: { not: null }, servicio: { fecha: { lt: CORTE } } },
});

console.log(`\nCorte: encuestas de familia con servicio ANTES del 19-sep-2026`);
console.log(`  · pendientes (sin responder) a eliminar: ${previas.length}`);
console.log(`  · respondidas previas (se conservan):    ${respondidasPrevias}`);
for (const e of previas.slice(0, 40)) {
  console.log(`  - eval ${e.id}  serv ${e.servicio.id}  ${e.servicio.fecha.toISOString().slice(0, 10)}`);
}
if (previas.length > 40) console.log(`  … y ${previas.length - 40} más`);

if (!APLICAR) {
  console.log('\n(DRY-RUN. Nada se borró. Corre con --apply para eliminar.)\n');
} else if (previas.length) {
  const r = await prisma.evaluacionServicio.deleteMany({ where: { id: { in: previas.map((e) => e.id) } } });
  console.log(`\n✔ Eliminadas ${r.count} encuestas de familia pendientes previas al corte.\n`);
} else {
  console.log('\nNada que eliminar.\n');
}
await prisma.$disconnect();
