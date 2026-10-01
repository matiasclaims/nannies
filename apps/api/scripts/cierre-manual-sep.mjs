// Cierre MANUAL de septiembre 2026 con los números de Paula (no toca servicios).
// Por cada nannie (Toluca): ajusta serviciosAcumulados = actual − (servicios del
// sistema en sep) + (servicios de Paula), recalcula el RANGO, y fija el
// NIVEL-TARIFA de octubre con las HORAS de Paula (regla de 25 h). Registra el
// CierreMes de octubre. Querétaro no lleva nivel/rango (no se incluye).
//
// NO corras el boton normal "Cerrar mes" (ese usa las horas del sistema).
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/cierre-manual-sep.mjs           (dry-run)
//   node scripts/cierre-manual-sep.mjs --apply
//
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}
const APLICAR = process.argv.includes('--apply');
const ANIO_CIERRE = 2026, MES_CIERRE = 10; // el cierre de sep aplica a octubre

// [clave de búsqueda, servicios del sistema (restar), servicios Paula (sumar), horas Paula]
const DATA = [
  ['Ivette', 4, 2, 20],
  ['Aide', 2, 2, 7],
  ['Roxana', 4, 5, 30],
  ['Stephanie', 6, 6, 156],
  ['Vianney', 6, 7, 74],
  ['Mariana C', 6, 8, 43],
  ['Fabiola', 2, 2, 8],
  ['Jackeline', 0, 1, 4],
  ['Karen', 5, 2, 82],
  ['Marlene', 4, 2, 39],
  ['Sofia', 6, 5, 59],
  ['Laura M', 8, 3, 49],
  ['Valeria', 1, 1, 9],
  ['Lisset', 1, 1, 6],
  ['Sherlyn', 1, 1, 4],
  ['Naomi', 0, 1, 5],
];

const rangoPorServicios = (s) => (s >= 130 ? 'SENIOR' : s >= 80 ? 'JUNIOR' : s >= 50 ? 'ROOKIE' : 'BASE');
const nivelPara = (horas, rango) => {
  if (horas < 25) return 'BASE';
  if (rango === 'ROOKIE') return 'ROOKIE';
  if (rango === 'JUNIOR') return 'JUNIOR';
  if (rango === 'SENIOR') return 'SENIOR';
  return 'TARIFA_25HRS';
};

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const filas = [];
let error = false;
for (const [clave, sistServ, paulaServ, paulaHoras] of DATA) {
  const ns = await prisma.nannie.findMany({
    where: { nombre: { contains: clave, mode: 'insensitive' } },
    select: { id: true, nombre: true, plaza: true, serviciosAcumulados: true, rangoPermanente: true, nivelTarifaMesActual: true },
  });
  if (ns.length !== 1) { console.error(`✗ "${clave}" ${ns.length === 0 ? 'no coincide' : 'coincide con varias: ' + ns.map((n) => n.nombre).join(', ')}`); error = true; continue; }
  const n = ns[0];
  const nuevoAcum = Math.max(0, n.serviciosAcumulados - sistServ + paulaServ);
  const rango = rangoPorServicios(nuevoAcum);
  const nivel = nivelPara(paulaHoras, rango);
  filas.push({ n, sistServ, paulaServ, paulaHoras, nuevoAcum, rango, nivel });
}
if (error) { console.error('\nCorrige las coincidencias antes de continuar. Nada se aplicó.\n'); await prisma.$disconnect(); process.exit(1); }

console.log(`\nCierre manual sep-2026 (aplica a nivel de OCTUBRE)\n`);
console.log('  Nannie               Acum: act −sist +paula = nuevo   Rango        Nivel oct   (horas Paula)');
console.log('  ' + '-'.repeat(92));
for (const f of filas) {
  const acumStr = `${String(f.n.serviciosAcumulados).padStart(3)} −${f.sistServ} +${f.paulaServ} = ${String(f.nuevoAcum).padStart(3)}`;
  const rangoStr = f.n.rangoPermanente === f.rango ? f.rango : `${f.n.rangoPermanente}→${f.rango}`;
  const nivelStr = f.n.nivelTarifaMesActual === f.nivel ? f.nivel : `${f.n.nivelTarifaMesActual}→${f.nivel}`;
  console.log(`  ${f.n.nombre.padEnd(20)} ${acumStr.padEnd(24)}  ${rangoStr.padEnd(18)} ${nivelStr.padEnd(22)} (${f.paulaHoras}h)`);
}

if (!APLICAR) { console.log('\n(DRY-RUN. Nada se cambió. Agrega --apply para aplicar.)\n'); await prisma.$disconnect(); process.exit(0); }

await prisma.$transaction(async (tx) => {
  for (const f of filas) {
    await tx.nannie.update({ where: { id: f.n.id }, data: { serviciosAcumulados: f.nuevoAcum, rangoPermanente: f.rango, nivelTarifaMesActual: f.nivel } });
    await tx.cierreMes.upsert({
      where: { nannieId_anio_mes: { nannieId: f.n.id, anio: ANIO_CIERRE, mes: MES_CIERRE } },
      update: { horasMesPrevio: f.paulaHoras, nivelAsignado: f.nivel },
      create: { nannieId: f.n.id, anio: ANIO_CIERRE, mes: MES_CIERRE, horasMesPrevio: f.paulaHoras, nivelAsignado: f.nivel },
    });
  }
});
console.log(`\n✔ Cierre manual aplicado a ${filas.length} nannies (nivel de octubre fijado).\n`);
await prisma.$disconnect();
