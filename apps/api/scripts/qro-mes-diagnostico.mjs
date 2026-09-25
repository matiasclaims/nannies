// Diagnóstico (SOLO LECTURA) de los servicios del MES ACTUAL, enfocado en el
// desalineamiento de plaza: un servicio copia la plaza de la familia al crearse,
// así que si la familia estaba mal clasificada (Toluca) el servicio queda en
// Toluca aunque luego se corrija la familia. Eso explica que la dona "Horas ·
// Querétaro" no muestre servicios de nannies de Qro. No escribe nada.
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
  const etq = `${y}-${String(mo + 1).padStart(2, '0')}`;

  const servicios = await prisma.servicio.findMany({
    where: { fecha: { gte: inicio, lt: finExcl } },
    select: {
      fecha: true, estado: true, zona: true, duracionHoras: true, plaza: true,
      nannie: { select: { nombre: true } },
      familia: { select: { nombreContacto: true, plaza: true } },
    },
    orderBy: { fecha: 'asc' },
  });

  const porPlaza = {};
  for (const s of servicios) porPlaza[s.plaza] = (porPlaza[s.plaza] || 0) + 1;
  console.log(`\nServicios del mes ${etq}: ${servicios.length}`);
  console.log('  Por plaza (del servicio):', JSON.stringify(porPlaza));

  // Desalineados: la plaza del servicio no coincide con la de su familia.
  const desalineados = servicios.filter((s) => s.familia && s.plaza !== s.familia.plaza);
  console.log(`\n--- Desalineados (servicio.plaza ≠ familia.plaza): ${desalineados.length} ---`);
  for (const s of desalineados) {
    console.log(`  ${s.fecha.toISOString().slice(0, 10)}  serv=${s.plaza} / fam=${s.familia.plaza}  ${String(s.duracionHoras)}h  ${s.zona || '—'}  fam="${s.familia.nombreContacto}"  →  ${s.nannie?.nombre ?? 'sin nannie'}`);
  }

  // Servicios de nannies cuyo nombre parece "Ángela".
  const angela = servicios.filter((s) => (s.nannie?.nombre ?? '').toLowerCase().includes('ang'));
  console.log(`\n--- Servicios de nannies "Áng..." este mes: ${angela.length} ---`);
  for (const s of angela) {
    console.log(`  ${s.fecha.toISOString().slice(0, 10)}  serv=${s.plaza} / fam=${s.familia?.plaza ?? '—'}  ${String(s.duracionHoras)}h  ${s.zona || '—'}  fam="${s.familia?.nombreContacto ?? '—'}"  →  ${s.nannie?.nombre}`);
  }
  console.log('');
}

main()
  .catch((e) => { console.error('\nERROR:', e.message, '\n'); process.exit(1); })
  .finally(() => prisma.$disconnect());
