// Suma servicios PREVIOS al sistema (historia antes de nannies.mx) al contador
// de por vida de una nannie (serviciosAcumulados), SIN perder los que ya lleva
// en el sistema: es un incremento, no una sobreescritura. Es el mismo campo con
// el que se cargo la historia de las demas nannies ("Servicios cubiertos").
//
// Si el nuevo total alcanza un rango mayor (Rookie 50 / Junior 80 / Senior 130),
// se sube el rango permanente de una vez (nunca lo baja). El nivel-tarifa del mes
// NO se toca: lo fija el cierre de mes segun horas.
//
// Candado anti doble-aplicacion: --apply exige --actual=<valor que mostro el
// dry-run>. Si el contador ya cambio (otra corrida o un servicio completado en
// medio), no aplica y pide volver a correr el dry-run.
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/sumar-servicios-previos.mjs --nannie=Fery --servicios=29             (dry-run)
//   node scripts/sumar-servicios-previos.mjs --nannie=Fery --servicios=29 --id=<id> --actual=<n> --apply
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

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=');
const APPLY = process.argv.includes('--apply');
const CLAVE = arg('nannie');
const SUMAR = Number(arg('servicios'));
const ID = arg('id');
const ACTUAL = arg('actual');

const ORDEN = ['BASE', 'ROOKIE', 'JUNIOR', 'SENIOR'];
const rangoPor = (n) => (n >= 130 ? 'SENIOR' : n >= 80 ? 'JUNIOR' : n >= 50 ? 'ROOKIE' : 'BASE');

if (!CLAVE || !Number.isInteger(SUMAR) || SUMAR <= 0) {
  console.log('Uso: --nannie=<nombre> --servicios=<entero > 0> [--id=<id> --actual=<n> --apply]');
  process.exit(1);
}

const candidatas = await prisma.nannie.findMany({
  where: ID ? { id: ID } : { nombre: { contains: CLAVE, mode: 'insensitive' } },
  select: {
    id: true, nombre: true, plaza: true, estado: true, serviciosAcumulados: true,
    rangoPermanente: true, nivelTarifaMesActual: true,
    usuario: { select: { email: true, activo: true, creadoEn: true } },
  },
  orderBy: { nombre: 'asc' },
});

if (candidatas.length === 0) {
  console.log(`No hay ninguna nannie cuyo nombre contenga "${CLAVE}".`);
  process.exit(1);
}

console.log(`\nNannies que coinciden con "${CLAVE}":`);
for (const n of candidatas) {
  const [completados, paquetesDistintos] = await Promise.all([
    prisma.servicio.count({ where: { nannieId: n.id, estado: 'COMPLETADO' } }),
    prisma.servicio.findMany({ where: { nannieId: n.id, estado: 'COMPLETADO', paqueteId: { not: null } }, distinct: ['paqueteId'], select: { paqueteId: true } }),
  ]);
  const individuales = await prisma.servicio.count({ where: { nannieId: n.id, estado: 'COMPLETADO', paqueteId: null } });
  console.log(`- ${n.nombre}  [id ${n.id}]`);
  console.log(`    plaza ${n.plaza} · estado ${n.estado} · cuenta ${n.usuario ? `${n.usuario.email} (${n.usuario.activo ? 'activa' : 'inactiva'})` : 'sin cuenta'}`);
  console.log(`    contador actual (serviciosAcumulados): ${n.serviciosAcumulados} · rango ${n.rangoPermanente} · nivel del mes ${n.nivelTarifaMesActual}`);
  console.log(`    en el sistema: ${completados} servicios completados (${individuales} individuales + ${paquetesDistintos.length} paquetes distintos)`);
}

if (candidatas.length > 1 && !ID) {
  console.log('\nHay varias coincidencias: vuelve a correr con --id=<id> de la correcta.');
  process.exit(1);
}

const n = candidatas[0];
const nuevo = n.serviciosAcumulados + SUMAR;
const rangoNuevo = rangoPor(nuevo);
const subeRango = ORDEN.indexOf(rangoNuevo) > ORDEN.indexOf(n.rangoPermanente);
console.log(`\nPLAN para ${n.nombre}:`);
console.log(`  contador ${n.serviciosAcumulados} + ${SUMAR} previos = ${nuevo}`);
console.log(`  rango: ${n.rangoPermanente} -> ${subeRango ? rangoNuevo : `${n.rangoPermanente} (sin cambio)`}`);
console.log('  nivel del mes: sin cambio (lo fija el cierre de mes)');

if (!APPLY) {
  console.log(`\nDRY-RUN: no se cambio nada. Para aplicar:\n  node scripts/sumar-servicios-previos.mjs --nannie=${CLAVE} --servicios=${SUMAR} --id=${n.id} --actual=${n.serviciosAcumulados} --apply\n`);
  await prisma.$disconnect();
  process.exit(0);
}

if (!ID || ACTUAL === undefined || Number(ACTUAL) !== n.serviciosAcumulados) {
  console.log(`\nNO SE APLICO: --apply requiere --id y --actual=${n.serviciosAcumulados} (el valor de ahorita). Vuelve a correr el dry-run.`);
  await prisma.$disconnect();
  process.exit(1);
}

// Incremento condicionado al valor visto: si cambio en medio, no toca nada.
const res = await prisma.nannie.updateMany({
  where: { id: n.id, serviciosAcumulados: n.serviciosAcumulados },
  data: { serviciosAcumulados: { increment: SUMAR }, ...(subeRango ? { rangoPermanente: rangoNuevo } : {}) },
});
if (res.count !== 1) {
  console.log('\nNO SE APLICO: el contador cambio mientras tanto. Vuelve a correr el dry-run.');
  process.exit(1);
}
const fin = await prisma.nannie.findUnique({ where: { id: n.id }, select: { serviciosAcumulados: true, rangoPermanente: true } });
console.log(`\nAPLICADO: ${n.nombre} queda con ${fin.serviciosAcumulados} servicios de por vida · rango ${fin.rangoPermanente}.\n`);
await prisma.$disconnect();
