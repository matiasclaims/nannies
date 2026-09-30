// Marca como COMPLETADO las sesiones ACEPTADO de un paquete cuya fecha ya pasó
// (<= corte, por defecto hoy). Pone completadoEn = fecha de la sesion (para que
// el egreso caiga en su mes). Para que el cierre cuente esas horas. NO toca
// futuras ni serviciosAcumulados. Dry-run por defecto.
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/paquete-completar-pasadas.mjs <folio> [--hasta YYYY-MM-DD] [--apply]
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
if (!Number.isFinite(folio)) { console.error('\nUso: node scripts/paquete-completar-pasadas.mjs <folio> [--hasta YYYY-MM-DD] [--apply]\n'); process.exit(1); }
const hasta = val('--hasta') ? new Date(`${val('--hasta')}T23:59:59.999Z`) : new Date();

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const p = await prisma.paquete.findUnique({
  where: { folio },
  select: { id: true, folio: true, familia: { select: { nombreContacto: true, apellido: true } },
    servicios: { where: { estado: 'ACEPTADO', fecha: { lte: hasta } }, orderBy: { fecha: 'asc' }, select: { id: true, fecha: true, horaInicio: true, horaFin: true, nannie: { select: { nombre: true } } } } },
});
if (!p) { console.error(`\nNo existe el paquete #${folio}.\n`); await prisma.$disconnect(); process.exit(1); }

const fam = [p.familia.nombreContacto, p.familia.apellido].filter(Boolean).join(' ');
console.log(`\nPaquete #${p.folio} — ${fam}`);
if (p.servicios.length === 0) { console.log('  (No hay sesiones ACEPTADO pasadas por completar.)\n'); await prisma.$disconnect(); process.exit(0); }
console.log(`  Marcar COMPLETADO ${p.servicios.length} sesion(es) pasada(s):`);
for (const s of p.servicios) console.log(`   - ${s.fecha.toISOString().slice(0, 10)}  ${s.horaInicio}-${s.horaFin}  ${s.nannie?.nombre ?? '(sin nannie)'}`);

if (!APLICAR) { console.log('\n(DRY-RUN. Nada se cambió. Agrega --apply.)\n'); await prisma.$disconnect(); process.exit(0); }
for (const s of p.servicios) {
  await prisma.servicio.update({ where: { id: s.id }, data: { estado: 'COMPLETADO', completadoEn: s.fecha } });
}
console.log(`\n✔ ${p.servicios.length} sesion(es) marcadas COMPLETADO.\n`);
await prisma.$disconnect();
