// Reconciliación: consume la disponibilidad DISPONIBLE que aún se traslapa con
// servicios ya comprometidos (ACEPTADO/COMPLETADO). Sirve para limpiar los
// bloques que quedaron colgando de asignaciones directas previas al fix (antes,
// asignar directo no consumía la disponibilidad). Mismo criterio que el runtime:
// el bloque se parte y cada sobrante sobrevive solo si mide 3 h o más.
//
// Uso:
//   node scripts/consumir-disponibilidad-asignados.mjs           (dry-run)
//   node scripts/consumir-disponibilidad-asignados.mjs --apply
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}
const APLICAR = process.argv.includes('--apply');
const MIN = 180; // 3 h en minutos
const aMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

// Servicios comprometidos con nannie (los que "ocupan" disponibilidad).
const servicios = await prisma.servicio.findMany({
  where: { nannieId: { not: null }, estado: { in: ['ACEPTADO', 'COMPLETADO'] } },
  select: { id: true, nannieId: true, fecha: true, horaInicio: true, horaFin: true },
});

let traslapes = 0, eliminados = 0, creados = 0;
const ops = [];
// Se procesa por (nannie, fecha) leyendo la disponibilidad DISPONIBLE una vez.
for (const s of servicios) {
  const bloques = await prisma.disponibilidad.findMany({
    where: { nannieId: s.nannieId, fecha: s.fecha, estado: 'DISPONIBLE' },
  });
  for (const b of bloques) {
    const traslapa = b.horaInicio < s.horaFin && s.horaInicio < b.horaFin;
    if (!traslapa) continue;
    traslapes++;
    eliminados++;
    ops.push(prisma.disponibilidad.delete({ where: { id: b.id } }));
    if (s.horaInicio > b.horaInicio && aMin(s.horaInicio) - aMin(b.horaInicio) >= MIN) {
      creados++;
      ops.push(prisma.disponibilidad.create({ data: { nannieId: s.nannieId, fecha: s.fecha, horaInicio: b.horaInicio, horaFin: s.horaInicio, estado: 'DISPONIBLE' } }));
    }
    if (s.horaFin < b.horaFin && aMin(b.horaFin) - aMin(s.horaFin) >= MIN) {
      creados++;
      ops.push(prisma.disponibilidad.create({ data: { nannieId: s.nannieId, fecha: s.fecha, horaInicio: s.horaFin, horaFin: b.horaFin, estado: 'DISPONIBLE' } }));
    }
  }
}

console.log(`\nServicios comprometidos revisados: ${servicios.length}`);
console.log(`  · bloques DISPONIBLE traslapados: ${traslapes}`);
console.log(`  · bloques a eliminar:             ${eliminados}`);
console.log(`  · sobrantes >=3h a recrear:       ${creados}\n`);

if (!APLICAR) {
  console.log('(DRY-RUN. Nada se modificó. Corre con --apply para reconciliar.)\n');
} else if (ops.length) {
  await prisma.$transaction(ops);
  console.log(`✔ Reconciliado: ${eliminados} bloques eliminados, ${creados} sobrantes recreados.\n`);
} else {
  console.log('Nada que reconciliar.\n');
}
await prisma.$disconnect();
