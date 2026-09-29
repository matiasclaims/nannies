// Visor de UN paquete por folio (o índice de operativos si no se da folio).
// SOLO LECTURA. Para depurar paquetes uno por uno contra la base de Paula.
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/paquete-ver.mjs           -> índice de paquetes operativos (folios)
//   node scripts/paquete-ver.mjs 385       -> detalle completo del paquete #385
//
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const arg = process.argv[2];

// Sin folio: índice de paquetes operativos (contratados desde ago-2026 o vivos).
if (!arg) {
  const CORTE = new Date('2026-08-01T00:00:00.000Z');
  const paqs = await prisma.paquete.findMany({
    where: { OR: [{ fechaContratacion: { gte: CORTE } }, { estado: { in: ['ACTIVO', 'EN_ESPERA'] } }] },
    orderBy: [{ folio: 'asc' }],
    select: {
      folio: true, estado: true, horasTotales: true, horasConsumidas: true, fechaContratacion: true,
      familia: { select: { nombreContacto: true, apellido: true } },
    },
  });
  console.log(`\nÍndice de paquetes operativos (${paqs.length}):\n`);
  console.log('  Folio  Estado      Horas    Contratado   Familia');
  for (const p of paqs) {
    const fam = [p.familia.nombreContacto, p.familia.apellido].filter(Boolean).join(' ');
    console.log(
      `  ${String(p.folio).padStart(4)}  ${p.estado.padEnd(10)}  ${String(p.horasConsumidas + '/' + p.horasTotales).padStart(6)}  ${p.fechaContratacion.toISOString().slice(0, 10)}   ${fam}`,
    );
  }
  console.log('\n(Para ver uno: node scripts/paquete-ver.mjs <folio>)\n');
  await prisma.$disconnect();
  process.exit(0);
}

const folio = Number(arg);
if (!Number.isFinite(folio)) { console.error('\nFolio inválido.\n'); process.exit(1); }
const p = await prisma.paquete.findUnique({
  where: { folio },
  select: {
    folio: true, estado: true, horasTotales: true, horasConsumidas: true, precioTotal: true,
    fechaContratacion: true, asignacionManual: true,
    familia: { select: { nombreContacto: true, apellido: true, plaza: true, telefono: true } },
    servicios: {
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
      select: {
        fecha: true, horaInicio: true, horaFin: true, duracionHoras: true, tipoServicio: true,
        estado: true, esDesborde: true, nannie: { select: { nombre: true } },
        finanza: { select: { cobroFamilia: true, pagoNannie: true } },
      },
    },
  },
});
if (!p) { console.error(`\nNo existe el paquete #${folio}.\n`); await prisma.$disconnect(); process.exit(1); }

const fam = [p.familia.nombreContacto, p.familia.apellido].filter(Boolean).join(' ');
const rest = p.horasTotales - p.horasConsumidas;
console.log(`\n═════ Paquete #${p.folio} ═════`);
console.log(`  Familia:      ${fam}  (${p.familia.plaza})`);
console.log(`  Estado:       ${p.estado}${p.asignacionManual ? '  · asignación manual' : ''}`);
console.log(`  Horas:        ${p.horasConsumidas}/${p.horasTotales}  (restan ${rest})`);
console.log(`  Precio total: $${Number(p.precioTotal).toFixed(2)}`);
console.log(`  Contratado:   ${p.fechaContratacion.toISOString().slice(0, 10)}`);
console.log(`  Sesiones:     ${p.servicios.length}`);
if (p.servicios.length) {
  console.log('\n  #  Fecha        Horario      Dur  Estado      Nannie              Cobro     Desb');
  p.servicios.forEach((s, i) => {
    console.log(
      `  ${String(i + 1).padStart(2)}  ${s.fecha.toISOString().slice(0, 10)}  ${s.horaInicio}-${s.horaFin}  ${String(s.duracionHoras).padStart(3)}  ${s.estado.padEnd(10)}  ${(s.nannie?.nombre ?? '(sin nannie)').padEnd(18)}  ${s.finanza?.cobroFamilia != null ? ('$' + Number(s.finanza.cobroFamilia).toFixed(2)).padStart(8) : '       -'}  ${s.esDesborde ? 'Sí' : ''}`,
    );
  });
  // Suma de horas de sesiones vivas, para cotejar contra horasConsumidas.
  const vivas = p.servicios.filter((s) => s.estado !== 'CANCELADO' && s.estado !== 'RECHAZADO');
  const hVivas = vivas.reduce((a, s) => a + s.duracionHoras, 0);
  console.log(`\n  Horas en sesiones vivas: ${hVivas}  ·  horasConsumidas del paquete: ${p.horasConsumidas}` + (hVivas !== p.horasConsumidas ? '  ⚠ NO COINCIDEN' : '  ✓'));
}
console.log('');
await prisma.$disconnect();
