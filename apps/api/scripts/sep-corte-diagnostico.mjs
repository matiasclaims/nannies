// Diagnóstico (SOLO LECTURA): servicios de SEPTIEMBRE 2026 y CUÁNDO se crearon.
// Sirve para ubicar el corte entre lo "migrado" (creado antes de subir el VPS) y
// lo que Paula agregó después. No escribe nada.
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/sep-corte-diagnostico.mjs
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
  const gte = new Date('2026-09-01T00:00:00.000Z');
  const lt = new Date('2026-10-01T00:00:00.000Z');
  const servs = await prisma.servicio.findMany({
    where: { fecha: { gte, lt } },
    select: { creadoEn: true, esHistorico: true, plaza: true },
    orderBy: { creadoEn: 'asc' },
  });
  console.log(`\nServicios con fecha en septiembre 2026: ${servs.length}`);
  if (servs.length === 0) return;
  console.log(`Primer creadoEn: ${servs[0].creadoEn.toISOString()}`);
  console.log(`Último creadoEn:  ${servs[servs.length - 1].creadoEn.toISOString()}`);
  console.log(`esHistorico=true: ${servs.filter((s) => s.esHistorico).length}`);

  // Histograma por FECHA de creación (para ver el clúster de la migración).
  const porDiaCreacion = {};
  for (const s of servs) {
    const k = s.creadoEn.toISOString().slice(0, 10);
    porDiaCreacion[k] = (porDiaCreacion[k] || 0) + 1;
  }
  console.log('\n--- Servicios de sep por DÍA en que se CREARON (creadoEn) ---');
  for (const k of Object.keys(porDiaCreacion).sort()) {
    console.log(`  ${k}: ${porDiaCreacion[k]}`);
  }
  console.log('\n(Un día con muchos = probablemente la carga/migración; los días sueltos posteriores = altas de Paula.)\n');
}

main()
  .catch((e) => { console.error('\nERROR:', e.message, '\n'); process.exit(1); })
  .finally(() => prisma.$disconnect());
