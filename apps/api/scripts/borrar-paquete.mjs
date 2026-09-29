// Borra por completo un PAQUETE y todos sus servicios (aunque tenga horas
// consumidas o servicios COMPLETADOS), para casos de paquete creado con error.
// Elimina tambien los registros ligados a cada servicio (finanzas, ofertas,
// reportes, evaluaciones) y ajusta serviciosAcumulados de las nannies que hayan
// contado una sesion COMPLETADA de este paquete (1 por nannie).
//
// SOLO para corregir errores. Es DESTRUCTIVO e irreversible.
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/borrar-paquete.mjs <folio>            (dry-run: muestra que borraria)
//   node scripts/borrar-paquete.mjs <folio> --apply    (borra de verdad)
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}
const FOLIO = Number(process.argv[2]);
const APLICAR = process.argv.includes('--apply');
if (!Number.isFinite(FOLIO)) {
  console.error('\nUso: node scripts/borrar-paquete.mjs <folio> [--apply]\n');
  process.exit(1);
}
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const paq = await prisma.paquete.findUnique({
  where: { folio: FOLIO },
  select: {
    id: true, folio: true, estado: true, horasTotales: true, horasConsumidas: true,
    familia: { select: { nombreContacto: true, apellido: true } },
    servicios: { select: { id: true, fecha: true, estado: true, formato: true, nannieId: true, nannie: { select: { nombre: true } } } },
  },
});
if (!paq) { console.error(`\nNo existe un paquete con folio ${FOLIO}.\n`); await prisma.$disconnect(); process.exit(1); }

const ids = paq.servicios.map((s) => s.id);
// serviciosAcumulados: cada (paquete, nannie) sumó 1 al COMPLETAR su 1a sesion.
// Al borrar el paquete, se resta 1 por cada nannie con >=1 sesion COMPLETADA.
const nanniesConteo = [...new Set(paq.servicios.filter((s) => s.estado === 'COMPLETADO' && s.nannieId).map((s) => s.nannieId))];

const fam = [paq.familia.nombreContacto, paq.familia.apellido].filter(Boolean).join(' ');
console.log(`\nPaquete #${paq.folio} — ${fam}`);
console.log(`  estado=${paq.estado}  horas=${paq.horasConsumidas}/${paq.horasTotales}  servicios=${paq.servicios.length}`);
for (const s of paq.servicios) {
  console.log(`   - ${s.fecha.toISOString().slice(0, 10)}  ${s.estado.padEnd(10)}  ${s.formato.padEnd(9)}  ${s.nannie?.nombre ?? '(sin nannie)'}`);
}
if (nanniesConteo.length) {
  const nombres = paq.servicios.filter((s) => nanniesConteo.includes(s.nannieId)).map((s) => s.nannie?.nombre);
  console.log(`  Ajuste serviciosAcumulados: -1 a ${[...new Set(nombres)].join(', ')}`);
}

if (!APLICAR) {
  console.log('\n(DRY-RUN. Nada se borró. Vuelve a correr con --apply para eliminar el paquete y sus servicios.)\n');
  await prisma.$disconnect();
  process.exit(0);
}

await prisma.$transaction(async (tx) => {
  await tx.finanzaServicio.deleteMany({ where: { servicioId: { in: ids } } });
  await tx.ofertaRespuesta.deleteMany({ where: { servicioId: { in: ids } } });
  await tx.reporteServicio.deleteMany({ where: { servicioId: { in: ids } } });
  await tx.evaluacionServicio.deleteMany({ where: { servicioId: { in: ids } } });
  await tx.evaluacionCoordServicio.deleteMany({ where: { servicioId: { in: ids } } });
  await tx.servicio.deleteMany({ where: { id: { in: ids } } });
  // evaluacionesCoord a nivel paquete se borran en cascada al borrar el paquete.
  await tx.paquete.delete({ where: { id: paq.id } });
  for (const nid of nanniesConteo) {
    await tx.nannie.update({ where: { id: nid }, data: { serviciosAcumulados: { decrement: 1 } } });
  }
});
console.log(`\n✔ Borrado el paquete #${paq.folio} y sus ${ids.length} servicios (con ${nanniesConteo.length} ajuste(s) de conteo).\n`);
await prisma.$disconnect();
