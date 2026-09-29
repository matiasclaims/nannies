// Consolidación retroactiva de encuestas de paquete: la encuesta de papás pasa
// a ser UNA por paquete y nannie (en la última sesión de esa nannie), no una por
// día. Este script busca encuestas ya CREADAS pero SIN responder que están en
// sesiones de paquete que NO son la última de esa nannie (ya no deberían existir)
// y las elimina. Las encuestas RESPONDIDAS nunca se tocan (son datos reales).
//
// Uso:
//   node scripts/encuestas-paquete-consolidar.mjs           (dry-run, solo lista)
//   node scripts/encuestas-paquete-consolidar.mjs --apply   (borra las huérfanas)
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}
const APLICAR = process.argv.includes('--apply');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

// Encuestas SIN responder cuyo servicio es de paquete.
const encuestas = await prisma.evaluacionServicio.findMany({
  where: { respondidoEn: null, servicio: { paqueteId: { not: null } } },
  select: {
    id: true,
    servicio: { select: { id: true, paqueteId: true, nannieId: true, fecha: true, horaInicio: true } },
  },
});

// Portadoras: última sesión (fecha, hora) de cada (paquete, nannie) entre las
// sesiones vivas (no canceladas/rechazadas).
const paqueteIds = [...new Set(encuestas.map((e) => e.servicio.paqueteId))];
const sesiones = await prisma.servicio.findMany({
  where: { paqueteId: { in: paqueteIds }, nannieId: { not: null }, estado: { notIn: ['CANCELADO', 'RECHAZADO'] } },
  select: { id: true, paqueteId: true, nannieId: true, fecha: true, horaInicio: true },
});
const ultima = new Map();
for (const s of sesiones) {
  const k = `${s.paqueteId}|${s.nannieId}`;
  const prev = ultima.get(k);
  const posterior = !prev || s.fecha > prev.fecha || (s.fecha.getTime() === prev.fecha.getTime() && s.horaInicio > prev.horaInicio);
  if (posterior) ultima.set(k, s);
}
const portadores = new Set([...ultima.values()].map((s) => s.id));

// Huérfanas = encuestas sin responder en sesiones de paquete que NO son la última.
const huerfanas = encuestas.filter((e) => !portadores.has(e.servicio.id));

console.log(`\nEncuestas de paquete SIN responder: ${encuestas.length}`);
console.log(`  · en la última sesión (se conservan):   ${encuestas.length - huerfanas.length}`);
console.log(`  · en sesiones anteriores (a eliminar):   ${huerfanas.length}\n`);
for (const e of huerfanas.slice(0, 40)) {
  console.log(`  - serv ${e.servicio.id}  paq ${e.servicio.paqueteId}  ${e.servicio.fecha.toISOString().slice(0, 10)} ${e.servicio.horaInicio}`);
}
if (huerfanas.length > 40) console.log(`  … y ${huerfanas.length - 40} más`);

if (!APLICAR) {
  console.log('\n(DRY-RUN. Nada se borró. Corre con --apply para eliminar las huérfanas.)\n');
} else if (huerfanas.length) {
  const r = await prisma.evaluacionServicio.deleteMany({ where: { id: { in: huerfanas.map((e) => e.id) } } });
  console.log(`\n✔ Eliminadas ${r.count} encuestas huérfanas (sin responder, no portadoras).\n`);
} else {
  console.log('\nNada que eliminar.\n');
}
await prisma.$disconnect();
