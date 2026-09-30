// Reasigna la nannie de varias sesiones de un paquete (para corregir en bloque
// contra la base de Paula). No cambia horas ni cobro (la nannie no afecta el
// prorrateo; el pago es derivado). No toca canceladas/rechazadas. Dry-run.
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/paquete-reasignar.mjs <folio> --nannie "Marlene" --desde 2026-10-01 [--hasta YYYY-MM-DD] [--solo "Ivette"] [--apply]
//   (--solo limita a las que hoy tiene esa nannie; sin --desde/--hasta aplica a todas las vivas)
//
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}
const args = process.argv.slice(2);
const folio = Number(args[0]);
const APLICAR = args.includes('--apply');
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const nombreNannie = val('--nannie');
const desde = val('--desde') ? new Date(`${val('--desde')}T00:00:00.000Z`) : null;
const hasta = val('--hasta') ? new Date(`${val('--hasta')}T23:59:59.999Z`) : null;
const solo = val('--solo');
const CERRADOS = ['CANCELADO', 'RECHAZADO'];
if (!Number.isFinite(folio) || !nombreNannie) { console.error('\nUso: node scripts/paquete-reasignar.mjs <folio> --nannie "Nombre" [--desde YYYY-MM-DD] [--hasta YYYY-MM-DD] [--solo "OtraNannie"] [--apply]\n'); process.exit(1); }

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const cand = await prisma.nannie.findMany({ where: { nombre: { contains: nombreNannie, mode: 'insensitive' } }, select: { id: true, nombre: true } });
if (cand.length !== 1) { console.error(`\n"${nombreNannie}" ${cand.length === 0 ? 'no coincide con ninguna nannie' : 'coincide con varias: ' + cand.map((n) => n.nombre).join(', ')}.\n`); await prisma.$disconnect(); process.exit(1); }
const destino = cand[0];

const p = await prisma.paquete.findUnique({
  where: { folio },
  select: { folio: true, familia: { select: { nombreContacto: true, apellido: true } },
    servicios: { orderBy: { fecha: 'asc' }, select: { id: true, fecha: true, horaInicio: true, horaFin: true, estado: true, nannie: { select: { nombre: true } } } } },
});
if (!p) { console.error(`\nNo existe el paquete #${folio}.\n`); await prisma.$disconnect(); process.exit(1); }

const objetivo = p.servicios.filter((s) =>
  !CERRADOS.includes(s.estado) &&
  (!desde || s.fecha >= desde) &&
  (!hasta || s.fecha <= hasta) &&
  (!solo || (s.nannie?.nombre ?? '').toLowerCase().includes(solo.toLowerCase())) &&
  (s.nannie?.nombre ?? '') !== destino.nombre,
);

const fam = [p.familia.nombreContacto, p.familia.apellido].filter(Boolean).join(' ');
console.log(`\nPaquete #${p.folio} — ${fam}`);
console.log(`  Reasignar a: ${destino.nombre}`);
if (objetivo.length === 0) { console.log('  (No hay sesiones que cambiar con ese criterio.)\n'); await prisma.$disconnect(); process.exit(0); }
for (const s of objetivo) console.log(`   - ${s.fecha.toISOString().slice(0, 10)}  ${s.horaInicio}-${s.horaFin}  ${s.estado.padEnd(10)}  ${s.nannie?.nombre ?? '(sin nannie)'} -> ${destino.nombre}`);

if (!APLICAR) { console.log('\n(DRY-RUN. Nada se cambió. Agrega --apply.)\n'); await prisma.$disconnect(); process.exit(0); }
await prisma.servicio.updateMany({ where: { id: { in: objetivo.map((s) => s.id) } }, data: { nannieId: destino.id } });
console.log(`\n✔ ${objetivo.length} sesion(es) reasignadas a ${destino.nombre}.\n`);
await prisma.$disconnect();
