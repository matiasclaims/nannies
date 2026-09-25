// Re-alinea la PLAZA (y zona) de servicios que quedaron desalineados respecto a
// su familia. Un servicio copia la plaza/zona de la familia al crearse; si la
// familia se reclasifica después (p.ej. Toluca→Querétaro), los servicios ya
// creados conservan la plaza vieja y "desaparecen" de las estadísticas de la
// plaza correcta (dona del Panorama, reportes por plaza).
//
// SEGURIDAD: DRY-RUN por defecto (no escribe). Para aplicar:
//   node scripts/realinear-plaza-servicios.mjs apply
// Solo toca servicios desalineados y NO históricos. No borra nada.
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

async function main() {
  console.log(`\n=== Re-alinear plaza de servicios — ${APLICAR ? 'APLICAR' : 'DRY-RUN'} ===\n`);

  // Servicios NO históricos cuya plaza no coincide con la de su familia.
  const servicios = await prisma.servicio.findMany({
    where: { esHistorico: false },
    select: {
      id: true, fecha: true, plaza: true, zona: true,
      familia: { select: { nombreContacto: true, plaza: true, zona: true } },
      nannie: { select: { nombre: true } },
    },
  });
  const desalineados = servicios.filter((s) => s.familia && s.plaza !== s.familia.plaza);

  if (desalineados.length === 0) {
    console.log('No hay servicios desalineados. Nada que hacer.\n');
    return;
  }

  for (const s of desalineados) {
    const zonaNueva = s.familia.zona || s.zona;
    console.log(
      `  ${s.fecha.toISOString().slice(0, 10)}  fam="${s.familia.nombreContacto}" (${s.nannie?.nombre ?? 'sin nannie'})\n` +
      `     plaza: ${s.plaza} → ${s.familia.plaza}   |   zona: "${s.zona || '—'}" → "${zonaNueva}"`,
    );
    if (APLICAR) {
      await prisma.servicio.update({
        where: { id: s.id },
        data: { plaza: s.familia.plaza, zona: zonaNueva },
      });
    }
  }

  console.log(`\nDesalineados: ${desalineados.length}`);
  console.log(APLICAR ? '\n✔ Aplicado.\n' : '\nDRY-RUN: no se escribió nada. Corre con "apply" para aplicar.\n');
}

main()
  .catch((e) => { console.error('\nERROR:', e.message, '\n'); process.exit(1); })
  .finally(() => prisma.$disconnect());
