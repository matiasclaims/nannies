// Borra sesion(es) de un paquete (para limpiar duplicados/canceladas o quitar
// una sesion que no debe existir). Borra los registros ligados (finanzas,
// ofertas, reportes, evaluaciones) y recalcula el saldo del paquete. Dry-run.
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/paquete-sesion-borrar.mjs <folio> --canceladas            (borra todas las CANCELADO/RECHAZADO)
//   node scripts/paquete-sesion-borrar.mjs <folio> --fecha 2026-09-07      (borra la sesion de esa fecha)
//   ...agrega --estado CANCELADO si hay varias en la misma fecha
//   ...agrega --apply para aplicar
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
const soloCanceladas = args.includes('--canceladas');
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const fecha = val('--fecha');
const estadoFiltro = val('--estado');
const CERRADOS = ['CANCELADO', 'RECHAZADO'];
if (!Number.isFinite(folio) || (!soloCanceladas && !fecha)) {
  console.error('\nUso: node scripts/paquete-sesion-borrar.mjs <folio> (--canceladas | --fecha YYYY-MM-DD [--estado E]) [--apply]\n');
  process.exit(1);
}
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const p = await prisma.paquete.findUnique({
  where: { folio },
  select: {
    id: true, folio: true, estado: true, horasTotales: true, horasConsumidas: true,
    familia: { select: { nombreContacto: true, apellido: true } },
    servicios: { select: { id: true, fecha: true, horaInicio: true, horaFin: true, duracionHoras: true, estado: true, nannie: { select: { nombre: true } } } },
  },
});
if (!p) { console.error(`\nNo existe el paquete #${folio}.\n`); await prisma.$disconnect(); process.exit(1); }

let objetivo;
if (soloCanceladas) {
  objetivo = p.servicios.filter((s) => CERRADOS.includes(s.estado));
} else {
  objetivo = p.servicios.filter((s) => s.fecha.toISOString().slice(0, 10) === fecha && (!estadoFiltro || s.estado === estadoFiltro));
  if (objetivo.length > 1) { console.error(`\nHay ${objetivo.length} sesiones en ${fecha}. Especifica --estado para elegir.\n`); await prisma.$disconnect(); process.exit(1); }
}
if (objetivo.length === 0) { console.log('\n(Nada que borrar con ese criterio.)\n'); await prisma.$disconnect(); process.exit(0); }

const ids = objetivo.map((s) => s.id);
const idsSet = new Set(ids);
const consumidasNuevas = p.servicios
  .filter((s) => !idsSet.has(s.id) && !CERRADOS.includes(s.estado))
  .reduce((a, s) => a + s.duracionHoras, 0);
const estadoPaqNuevo = consumidasNuevas >= p.horasTotales ? 'CONSUMIDO' : (p.estado === 'CONSUMIDO' ? 'ACTIVO' : p.estado);

const fam = [p.familia.nombreContacto, p.familia.apellido].filter(Boolean).join(' ');
console.log(`\nPaquete #${p.folio} — ${fam}   (${p.horasConsumidas}/${p.horasTotales} h, ${p.estado})`);
console.log(`  Borrar ${objetivo.length} sesion(es):`);
for (const s of objetivo) console.log(`   - ${s.fecha.toISOString().slice(0, 10)}  ${s.horaInicio}-${s.horaFin}  ${s.duracionHoras}h  ${s.estado.padEnd(10)}  ${s.nannie?.nombre ?? '(sin nannie)'}`);
console.log(`  Saldo: ${p.horasConsumidas}/${p.horasTotales} -> ${consumidasNuevas}/${p.horasTotales}  estado ${p.estado} -> ${estadoPaqNuevo}`);

if (!APLICAR) { console.log('\n(DRY-RUN. Nada se borró. Agrega --apply para borrar.)\n'); await prisma.$disconnect(); process.exit(0); }

await prisma.$transaction(async (tx) => {
  await tx.finanzaServicio.deleteMany({ where: { servicioId: { in: ids } } });
  await tx.ofertaRespuesta.deleteMany({ where: { servicioId: { in: ids } } });
  await tx.reporteServicio.deleteMany({ where: { servicioId: { in: ids } } });
  await tx.evaluacionServicio.deleteMany({ where: { servicioId: { in: ids } } });
  await tx.evaluacionCoordServicio.deleteMany({ where: { servicioId: { in: ids } } });
  await tx.servicio.deleteMany({ where: { id: { in: ids } } });
  await tx.paquete.update({ where: { id: p.id }, data: { horasConsumidas: consumidasNuevas, estado: estadoPaqNuevo } });
});
console.log(`\n✔ Borradas ${ids.length} sesion(es). Saldo -> ${consumidasNuevas}/${p.horasTotales} (${estadoPaqNuevo}).\n`);
await prisma.$disconnect();
