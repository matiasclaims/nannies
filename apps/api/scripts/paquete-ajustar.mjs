// Ajusta el SALDO/ESTADO de un paquete (para alinear con la base de Paula, sin
// cargar sesiones). Puede fijar horasConsumidas, horasTotales y/o estado.
// Si no se pasa --estado, se deriva: consumidas>=totales -> CONSUMIDO; si no, se
// conserva el estado actual (salvo que fuera CONSUMIDO y ya haya saldo -> ACTIVO).
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/paquete-ajustar.mjs <folio> --consumidas 50            (dry-run)
//   node scripts/paquete-ajustar.mjs <folio> --consumidas 50 --apply
//   node scripts/paquete-ajustar.mjs <folio> --totales 40 --consumidas 40 --estado CONSUMIDO --apply
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
const val = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const ESTADOS = ['ACTIVO', 'EN_ESPERA', 'CONSUMIDO', 'CANCELADO'];
if (!Number.isFinite(folio)) { console.error('\nUso: node scripts/paquete-ajustar.mjs <folio> [--consumidas N] [--totales N] [--estado E] [--apply]\n'); process.exit(1); }
const nuevaConsumidas = val('--consumidas') != null ? Number(val('--consumidas')) : undefined;
const nuevaTotales = val('--totales') != null ? Number(val('--totales')) : undefined;
let nuevoEstado = val('--estado');
if (nuevoEstado && !ESTADOS.includes(nuevoEstado)) { console.error(`\nEstado invalido. Usa uno de: ${ESTADOS.join(', ')}\n`); process.exit(1); }

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const p = await prisma.paquete.findUnique({
  where: { folio },
  select: { id: true, folio: true, estado: true, horasTotales: true, horasConsumidas: true, familia: { select: { nombreContacto: true, apellido: true } } },
});
if (!p) { console.error(`\nNo existe el paquete #${folio}.\n`); await prisma.$disconnect(); process.exit(1); }

const totales = nuevaTotales ?? p.horasTotales;
const consumidas = nuevaConsumidas ?? p.horasConsumidas;
if (!nuevoEstado) {
  if (consumidas >= totales) nuevoEstado = 'CONSUMIDO';
  else if (p.estado === 'CONSUMIDO') nuevoEstado = 'ACTIVO';
  else nuevoEstado = p.estado;
}

const fam = [p.familia.nombreContacto, p.familia.apellido].filter(Boolean).join(' ');
console.log(`\nPaquete #${p.folio} — ${fam}`);
console.log(`  ANTES:   ${p.horasConsumidas}/${p.horasTotales} h   estado=${p.estado}`);
console.log(`  DESPUES: ${consumidas}/${totales} h   estado=${nuevoEstado}`);
const cambia = consumidas !== p.horasConsumidas || totales !== p.horasTotales || nuevoEstado !== p.estado;
if (!cambia) { console.log('\n  (Sin cambios.)\n'); await prisma.$disconnect(); process.exit(0); }

if (!APLICAR) {
  console.log('\n(DRY-RUN. Nada se cambió. Corre con --apply para aplicar.)\n');
} else {
  await prisma.paquete.update({ where: { id: p.id }, data: { horasConsumidas: consumidas, horasTotales: totales, estado: nuevoEstado } });
  console.log('\n✔ Ajuste aplicado.\n');
}
await prisma.$disconnect();
