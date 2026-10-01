// Cierre operativo de un mes (por defecto sep-2026). SOLO afecta ese mes.
//   1) Servicios SIN nannie del mes -> se BORRAN (con sus registros ligados).
//   2) Servicios OFERTADO/ACEPTADO con nannie -> COMPLETADO (completadoEn=fecha)
//      y suma al contador de rango (individual +1; paquete +1 por nannie en su
//      1a sesion completada de ese paquete).
//   3) Encuestas pendientes de los COMPLETADO del mes -> se marcan "cerradas"
//      (encuestaCerrada) para que dejen de salir pendientes. Las CONTESTADAS no
//      se tocan (no se borra ninguna calificacion/comentario).
//   4) Reportes pendientes de los COMPLETADO del mes -> reporteCerrado. Los que
//      ya tienen reporte no se tocan.
// Nada de esto afecta meses futuros (es por marca, no por regla).
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/cerrar-mes.mjs [YYYY-MM]          (dry-run)
//   node scripts/cerrar-mes.mjs 2026-09 --apply
//
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}
const arg = (process.argv.find((a) => /^\d{4}-\d{2}$/.test(a))) || '2026-09';
const APLICAR = process.argv.includes('--apply');
const [anio, mes] = arg.split('-').map(Number);
const gte = new Date(Date.UTC(anio, mes - 1, 1));
const lt = new Date(Date.UTC(anio, mes, 1));
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

// --- 1) Servicios SIN nannie del mes (a borrar) ---
const sinNannie = await prisma.servicio.findMany({
  where: { fecha: { gte, lt }, nannieId: null },
  select: { id: true, estado: true, fecha: true, familia: { select: { nombreContacto: true } } },
});
const idsBorrar = sinNannie.map((s) => s.id);

// --- 2) Servicios OFERTADO/ACEPTADO con nannie (a completar) ---
const porCompletar = await prisma.servicio.findMany({
  where: { fecha: { gte, lt }, nannieId: { not: null }, estado: { in: ['OFERTADO', 'ACEPTADO'] } },
  select: { id: true, nannieId: true, paqueteId: true, formato: true, fecha: true },
});
// Contador de rango: individuales +1 c/u; paquetes +1 por (paquete, nannie) si la
// nannie no tenia ya una sesion COMPLETADA de ese paquete.
const inc = new Map();
for (const s of porCompletar.filter((x) => !x.paqueteId)) inc.set(s.nannieId, (inc.get(s.nannieId) || 0) + 1);
const paresPaq = [...new Set(porCompletar.filter((x) => x.paqueteId).map((x) => `${x.paqueteId}|${x.nannieId}`))];
const paqIds = [...new Set(porCompletar.map((x) => x.paqueteId).filter(Boolean))];
const yaCompletadas = new Set(
  (await prisma.servicio.findMany({
    where: { paqueteId: { in: paqIds }, estado: 'COMPLETADO' },
    select: { paqueteId: true, nannieId: true },
  })).map((x) => `${x.paqueteId}|${x.nannieId}`),
);
for (const par of paresPaq) {
  if (!yaCompletadas.has(par)) { const nid = par.split('|')[1]; inc.set(nid, (inc.get(nid) || 0) + 1); }
}

// --- 3) y 4): los COMPLETADO del mes que quedaran pendientes de encuesta/reporte ---
// (incluye los que ya estaban COMPLETADO + los que se completaran ahora)
const idsCompletadosMes = [
  ...porCompletar.map((s) => s.id),
  ...(await prisma.servicio.findMany({ where: { fecha: { gte, lt }, estado: 'COMPLETADO' }, select: { id: true } })).map((s) => s.id),
];
const detalle = await prisma.servicio.findMany({
  where: { id: { in: idsCompletadosMes } },
  select: { id: true, encuestaCerrada: true, reporteCerrado: true, reporte: { select: { id: true } }, evaluacion: { select: { respondidoEn: true } } },
});
const cerrarEncuesta = detalle.filter((s) => !s.encuestaCerrada && (!s.evaluacion || s.evaluacion.respondidoEn == null)).map((s) => s.id);
const cerrarReporte = detalle.filter((s) => !s.reporteCerrado && !s.reporte).map((s) => s.id);

console.log(`\nCierre de ${arg}`);
console.log(`  1) Servicios SIN nannie a BORRAR:        ${idsBorrar.length}`);
console.log(`  2) OFERTADO/ACEPTADO a COMPLETAR:        ${porCompletar.length}  (+rango: ${[...inc.values()].reduce((a, b) => a + b, 0)} en ${inc.size} nannies)`);
console.log(`  3) Encuestas pendientes a cerrar:        ${cerrarEncuesta.length}`);
console.log(`  4) Reportes pendientes a cerrar:         ${cerrarReporte.length}`);

if (!APLICAR) { console.log('\n(DRY-RUN. Nada se cambió. Agrega --apply para ejecutar.)\n'); await prisma.$disconnect(); process.exit(0); }

await prisma.$transaction(async (tx) => {
  // 1) borrar sin-nannie
  if (idsBorrar.length) {
    await tx.finanzaServicio.deleteMany({ where: { servicioId: { in: idsBorrar } } });
    await tx.ofertaRespuesta.deleteMany({ where: { servicioId: { in: idsBorrar } } });
    await tx.reporteServicio.deleteMany({ where: { servicioId: { in: idsBorrar } } });
    await tx.evaluacionServicio.deleteMany({ where: { servicioId: { in: idsBorrar } } });
    await tx.evaluacionCoordServicio.deleteMany({ where: { servicioId: { in: idsBorrar } } });
    await tx.servicio.deleteMany({ where: { id: { in: idsBorrar } } });
  }
  // 2) completar (completadoEn = fecha del servicio, para que el egreso caiga en su mes)
  for (const s of porCompletar) {
    await tx.servicio.update({ where: { id: s.id }, data: { estado: 'COMPLETADO', completadoEn: s.fecha } });
  }
  for (const [nid, n] of inc) await tx.nannie.update({ where: { id: nid }, data: { serviciosAcumulados: { increment: n } } });
  // 3) y 4) cerrar pendientes
  if (cerrarEncuesta.length) await tx.servicio.updateMany({ where: { id: { in: cerrarEncuesta } }, data: { encuestaCerrada: true } });
  if (cerrarReporte.length) await tx.servicio.updateMany({ where: { id: { in: cerrarReporte } }, data: { reporteCerrado: true } });
});
console.log(`\n✔ Cierre de ${arg} aplicado.\n`);
await prisma.$disconnect();
