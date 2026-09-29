// Reporte de PAQUETES para cruzar contra las bases de control de Paula. SOLO
// LECTURA. Exporta a CSV (se abre directo en Excel). Incluye los paquetes
// OPERATIVOS: los que quedaron con horas (ACTIVO/EN_ESPERA, sin importar cuándo
// se contrataron) + los contratados desde el corte (por defecto 2026-08-01, o
// sea agosto en adelante: migración de septiembre y los nuevos de Paula).
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/paquetes-reporte-export.mjs [corte]
//   ej: node scripts/paquetes-reporte-export.mjs 2026-08-01
//
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}
const CORTE = new Date(`${process.argv[2] || '2026-08-01'}T00:00:00.000Z`);
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const CERRADOS = ['CANCELADO', 'RECHAZADO'];
const origenDe = (id) =>
  id.startsWith('hp-') ? 'Migrado (import)' : id.startsWith('pkgv-') ? 'Carga vivos sep' : 'App (nuevo)';

const paqs = await prisma.paquete.findMany({
  where: { OR: [{ fechaContratacion: { gte: CORTE } }, { estado: { in: ['ACTIVO', 'EN_ESPERA'] } }] },
  orderBy: [{ fechaContratacion: 'asc' }, { folio: 'asc' }],
  select: {
    id: true, folio: true, estado: true, fechaContratacion: true,
    horasTotales: true, horasConsumidas: true, precioTotal: true, asignacionManual: true,
    familia: { select: { nombreContacto: true, apellido: true, plaza: true } },
    servicios: { select: { estado: true, nannie: { select: { nombre: true } } } },
  },
});

const esc = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const COLS = [
  'Folio', 'Familia', 'Plaza', 'Fecha contratacion', 'Mes', 'Estado',
  'Horas totales', 'Horas consumidas', 'Horas restantes', 'Con horas remanentes',
  'Precio total', 'Origen', 'Sesiones vivas', 'Nannies', 'Asignacion manual',
];
const filas = [COLS.join(',')];
let totHoras = 0, totRest = 0, totPrecio = 0;
const porEstado = {}, porOrigen = {};
for (const q of paqs) {
  const rest = q.horasTotales - q.horasConsumidas;
  const vivos = q.servicios.filter((s) => !CERRADOS.includes(s.estado));
  const nannies = [...new Set(vivos.map((s) => s.nannie?.nombre).filter(Boolean))].join(' | ');
  const fam = [q.familia.nombreContacto, q.familia.apellido].filter(Boolean).join(' ');
  const origen = origenDe(q.id);
  totHoras += q.horasTotales; totRest += Math.max(0, rest); totPrecio += Number(q.precioTotal);
  porEstado[q.estado] = (porEstado[q.estado] || 0) + 1;
  porOrigen[origen] = (porOrigen[origen] || 0) + 1;
  filas.push([
    q.folio, esc(fam), q.familia.plaza, q.fechaContratacion.toISOString().slice(0, 10),
    q.fechaContratacion.toISOString().slice(0, 7), q.estado,
    q.horasTotales, q.horasConsumidas, rest, rest > 0 ? 'Si' : 'No',
    Number(q.precioTotal).toFixed(2), origen, vivos.length, esc(nannies), q.asignacionManual ? 'Si' : 'No',
  ].join(','));
}

const salida = `paquetes-reporte.csv`;
writeFileSync(salida, '﻿' + filas.join('\n'), 'utf8'); // BOM para acentos en Excel

console.log(`\nReporte de paquetes operativos (corte contratacion >= ${CORTE.toISOString().slice(0, 10)} o con horas vivas)`);
console.log(`  Total paquetes: ${paqs.length}`);
console.log(`  Por estado:  ${JSON.stringify(porEstado)}`);
console.log(`  Por origen:  ${JSON.stringify(porOrigen)}`);
console.log(`  Horas totales: ${totHoras} · horas restantes: ${totRest} · cobro total: $${totPrecio.toFixed(2)}`);
console.log(`\n✔ Archivo: ${salida}\n`);
await prisma.$disconnect();
