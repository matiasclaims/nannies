// Alta RETROACTIVA de un paquete que nunca se dio de alta en el sistema pero que
// ya trae sesiones consumidas (y, opcionalmente, alguna PROGRAMADA a futuro).
// Crea el paquete y sus sesiones de un jalon, recalcula el saldo, y deja las
// horas NO consumidas disponibles para asignar. NO toca contadores de nannie
// (serviciosAcumulados) — igual que la reconciliacion; esos servicios ya se
// contaron en el cierre manual de Paula.
//
// Soporta VARIAS nannies (una por sesion) y sesiones PROGRAMADAS (ACEPTADO, por
// ocurrir): las historicas quedan COMPLETADO (completadoEn = su fecha); las
// programadas quedan ACEPTADO (sin completar) pero SI consumen horas del paquete.
//
// Ingreso del paquete: cae en el mes de FECHA_CONTRATACION (el sistema reconoce
// el precio total del paquete en ese mes). El pago a la nannie de cada sesion
// COMPLETADO cae en el mes de su fecha (completadoEn).
//
// Dry-run por defecto. Config embebida abajo (auditable). Uso (VPS, desde
// /var/www/nannies/apps/api):
//   node scripts/crear-paquete-historico.mjs            (dry-run)
//   node scripts/crear-paquete-historico.mjs --apply
//
import { readFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}

// ============================ CONFIG ============================
const FAMILIA_CLAVE = 'Diana Izchel';    // busqueda en nombreContacto (debe ser unica)
const HORAS_TOTALES = 40;
const FECHA_CONTRATACION = '2026-07-03'; // mes en que se reconoce el INGRESO ($3,800).
                                         // Primera sesion / contratacion real (julio).
// [fecha, inicio, fin, nannie, programada?]  (duracion se calcula sola)
//   programada = true -> ACEPTADO (por ocurrir, no completada). Default false -> COMPLETADO.
const SESIONES = [
  ['2026-07-03', '17:00', '18:00', 'Naomi'],            // 1 h
  ['2026-07-07', '15:00', '19:00', 'Laura'],            // 4 h
  ['2026-07-09', '15:00', '19:00', 'Laura'],            // 4 h
  ['2026-07-28', '15:00', '19:00', 'Valeria'],          // 4 h
  ['2026-07-30', '15:00', '19:00', 'Laura'],            // 4 h
  ['2026-08-11', '15:00', '19:00', 'Ivette'],           // 4 h
  ['2026-08-13', '15:00', '19:00', 'Laura'],            // 4 h
  ['2026-08-21', '14:00', '18:00', 'Laura'],            // 4 h
  ['2026-09-10', '15:00', '19:00', 'Laura'],            // 4 h
  ['2026-10-29', '14:30', '18:30', 'Laura', true],      // 4 h — PROGRAMADA (mañana)
];
// ===============================================================

// Tabulador de paquetes Toluca (precioTotal por tramo)
const TARIFA = { 10: 1550, 20: 2850, 30: 3750, 40: 3800, 50: 4100 };
const r2 = (n) => Math.round(n * 100) / 100;
const durDe = (ini, fin) => { const a = ini.split(':').map(Number), b = fin.split(':').map(Number); let d = (b[0] * 60 + b[1]) - (a[0] * 60 + a[1]); if (d <= 0) d += 24 * 60; return d / 60; };
const token = () => randomBytes(18).toString('base64url');

const APLICAR = process.argv.includes('--apply');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

// --- 1) Resolver familia (unica) ---
const fams = await prisma.familia.findMany({
  where: { nombreContacto: { contains: FAMILIA_CLAVE, mode: 'insensitive' } },
  select: {
    id: true, nombreContacto: true, apellido: true, plaza: true, zona: true,
    paquetes: { select: { folio: true, horasTotales: true, horasConsumidas: true, estado: true }, orderBy: { folio: 'asc' } },
  },
});
if (fams.length !== 1) {
  console.error(`\n✗ "${FAMILIA_CLAVE}" ${fams.length === 0 ? 'no coincide con ninguna familia' : 'coincide con varias:\n   ' + fams.map((f) => [f.nombreContacto, f.apellido].filter(Boolean).join(' ')).join('\n   ')}\n`);
  await prisma.$disconnect(); process.exit(1);
}
const fam = fams[0];
const nombreFam = [fam.nombreContacto, fam.apellido].filter(Boolean).join(' ');

// --- 2) Precio por plaza/tramo ---
if (fam.plaza === 'QUERETARO') { console.error('\n✗ La familia es de Querétaro (paquetes 10/20/30 por zona). Este script es para Toluca.\n'); await prisma.$disconnect(); process.exit(1); }
const precioTotal = TARIFA[HORAS_TOTALES];
if (!precioTotal) { console.error(`\n✗ Tramo inválido: ${HORAS_TOTALES} h. Opciones: ${Object.keys(TARIFA).join(', ')}.\n`); await prisma.$disconnect(); process.exit(1); }
const precioHora = precioTotal / HORAS_TOTALES;

// --- 3) Estado del nuevo paquete (misma regla que la app: 1 ACTIVO por familia) ---
const vigentes = fam.paquetes.filter((p) => p.estado === 'ACTIVO' || p.estado === 'EN_ESPERA');
if (vigentes.length >= 3) { console.error('\n✗ La familia ya tiene 3 paquetes vigentes (máximo). Consume alguno antes.\n'); await prisma.$disconnect(); process.exit(1); }
const hayActivo = vigentes.some((p) => p.estado === 'ACTIVO');

// --- 4) Resolver nannies (cada clave distinta debe ser unica) ---
const clavesNannie = [...new Set(SESIONES.map((s) => s[3]))];
const nannieDe = new Map();
for (const clave of clavesNannie) {
  // Se filtra por la plaza de la familia para desambiguar homónimas entre plazas
  // (p. ej. "Laura C (Qro)" vs "Laura M (Tol)").
  const ns = await prisma.nannie.findMany({ where: { nombre: { contains: clave, mode: 'insensitive' }, plaza: fam.plaza }, select: { id: true, nombre: true } });
  if (ns.length !== 1) { console.error(`\n✗ Nannie "${clave}" (${fam.plaza}) ${ns.length === 0 ? 'no coincide' : 'coincide con varias: ' + ns.map((n) => n.nombre).join(', ')}\n`); await prisma.$disconnect(); process.exit(1); }
  nannieDe.set(clave, ns[0]);
}

// --- 5) Sesiones ---
const sesiones = SESIONES.map(([f, ini, fin, clave, programada]) => {
  const dur = durDe(ini, fin);
  return { fecha: f, ini, fin, dur, cobro: r2(precioHora * dur), nannie: nannieDe.get(clave), programada: !!programada };
});
// Tanto COMPLETADO como ACEPTADO consumen horas del paquete (igual que la app).
const consumidas = sesiones.reduce((a, s) => a + s.dur, 0);
const estadoPaq = consumidas >= HORAS_TOTALES ? 'CONSUMIDO' : (hayActivo ? 'EN_ESPERA' : 'ACTIVO');

// --- Reporte ---
console.log(`\nAlta retroactiva de paquete`);
console.log(`  Familia:   ${nombreFam}  (${fam.plaza}${fam.zona ? ' / ' + fam.zona : ''})`);
console.log(`  Paquetes actuales de la familia:`);
if (fam.paquetes.length === 0) console.log('     (ninguno)');
for (const p of fam.paquetes) console.log(`     #${p.folio}  ${p.horasConsumidas}/${p.horasTotales} h  ${p.estado}`);
console.log(`\n  NUEVO paquete:  ${HORAS_TOTALES} h  precioTotal $${precioTotal.toFixed(2)}  ($${precioHora}/h)  contratación ${FECHA_CONTRATACION}`);
console.log(`     estado -> ${estadoPaq}${hayActivo && estadoPaq === 'EN_ESPERA' ? '  ⚠ la familia YA tiene un ACTIVO; éste quedaría EN_ESPERA (no asignable hasta que se agote el activo)' : ''}`);
console.log(`  Sesiones:`);
for (const s of sesiones) console.log(`     ${s.fecha}  ${s.ini}-${s.fin}  ${s.dur}h  ${s.nannie.nombre.padEnd(16)}  ${s.programada ? 'ACEPTADO (por ocurrir)' : 'COMPLETADO'}  cobro $${s.cobro.toFixed(2)}`);
console.log(`  Consumidas: ${consumidas}/${HORAS_TOTALES} h  ->  disponibles para asignar: ${HORAS_TOTALES - consumidas} h`);

if (!APLICAR) { console.log('\n(DRY-RUN. Nada se creó. Agrega --apply para aplicar.)\n'); await prisma.$disconnect(); process.exit(0); }

if (estadoPaq === 'EN_ESPERA') { console.error('\n✗ Quedaría EN_ESPERA (la familia ya tiene un ACTIVO) y NO dejaría horas asignables. Revisa el paquete activo antes de continuar; no se aplicó nada.\n'); await prisma.$disconnect(); process.exit(1); }

await prisma.$transaction(async (tx) => {
  const paq = await tx.paquete.create({
    data: {
      familiaId: fam.id,
      horasTotales: HORAS_TOTALES,
      horasConsumidas: consumidas,
      precioTotal,
      estado: estadoPaq,
      fechaContratacion: new Date(`${FECHA_CONTRATACION}T00:00:00.000Z`),
      tokenPublico: token(),
    },
    select: { id: true, folio: true },
  });
  for (const s of sesiones) {
    const fechaUTC = new Date(`${s.fecha}T00:00:00.000Z`);
    const serv = await tx.servicio.create({
      data: {
        familia: { connect: { id: fam.id } },
        nannie: { connect: { id: s.nannie.id } },
        paquete: { connect: { id: paq.id } },
        formato: 'PAQUETE', tipoServicio: 'DAYCARE', numNinos: 1,
        plaza: fam.plaza, zona: fam.zona ?? '',
        requierePlaneacion: false,
        fecha: fechaUTC, horaInicio: s.ini, horaFin: s.fin, duracionHoras: s.dur,
        estado: s.programada ? 'ACEPTADO' : 'COMPLETADO',
        ...(s.programada ? {} : { completadoEn: fechaUTC }),
      },
      select: { id: true },
    });
    await tx.finanzaServicio.create({ data: { servicioId: serv.id, cobroFamilia: s.cobro } });
  }
  console.log(`\n✔ Creado paquete #${paq.folio} para ${nombreFam}: ${consumidas}/${HORAS_TOTALES} h, ${HORAS_TOTALES - consumidas} h disponibles.\n`);
});
await prisma.$disconnect();
