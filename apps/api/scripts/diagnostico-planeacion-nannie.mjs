// SOLO LECTURA. Diagnostico de "no puedo descargar el PDF de la planeacion".
// Revisa: (1) que exista la tabla de planeaciones, (2) la cuenta de la nannie
// (rol + si esta ligada a su registro via nannieId), (3) sus servicios recientes
// y cuales tienen planeacion capturada. No escribe nada.
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/diagnostico-planeacion-nannie.mjs            (usa NANNIE_CLAVE)
//   node scripts/diagnostico-planeacion-nannie.mjs "Samantha" (override por arg)
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}
const NANNIE_CLAVE = process.argv[2] || 'Samantha';
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

// (1) Tabla de planeaciones
let totalPlan = null;
try { totalPlan = await prisma.planeacionServicio.count(); } catch (e) { console.log(`\n✗ planeacionServicio NO consultable: ${e.code || e.message}`); }
if (totalPlan !== null) console.log(`\n✔ Tabla planeacionServicio OK. Planeaciones capturadas (global): ${totalPlan}`);

// (2) Registro de nannie + su cuenta de usuario
const nannies = await prisma.nannie.findMany({
  where: { nombre: { contains: NANNIE_CLAVE, mode: 'insensitive' } },
  select: { id: true, nombre: true, plaza: true, estado: true },
});
console.log(`\nRegistros de nannie que contienen "${NANNIE_CLAVE}": ${nannies.length}`);
for (const n of nannies) {
  console.log(`\n  • ${n.nombre} (${n.plaza}, ${n.estado})  nannieId=${n.id}`);
  const user = await prisma.usuario.findFirst({ where: { nannieId: n.id }, select: { email: true, rol: true, nannieId: true } });
  if (!user) {
    console.log(`     ⚠ SIN cuenta de usuario ligada a este nannieId (no podría entrar).`);
  } else {
    console.log(`     cuenta: ${user.email} | rol=${user.rol} | user.nannieId=${user.nannieId ?? 'NULL'}  ${user.nannieId === n.id ? '✔ ligada' : '✗ NO coincide'}`);
  }
  const servs = await prisma.servicio.findMany({
    where: { nannieId: n.id },
    orderBy: { fecha: 'desc' }, take: 8,
    select: { id: true, fecha: true, estado: true, requierePlaneacion: true, planeacion: { select: { id: true } } },
  });
  console.log(`     servicios recientes: ${servs.length}`);
  for (const s of servs) console.log(`       ${s.fecha.toISOString().slice(0,10)} ${s.estado.padEnd(11)} reqPlan=${s.requierePlaneacion} planeacion=${s.planeacion ? 'SÍ' : 'no'}  serv=${s.id}`);
}

// (3) Tambien: cuentas de usuario cuyo nombre contiene la clave (por si el nombre
//     no esta en el registro de nannie pero si en la cuenta)
const usersByName = await prisma.usuario.findMany({ where: { nombre: { contains: NANNIE_CLAVE, mode: 'insensitive' } }, select: { email: true, nombre: true, rol: true, nannieId: true } });
console.log(`\nCuentas de usuario que contienen "${NANNIE_CLAVE}": ${usersByName.length}`);
for (const u of usersByName) console.log(`   ${u.email} | ${u.nombre} | rol=${u.rol} | nannieId=${u.nannieId ?? 'NULL'}`);
await prisma.$disconnect();
