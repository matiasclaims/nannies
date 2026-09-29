// Verificación del PAGO a nannies. SOLO LECTURA → CSV. Replica el motor del
// sistema (dist/modules/finanzas/pago-servicio.js) por cada sesión viva del
// periodo y lo compara con el pago efectivo (override manual si existe). Sirve
// para cruzar con Paula y validar que el sistema paga bien de cara a octubre,
// contemplando el NIVEL-TARIFA y RANGO de cada nannie.
//
// Requiere el API compilado (npm run build) para importar el motor.
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/pagos-nannie-verificacion.mjs [desde] [hasta]
//   ej: node scripts/pagos-nannie-verificacion.mjs 2026-09-01 2026-10-31
//   (por defecto: 2026-09-01 a 2026-10-31)
//
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}
const DESDE = new Date(`${process.argv[2] || '2026-09-01'}T00:00:00.000Z`);
const HASTA = new Date(`${process.argv[3] || '2026-10-31'}T23:59:59.999Z`);

let pagoDeServicio;
try {
  const mod = await import(new URL('../dist/modules/finanzas/pago-servicio.js', import.meta.url));
  pagoDeServicio = mod.pagoDeServicio ?? mod.default?.pagoDeServicio;
} catch { /* abajo */ }
if (!pagoDeServicio) {
  console.error('\n✗ No se encontró el motor compilado. Corre `npm run build` en apps/api y reintenta.\n');
  process.exit(1);
}

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const CERRADOS = ['CANCELADO', 'RECHAZADO'];
const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const r2 = (n) => Math.round(n * 100) / 100;

const servicios = await prisma.servicio.findMany({
  where: { fecha: { gte: DESDE, lte: HASTA }, nannieId: { not: null }, estado: { notIn: CERRADOS } },
  orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
  select: {
    fecha: true, horaInicio: true, tipoServicio: true, formato: true, duracionHoras: true,
    plaza: true, zona: true, ludotecaMontaje: true, esHistorico: true, estado: true,
    familia: { select: { nombreContacto: true, apellido: true } },
    paquete: { select: { folio: true, horasTotales: true } },
    nannie: { select: { nombre: true, nivelTarifaMesActual: true, rangoPermanente: true } },
    finanza: { select: { pagoNannie: true } },
  },
});

const COLS = [
  'Fecha', 'Familia', 'Folio paquete', 'Formato', 'Tipo', 'Duracion h', 'Plaza', 'Zona',
  'Nannie', 'Nivel', 'Rango', 'Estado sesion', 'Pago motor', 'Pago override', 'Pago efectivo',
  'Override?', 'Nota',
];
const filas = [COLS.join(',')];
const porNannie = new Map();
let sinCalcular = 0, conOverride = 0, totalEfectivo = 0;
for (const s of servicios) {
  const motor = pagoDeServicio(s.tipoServicio, s.duracionHoras, s.formato, s.nannie.nivelTarifaMesActual, {
    paqueteHoras: s.paquete?.horasTotales,
    ludotecaMontaje: s.ludotecaMontaje,
    plaza: s.plaza,
    zona: s.zona,
  });
  const override = s.finanza?.pagoNannie != null ? Number(s.finanza.pagoNannie) : null;
  const efectivo = override != null ? override : s.esHistorico ? null : motor.monto;
  if (override != null) conOverride++;
  if (efectivo == null) sinCalcular++;
  else totalEfectivo += efectivo;
  const fam = [s.familia.nombreContacto, s.familia.apellido].filter(Boolean).join(' ');
  const nota = efectivo == null ? (motor.motivo || (s.esHistorico ? 'historico sin override' : 'sin pago')) : '';
  filas.push([
    s.fecha.toISOString().slice(0, 10), esc(fam), s.paquete?.folio ?? '', s.formato, s.tipoServicio,
    s.duracionHoras, s.plaza, esc(s.zona), esc(s.nannie.nombre), s.nannie.nivelTarifaMesActual,
    s.nannie.rangoPermanente, s.estado,
    motor.monto != null ? motor.monto.toFixed(2) : '', override != null ? override.toFixed(2) : '',
    efectivo != null ? efectivo.toFixed(2) : '', override != null ? 'Si' : 'No', esc(nota),
  ].join(','));

  const g = porNannie.get(s.nannie.nombre) || { nivel: s.nannie.nivelTarifaMesActual, rango: s.nannie.rangoPermanente, n: 0, monto: 0 };
  g.n++; g.monto += efectivo || 0; porNannie.set(s.nannie.nombre, g);
}

const salida = `pagos-nannie-verificacion.csv`;
writeFileSync(salida, '﻿' + filas.join('\n'), 'utf8');

// Rangos/niveles vigentes de las nannies activas (para confirmarlos para octubre).
const nannies = await prisma.nannie.findMany({
  where: { estado: { in: ['ACTIVA', 'PRUEBA'] } },
  orderBy: { nombre: 'asc' },
  select: { nombre: true, nivelTarifaMesActual: true, rangoPermanente: true, estado: true },
});

console.log(`\nVerificacion de pagos ${DESDE.toISOString().slice(0, 10)} a ${HASTA.toISOString().slice(0, 10)}`);
console.log(`  Sesiones: ${servicios.length} · con override manual: ${conOverride} · sin pago calculable: ${sinCalcular}`);
console.log(`  Suma pago efectivo: $${r2(totalEfectivo).toFixed(2)}`);
console.log(`\n  Pago por nannie (nivel · sesiones · monto):`);
for (const [nom, g] of [...porNannie.entries()].sort()) {
  console.log(`    ${nom.padEnd(22)} ${String(g.nivel).padEnd(10)} ${String(g.n).padStart(3)}  $${r2(g.monto).toFixed(2)}`);
}
console.log(`\n  Rangos/niveles vigentes (activas):`);
for (const n of nannies) console.log(`    ${n.nombre.padEnd(22)} nivel=${n.nivelTarifaMesActual}  rango=${n.rangoPermanente}  (${n.estado})`);
console.log(`\n✔ Detalle en: ${salida}\n`);
await prisma.$disconnect();
