// Servicios CONTRATADOS en septiembre (creadoEn en sep-2026) pero con FECHA de
// servicio POSTERIOR (>= 1-oct-2026). No salieron en el reporte de conciliación
// porque ese filtra por fecha del servicio. SOLO LECTURA; escribe un CSV.
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/sep-contratados-futuros.mjs
//
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
let pagoDeServicio;
try { const mod = await import(new URL('../dist/modules/finanzas/pago-servicio.js', import.meta.url)); pagoDeServicio = mod.pagoDeServicio ?? mod.default?.pagoDeServicio; } catch {}

const red2 = (n) => Math.round(n * 100) / 100;
const sn = (b) => (b == null ? '' : b ? 'Sí' : 'No');
const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

async function main() {
  if (!pagoDeServicio) { console.error('\nERROR: falta el motor de pago (dist). Corre el deploy y reintenta.\n'); process.exit(1); }
  const servicios = await prisma.servicio.findMany({
    where: {
      creadoEn: { gte: new Date('2026-09-01T00:00:00Z'), lt: new Date('2026-10-01T00:00:00Z') },
      fecha: { gte: new Date('2026-10-01T00:00:00Z') },
    },
    include: {
      familia: { select: { nombreContacto: true } },
      nannie: { select: { nombre: true, nivelTarifaMesActual: true } },
      paquete: { select: { horasTotales: true, horasConsumidas: true, asignacionManual: true } },
      finanza: { select: { cobroFamilia: true, comision: true, descuentoNannie: true, pagoNannie: true } },
    },
    orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
  });

  const headers = ['Fecha servicio', 'Creado en', 'Tipo', 'Formato', 'Familia', 'Nannie', 'Plaza', 'Zona', 'Dirección específica', 'Horas', 'Estado', 'Paq. horas totales', 'Paq. consumidas', 'Paq. restantes', 'Paq. manual', 'Cobro', 'Pago', 'Margen', 'Comisión'];
  const filas = [];
  let tCobro = 0, tPago = 0, tMargen = 0, tHoras = 0;
  for (const s of servicios) {
    const cobro = s.finanza ? Number(s.finanza.cobroFamilia) : 0;
    const desc = s.finanza?.descuentoNannie ? Number(s.finanza.descuentoNannie) : 0;
    const bruto = s.finanza?.pagoNannie != null ? Number(s.finanza.pagoNannie)
      : s.esHistorico ? null
      : s.nannie ? pagoDeServicio(s.tipoServicio, s.duracionHoras, s.formato, s.nannie.nivelTarifaMesActual, { paqueteHoras: s.paquete?.horasTotales, ludotecaMontaje: s.ludotecaMontaje, plaza: s.plaza, zona: s.zona }).monto : null;
    const pago = bruto == null ? null : red2(bruto - desc);
    const margen = pago == null ? null : red2(cobro - pago);
    tCobro += cobro; tPago += pago ?? 0; tMargen += margen ?? 0; tHoras += s.duracionHoras;
    filas.push([
      s.fecha.toISOString().slice(0, 10), s.creadoEn.toISOString().slice(0, 16).replace('T', ' '),
      s.tipoServicio, s.formato === 'PAQUETE' ? 'Paquete' : 'Individual',
      s.familia?.nombreContacto ?? '—', s.nannie?.nombre ?? 'Por asignar',
      s.plaza === 'QUERETARO' ? 'Querétaro' : 'Toluca', s.zona, s.direccion ?? '',
      s.duracionHoras, s.estado,
      s.paquete?.horasTotales ?? '', s.paquete?.horasConsumidas ?? '', s.paquete ? s.paquete.horasTotales - s.paquete.horasConsumidas : '', sn(s.paquete?.asignacionManual ?? null),
      cobro, pago ?? '', margen ?? '', s.finanza?.comision ? Number(s.finanza.comision) : 0,
    ]);
  }
  const archivo = 'sep-contratados-futuros.csv';
  writeFileSync(archivo, '﻿' + [headers, ...filas].map((r) => r.map(esc).join(',')).join('\r\n'), 'utf8');
  console.log(`\nContratados en septiembre con fecha ≥ octubre: ${servicios.length}`);
  console.log(`  Horas ${tHoras} | Cobro ${red2(tCobro)} | Pago ${red2(tPago)} | Margen ${red2(tMargen)}`);
  console.log(`Archivo: ${process.cwd()}/${archivo}\n`);
}
main().catch((e) => { console.error('\nERROR:', e.message, '\n'); process.exit(1); }).finally(() => prisma.$disconnect());
