// Reporte de PAQUETES con el DESGLOSE de sus sesiones (una fila por sesión, con
// los datos del paquete repetidos). SOLO LECTURA → CSV (se abre en Excel). Mismo
// alcance operativo que paquetes-reporte-export: paquetes con horas vivas
// (ACTIVO/EN_ESPERA) + contratados desde el corte (por defecto 2026-08-01). Un
// paquete sin sesiones sale con una fila marcada, para no perderlo en el cruce.
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/paquetes-detalle-export.mjs [corte]
//   ej: node scripts/paquetes-detalle-export.mjs 2026-08-01
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

const origenDe = (id) =>
  id.startsWith('hp-') ? 'Migrado (import)' : id.startsWith('pkgv-') ? 'Carga vivos sep' : 'App (nuevo)';

const paqs = await prisma.paquete.findMany({
  where: { OR: [{ fechaContratacion: { gte: CORTE } }, { estado: { in: ['ACTIVO', 'EN_ESPERA'] } }] },
  orderBy: [{ fechaContratacion: 'asc' }, { folio: 'asc' }],
  select: {
    id: true, folio: true, estado: true, fechaContratacion: true,
    horasTotales: true, horasConsumidas: true, precioTotal: true,
    familia: { select: { nombreContacto: true, apellido: true, plaza: true } },
    servicios: {
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
      select: {
        fecha: true, horaInicio: true, horaFin: true, duracionHoras: true,
        tipoServicio: true, estado: true, esDesborde: true,
        nannie: { select: { nombre: true } },
        finanza: { select: { cobroFamilia: true } },
      },
    },
  },
});

const esc = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const COLS = [
  'Folio', 'Familia', 'Plaza', 'Fecha contratacion', 'Estado paquete',
  'Horas totales', 'Horas consumidas', 'Horas restantes', 'Origen',
  'N sesion', 'Sesion fecha', 'Hora inicio', 'Hora fin', 'Duracion h',
  'Tipo', 'Nannie', 'Estado sesion', 'Cobro familia', 'Es desborde',
];
const filas = [COLS.join(',')];
let nSesiones = 0;
for (const q of paqs) {
  const rest = q.horasTotales - q.horasConsumidas;
  const fam = [q.familia.nombreContacto, q.familia.apellido].filter(Boolean).join(' ');
  const cab = [
    q.folio, esc(fam), q.familia.plaza, q.fechaContratacion.toISOString().slice(0, 10),
    q.estado, q.horasTotales, q.horasConsumidas, rest, origenDe(q.id),
  ];
  if (q.servicios.length === 0) {
    filas.push([...cab, '', '— sin sesiones —', '', '', '', '', '', '', '', ''].join(','));
    continue;
  }
  q.servicios.forEach((s, i) => {
    nSesiones++;
    filas.push([
      ...cab,
      i + 1,
      s.fecha.toISOString().slice(0, 10), s.horaInicio, s.horaFin, s.duracionHoras,
      s.tipoServicio, esc(s.nannie?.nombre ?? ''), s.estado,
      s.finanza?.cobroFamilia != null ? Number(s.finanza.cobroFamilia).toFixed(2) : '',
      s.esDesborde ? 'Si' : 'No',
    ].join(','));
  });
}

const salida = `paquetes-detalle.csv`;
writeFileSync(salida, '﻿' + filas.join('\n'), 'utf8');
console.log(`\nDesglose de paquetes operativos (corte >= ${CORTE.toISOString().slice(0, 10)} o con horas vivas)`);
console.log(`  Paquetes: ${paqs.length} · sesiones desglosadas: ${nSesiones}`);
console.log(`\n✔ Archivo: ${salida}\n`);
await prisma.$disconnect();
