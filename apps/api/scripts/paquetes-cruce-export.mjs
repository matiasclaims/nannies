// Reporte de cruce PAQUETES para cerrar septiembre y dejar listo octubre. SOLO
// LECTURA → CSV. Clasifica cada paquete y marca qué queda VIVO para octubre.
// Columnas de horas usadas por mes (de sesiones vivas) para ver la actividad.
//
// Alcance: paquetes contratados desde el corte (por defecto 2026-08-01) o con
// horas vivas (ACTIVO/EN_ESPERA). Excluye el histórico viejo.
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/paquetes-cruce-export.mjs [corte]
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
    horasTotales: true, horasConsumidas: true,
    familia: { select: { nombreContacto: true, apellido: true, plaza: true } },
    servicios: {
      select: { fecha: true, duracionHoras: true, estado: true, nannie: { select: { nombre: true } } },
    },
  },
});

const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const COLS = [
  'Folio', 'Familia', 'Plaza', 'Fecha contratacion', 'Mes contratacion', 'Estado', 'Origen',
  'Horas totales', 'Horas consumidas', 'Horas restantes', 'Vive octubre', 'Clasificacion',
  'Horas sesiones ago', 'Horas sesiones sep', 'Horas sesiones oct+', 'Nannies',
];
const filas = [COLS.join(',')];
const resumen = {};
let vivasOct = 0;
for (const q of paqs) {
  const rest = q.horasTotales - q.horasConsumidas;
  const mesC = q.fechaContratacion.toISOString().slice(0, 7);
  const vivos = q.servicios.filter((s) => !CERRADOS.includes(s.estado));
  const hMes = (ym) => vivos.filter((s) => s.fecha.toISOString().slice(0, 7) === ym).reduce((a, s) => a + s.duracionHoras, 0);
  const hAgo = hMes('2026-08');
  const hSep = hMes('2026-09');
  const hOct = vivos.filter((s) => s.fecha >= new Date('2026-10-01T00:00:00Z')).reduce((a, s) => a + s.duracionHoras, 0);
  const nannies = [...new Set(vivos.map((s) => s.nannie?.nombre).filter(Boolean))].join(' | ');
  const fam = [q.familia.nombreContacto, q.familia.apellido].filter(Boolean).join(' ');
  const vive = rest > 0;
  let clasif;
  if (mesC === '2026-09') clasif = vive ? 'Nuevo sep · vive oct' : 'Nuevo sep · cerrado';
  else if (mesC < '2026-09') clasif = vive ? 'Carry pre-sep · vive oct' : 'Cerrado pre-sep';
  else clasif = vive ? 'Post-sep · vive oct' : 'Post-sep · cerrado';
  if (vive) vivasOct += rest;
  resumen[clasif] = (resumen[clasif] || 0) + 1;
  filas.push([
    q.folio, esc(fam), q.familia.plaza, q.fechaContratacion.toISOString().slice(0, 10), mesC, q.estado, origenDe(q.id),
    q.horasTotales, q.horasConsumidas, rest, vive ? 'Si' : 'No', clasif, hAgo, hSep, hOct, esc(nannies),
  ].join(','));
}

const salida = `paquetes-cruce.csv`;
writeFileSync(salida, '﻿' + filas.join('\n'), 'utf8');
console.log(`\nCruce de paquetes (corte >= ${CORTE.toISOString().slice(0, 10)} o con horas vivas)`);
console.log(`  Total: ${paqs.length}`);
for (const [k, v] of Object.entries(resumen).sort()) console.log(`    ${k}: ${v}`);
console.log(`  Horas vivas que pasan a octubre: ${vivasOct} h`);
console.log(`\n✔ Archivo: ${salida}\n`);
await prisma.$disconnect();
