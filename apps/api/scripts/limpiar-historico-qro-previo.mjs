// Limpia la familia "(Historico Queretaro)" (id=hist-qro-0001), una carga PREVIA
// de Querétaro (esHistorico=false) que infla/duplica las estadísticas de Qro.
// Borra sus servicios (y registros hijos) y la familia (y sus hijos).
//
// SEGURIDAD: DRY-RUN por defecto (no borra). Para aplicar:
//   node scripts/limpiar-historico-qro-previo.mjs apply
// Solo actúa sobre la familia con id EXACTO 'hist-qro-0001'. No toca nuestro
// import estructurado (esHistorico=true) ni ninguna otra familia.
//
import { readFileSync, existsSync } from 'node:fs';

if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  }
}

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const APLICAR = process.argv.includes('apply');
const FAM_ID = 'hist-qro-0001';

async function main() {
  console.log(`\n=== Limpiar "(Historico Queretaro)" ${FAM_ID} — ${APLICAR ? 'APLICAR (borra)' : 'DRY-RUN'} ===\n`);

  const fam = await prisma.familia.findUnique({ where: { id: FAM_ID }, select: { id: true, nombreContacto: true, plaza: true } });
  if (!fam) {
    console.log('La familia no existe. Nada que hacer.\n');
    return;
  }
  const servicios = await prisma.servicio.findMany({ where: { familiaId: FAM_ID }, select: { id: true, esHistorico: true, duracionHoras: true } });
  const ids = servicios.map((s) => s.id);
  const horas = servicios.reduce((a, s) => a + s.duracionHoras, 0);
  const conFlagHist = servicios.filter((s) => s.esHistorico).length;

  const [paquetes, notas, ninos] = await Promise.all([
    prisma.paquete.count({ where: { familiaId: FAM_ID } }),
    prisma.notaFamilia.count({ where: { familiaId: FAM_ID } }),
    prisma.nino.count({ where: { familiaId: FAM_ID } }),
  ]);

  console.log(`Familia: "${fam.nombreContacto}" (plaza ${fam.plaza})`);
  console.log(`  Servicios: ${servicios.length}  (${horas} h)  | de ellos esHistorico=true: ${conFlagHist}`);
  console.log(`  Paquetes: ${paquetes} | Notas: ${notas} | Niños: ${ninos}`);

  // Salvaguarda: si alguno fuera de NUESTRO import (esHistorico=true), avisar y abortar.
  if (conFlagHist > 0) {
    console.log('\n⚠ Hay servicios esHistorico=true colgados de esta familia. Abortando por seguridad.\n');
    return;
  }

  if (APLICAR) {
    await prisma.$transaction([
      prisma.ofertaRespuesta.deleteMany({ where: { servicioId: { in: ids } } }),
      prisma.reporteServicio.deleteMany({ where: { servicioId: { in: ids } } }),
      prisma.evaluacionServicio.deleteMany({ where: { servicioId: { in: ids } } }),
      prisma.evaluacionCoordServicio.deleteMany({ where: { servicioId: { in: ids } } }),
      prisma.finanzaServicio.deleteMany({ where: { servicioId: { in: ids } } }),
      prisma.servicio.deleteMany({ where: { familiaId: FAM_ID } }),
      prisma.paquete.deleteMany({ where: { familiaId: FAM_ID } }),
      prisma.notaFamilia.deleteMany({ where: { familiaId: FAM_ID } }),
      prisma.nino.deleteMany({ where: { familiaId: FAM_ID } }),
      prisma.familia.delete({ where: { id: FAM_ID } }),
    ]);
    console.log('\n✔ Familia y sus servicios eliminados.\n');
  } else {
    console.log('\nDRY-RUN: no se borró nada. Corre con "apply" para eliminar.\n');
  }
}

main()
  .catch((e) => { console.error('\nERROR:', e.message, '\n'); process.exit(1); })
  .finally(() => prisma.$disconnect());
