// Diagnóstico (SOLO LECTURA) de los servicios de Querétaro del MES ACTUAL.
// Sirve para entender por qué la dona "Horas · Querétaro" del Panorama no
// muestra nada: esa dona es POR NANNIE, así que omite los servicios sin nannie
// y los CANCELADO/RECHAZADO. No escribe nada.
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/qro-mes-diagnostico.mjs
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

async function main() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth();
  const inicio = new Date(Date.UTC(y, mo, 1));
  const finExcl = new Date(Date.UTC(y, mo + 1, 1));

  const servicios = await prisma.servicio.findMany({
    where: { plaza: 'QUERETARO', fecha: { gte: inicio, lt: finExcl } },
    select: {
      fecha: true, estado: true, zona: true, duracionHoras: true,
      nannie: { select: { nombre: true } },
    },
    orderBy: { fecha: 'asc' },
  });

  console.log(`\nServicios de Querétaro en ${y}-${String(mo + 1).padStart(2, '0')}: ${servicios.length}\n`);
  for (const s of servicios) {
    const nan = s.nannie?.nombre ?? '*** SIN NANNIE (por asignar) ***';
    console.log(`  ${s.fecha.toISOString().slice(0, 10)}  ${s.estado.padEnd(11)} ${String(s.duracionHoras).padStart(3)}h  ${s.zona || '—'}  →  ${nan}`);
  }

  const conNannie = servicios.filter((s) => s.nannie);
  const vigentesConNannie = conNannie.filter((s) => s.estado !== 'CANCELADO' && s.estado !== 'RECHAZADO');
  const horasDona = vigentesConNannie.reduce((a, s) => a + s.duracionHoras, 0);
  console.log('\n--- Resumen ---');
  console.log(`  Total: ${servicios.length}`);
  console.log(`  Con nannie: ${conNannie.length}  |  Sin nannie (no salen en la dona): ${servicios.length - conNannie.length}`);
  console.log(`  Que SÍ cuentan en la dona (con nannie y no cancelado/rechazado): ${vigentesConNannie.length}  → ${horasDona} h`);
  console.log('\n(Si la dona sale vacía y aquí hay servicios "SIN NANNIE", esa es la razón.)\n');
}

main()
  .catch((e) => { console.error('\nERROR:', e.message, '\n'); process.exit(1); })
  .finally(() => prisma.$disconnect());
