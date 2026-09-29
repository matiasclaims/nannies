// Muestra, para una FAMILIA (búsqueda por nombre), todos sus paquetes con el
// desglose de sesiones — para comparar contra la pestaña de esa familia en la
// base de control de Paula. SOLO LECTURA (no cambia nada).
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/paquetes-familia.mjs "candelas"
//   node scripts/paquetes-familia.mjs "beatriz martinez"
//
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}
const Q = (process.argv[2] || '').trim().toLowerCase();
if (!Q) { console.error('\nUso: node scripts/paquetes-familia.mjs "<nombre de familia>"\n'); process.exit(1); }
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const familias = await prisma.familia.findMany({
  where: {
    OR: [
      { nombreContacto: { contains: Q, mode: 'insensitive' } },
      { apellido: { contains: Q, mode: 'insensitive' } },
    ],
  },
  select: {
    id: true, nombreContacto: true, apellido: true, plaza: true,
    paquetes: {
      orderBy: [{ fechaContratacion: 'asc' }, { folio: 'asc' }],
      select: {
        folio: true, estado: true, fechaContratacion: true, horasTotales: true, horasConsumidas: true,
        servicios: {
          orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
          select: { fecha: true, horaInicio: true, horaFin: true, duracionHoras: true, estado: true, nannie: { select: { nombre: true } } },
        },
      },
    },
  },
});

if (familias.length === 0) { console.log(`\nSin familias que coincidan con "${Q}".\n`); await prisma.$disconnect(); process.exit(0); }

for (const f of familias) {
  const nom = [f.nombreContacto, f.apellido].filter(Boolean).join(' ');
  console.log(`\n══════ FAMILIA: ${nom}  (${f.plaza})  [${familias.length > 1 ? 'coincidencia' : 'única'}] ══════`);
  if (f.paquetes.length === 0) { console.log('  (sin paquetes)'); continue; }
  for (const p of f.paquetes) {
    const rest = p.horasTotales - p.horasConsumidas;
    console.log(`\n  ▸ Paquete #${p.folio}  ${p.estado}  ${p.horasConsumidas}/${p.horasTotales} h (restan ${rest})  contratado ${p.fechaContratacion.toISOString().slice(0, 10)}`);
    if (p.servicios.length === 0) { console.log('      · sin sesiones'); continue; }
    for (const s of p.servicios) {
      console.log(`      · ${s.fecha.toISOString().slice(0, 10)}  ${s.horaInicio}-${s.horaFin}  ${String(s.duracionHoras).padStart(2)}h  ${s.estado.padEnd(10)}  ${s.nannie?.nombre ?? '(sin nannie)'}`);
    }
  }
}
console.log('');
await prisma.$disconnect();
