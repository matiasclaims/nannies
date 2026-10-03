// Crea un usuario con rol PROGRAMADOR (perfil técnico: solo gestiona los
// reportes de problemas). Contraseña temporal con cambio obligatorio al entrar.
// NO sobreescribe cuentas: si el correo ya existe, aborta.
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/crear-programador.mjs <correo> <passwordTemporal> [--nombre "Mario"]            (preview)
//   node scripts/crear-programador.mjs <correo> <passwordTemporal> [--nombre "Mario"] --apply
//
import { readFileSync, existsSync } from 'node:fs';
import argon2 from 'argon2';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}
const args = process.argv.slice(2);
const APLICAR = args.includes('--apply');
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const positional = args.filter((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--nombre');
const correo = positional[0];
const password = positional[1];
const nombre = val('--nombre') || 'Programador';

if (!correo || !password) {
  console.error('\nUso: node scripts/crear-programador.mjs <correo> <passwordTemporal> [--nombre "Mario"] [--apply]\n');
  process.exit(1);
}
if (password.length < 8) { console.error('\n✗ La contraseña temporal debe tener al menos 8 caracteres.\n'); process.exit(1); }

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const existe = await prisma.usuario.findUnique({ where: { email: correo.toLowerCase() }, select: { id: true, rol: true } });
if (existe) {
  console.error(`\n✗ Ya existe un usuario con el correo ${correo} (rol ${existe.rol}). No se sobreescribe. Usa otro correo.\n`);
  await prisma.$disconnect();
  process.exit(1);
}

console.log(`\nCrear usuario PROGRAMADOR`);
console.log(`  nombre:  ${nombre}`);
console.log(`  correo:  ${correo.toLowerCase()}`);
console.log(`  rol:     PROGRAMADOR`);
console.log(`  cambio de contraseña obligatorio al primer ingreso: sí`);

if (!APLICAR) { console.log('\n(PREVIEW. Nada se creó. Agrega --apply para crear.)\n'); await prisma.$disconnect(); process.exit(0); }

const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
const u = await prisma.usuario.create({
  data: { nombre, email: correo.toLowerCase(), passwordHash, rol: 'PROGRAMADOR', debeCambiarPassword: true, activo: true },
  select: { id: true },
});
console.log(`\n✔ Usuario PROGRAMADOR creado (${u.id}). Entra con ese correo y la contraseña temporal; te pedirá cambiarla.\n`);
await prisma.$disconnect();
