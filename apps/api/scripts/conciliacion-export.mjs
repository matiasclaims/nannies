// Exporta la CONCILIACIÓN de un mes a CSV (se abre directo en Excel). SOLO LECTURA.
// Marca cada servicio como "Migrado" (creado <= corte, ya estaba al subir el VPS)
// o "Nuevo" (agregado después), con datos operativos, de paquete, financieros y
// de seguimiento. Las incidencias del mes van en un CSV aparte. No escribe en la BD.
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/conciliacion-export.mjs [corte] [desde] [hasta]
//   ej: node scripts/conciliacion-export.mjs 2026-09-19 2026-09-01 2026-09-30
// (por defecto: corte 2026-09-19, periodo septiembre 2026)
//
import { readFileSync, existsSync, writeFileSync } from 'node:fs';

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

const corte = process.argv[2] || '2026-09-19';
const desde = process.argv[3] || '2026-09-01';
const hasta = process.argv[4] || '2026-09-30';

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

// Motor de pago (compilado). Requiere que el API esté construido (deploy/nest build).
let pagoDeServicio;
try {
  const mod = await import(new URL('../dist/modules/finanzas/pago-servicio.js', import.meta.url));
  pagoDeServicio = mod.pagoDeServicio ?? mod.default?.pagoDeServicio;
} catch {
  /* se maneja abajo */
}
let reglaPorNumero = () => null;
try {
  const mod = await import(new URL('../dist/modules/nannies/incidencias.catalogo.js', import.meta.url));
  reglaPorNumero = mod.reglaPorNumero ?? mod.default?.reglaPorNumero ?? reglaPorNumero;
} catch {
  /* opcional */
}

const red2 = (n) => Math.round(n * 100) / 100;
const sn = (b) => (b == null ? '' : b ? 'Sí' : 'No');
const csvEsc = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const escribirCSV = (nombre, headers, filas) => {
  const csv = [headers, ...filas].map((r) => r.map(csvEsc).join(',')).join('\r\n');
  writeFileSync(nombre, '﻿' + csv, 'utf8');
};

async function main() {
  if (!pagoDeServicio) {
    console.error('\nERROR: no se encontró el motor de pago en dist. Corre el deploy (nest build) y reintenta.\n');
    process.exit(1);
  }
  const gte = new Date(`${desde}T00:00:00.000Z`);
  const lt = new Date(new Date(`${hasta}T00:00:00.000Z`).getTime() + 86_400_000);
  const corteDt = new Date(`${corte}T23:59:59.999Z`);

  const servicios = await prisma.servicio.findMany({
    where: { fecha: { gte, lt } },
    include: {
      familia: { select: { nombreContacto: true } },
      nannie: { select: { nombre: true, nivelTarifaMesActual: true } },
      paquete: { select: { horasTotales: true, horasConsumidas: true, asignacionManual: true } },
      finanza: { select: { cobroFamilia: true, comision: true, descuentoNannie: true, pagoNannie: true } },
      reporte: { select: { id: true } },
      evaluacion: { select: { calificacion: true, respondidoEn: true, volveriaContratar: true } },
      evaluacionCoord: { select: { calificacion: true } },
    },
    orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
  });

  const filas = servicios.map((s) => {
    const cobro = s.finanza ? Number(s.finanza.cobroFamilia) : 0;
    const desc = s.finanza?.descuentoNannie ? Number(s.finanza.descuentoNannie) : 0;
    const comision = s.finanza?.comision ? Number(s.finanza.comision) : 0;
    const bruto = s.esHistorico
      ? s.finanza?.pagoNannie != null
        ? Number(s.finanza.pagoNannie)
        : null
      : s.nannie
        ? pagoDeServicio(s.tipoServicio, s.duracionHoras, s.formato, s.nannie.nivelTarifaMesActual, {
            paqueteHoras: s.paquete?.horasTotales,
            ludotecaMontaje: s.ludotecaMontaje,
            plaza: s.plaza,
            zona: s.zona,
          }).monto
        : null;
    const pago = bruto == null ? null : red2(bruto - desc);
    const margen = pago == null ? null : red2(cobro - pago);
    return {
      origen: s.creadoEn <= corteDt ? 'Migrado' : 'Nuevo',
      _o: s.creadoEn <= corteDt ? 'M' : 'N',
      duracionHoras: s.duracionHoras,
      cobro,
      pago,
      margen,
      row: [
        s.creadoEn <= corteDt ? 'Migrado' : 'Nuevo',
        s.fecha.toISOString().slice(0, 10),
        s.tipoServicio,
        s.formato === 'PAQUETE' ? 'Paquete' : 'Individual',
        s.familia?.nombreContacto ?? '—',
        s.nannie?.nombre ?? 'Por asignar',
        s.plaza === 'QUERETARO' ? 'Querétaro' : 'Toluca',
        s.zona,
        s.direccion ?? '',
        s.duracionHoras,
        s.estado,
        s.paquete?.horasTotales ?? '',
        s.paquete?.horasConsumidas ?? '',
        s.paquete ? s.paquete.horasTotales - s.paquete.horasConsumidas : '',
        sn(s.paquete?.asignacionManual ?? null),
        s.motivoCancelacion ?? '',
        sn(s.canceladaCobrada),
        sn(!!s.reporte),
        s.evaluacion?.respondidoEn ? s.evaluacion.calificacion : '',
        s.evaluacion?.respondidoEn ? sn(s.evaluacion.volveriaContratar) : '',
        s.evaluacionCoord ? Number(s.evaluacionCoord.calificacion) : '',
        cobro,
        pago ?? '',
        margen ?? '',
        comision,
        s.creadoEn.toISOString().slice(0, 16).replace('T', ' '),
      ],
    };
  });

  const headers = [
    'Origen', 'Fecha', 'Tipo', 'Formato', 'Familia', 'Nannie', 'Plaza', 'Zona', 'Dirección específica',
    'Horas', 'Estado', 'Paq. horas totales', 'Paq. consumidas', 'Paq. restantes', 'Paq. manual',
    'Motivo cancelación', '¿Cobrada?', '¿Reporte?', 'Calif. papás', '¿Volvería?', 'Calif. coord.',
    'Cobro', 'Pago', 'Margen', 'Comisión', 'Creado en',
  ];
  const archivoServ = `conciliacion-servicios-${desde}_a_${hasta}.csv`;
  escribirCSV(archivoServ, headers, filas.map((f) => f.row));

  // Incidencias del mes (por nannie).
  const incid = await prisma.incidencia.findMany({
    where: { fecha: { gte, lt } },
    include: { nannie: { select: { nombre: true } } },
    orderBy: { fecha: 'asc' },
  });
  const archivoInc = `conciliacion-incidencias-${desde}_a_${hasta}.csv`;
  escribirCSV(
    archivoInc,
    ['Fecha', 'Nannie', 'Regla', 'Situación', 'Estado', 'Registró', 'Nota'],
    incid.map((i) => [
      i.fecha.toISOString().slice(0, 10),
      i.nannie.nombre,
      i.regla,
      reglaPorNumero(i.regla)?.situacion ?? '',
      i.estado,
      i.registradaPor,
      i.nota ?? '',
    ]),
  );

  const resumen = (o) => {
    const f = filas.filter((x) => x._o === o);
    return {
      serv: f.length,
      horas: f.reduce((a, x) => a + x.duracionHoras, 0),
      cobro: red2(f.reduce((a, x) => a + x.cobro, 0)),
      pago: red2(f.reduce((a, x) => a + (x.pago ?? 0), 0)),
      margen: red2(f.reduce((a, x) => a + (x.margen ?? 0), 0)),
    };
  };
  const m = resumen('M');
  const n = resumen('N');
  console.log(`\nConciliación ${desde} a ${hasta} · corte ${corte}`);
  console.log('='.repeat(60));
  console.log(`Migrado (creado <= corte): ${m.serv} serv | ${m.horas} h | cobro ${m.cobro} | pago ${m.pago} | margen ${m.margen}`);
  console.log(`Nuevo (después):           ${n.serv} serv | ${n.horas} h | cobro ${n.cobro} | pago ${n.pago} | margen ${n.margen}`);
  console.log(`Incidencias del mes: ${incid.length}`);
  console.log(`\nArchivos escritos en ${process.cwd()}:`);
  console.log(`  ${archivoServ}`);
  console.log(`  ${archivoInc}`);
  console.log('\nDescárgalos (o súbelos al chat) y te los dejo en un Excel formateado.\n');
}

main()
  .catch((e) => { console.error('\nERROR:', e.message, '\n'); process.exit(1); })
  .finally(() => prisma.$disconnect());
