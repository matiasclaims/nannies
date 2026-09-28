// Solo lectura: por nannie, cuántas encuestas de papás (respondidas) y cuántas
// evaluaciones de coordinación tiene, y el promedio que mostraría su Panorama.
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const prom = (ns) => ns.length ? Math.round((ns.reduce((s, n) => s + n, 0) / ns.length) * 10) / 10 : null;
const nannies = await prisma.nannie.findMany({ select: { id: true, nombre: true, plaza: true }, orderBy: { nombre: 'asc' } });
console.log('\nNannie | Papás(resp) prom | Agencia(coord) prom\n' + '-'.repeat(60));
for (const n of nannies) {
  const [papas, coord] = await Promise.all([
    prisma.evaluacionServicio.findMany({ where: { respondidoEn: { not: null }, servicio: { nannieId: n.id } }, select: { calificacion: true } }),
    prisma.evaluacionCoordServicio.findMany({ where: { nannieId: n.id }, select: { calificacion: true } }),
  ]);
  const pP = prom(papas.map((e) => e.calificacion ?? 0));
  const pC = prom(coord.map((e) => Number(e.calificacion)));
  if (papas.length || coord.length) console.log(`${n.nombre.padEnd(22)} | ${String(pP ?? '—').padStart(4)} (${papas.length}) | ${String(pC ?? '—').padStart(4)} (${coord.length})`);
}
console.log('\n(Solo se listan nannies con al menos una evaluación. Las demás no muestran badge por no tener datos.)\n');
await prisma.$disconnect();
