// Fija o renueva la contrasena de una cuenta de forma SEGURA.
//
// Regla de seguridad: la contrasena en texto plano nunca se guarda ni se
// registra; este script solo la hashea (argon2id) y guarda el hash. En modo
// "set" la contrasena la escribe el operador via la variable NEW_PASSWORD
// (no queda en el historial si se usa `read -s`). En modo "temp" se genera
// una aleatoria, se muestra UNA vez, y se obliga a cambiarla al entrar.
//
// Uso (en el VPS, desde /var/www/nannies/apps/api):
//
//   Listar cuentas:
//     node scripts/set-password.mjs list
//
//   Fijar la contrasena de una cuenta (queda lista para usar):
//     read -s -p "Nueva contrasena: " NEW_PASSWORD && echo && \
//       NEW_PASSWORD="$NEW_PASSWORD" node scripts/set-password.mjs set paula@nannies.mx
//
//   Contrasena TEMPORAL aleatoria (se pide cambiarla al primer ingreso):
//     node scripts/set-password.mjs temp jackeline@nannies.mx
//
import { readFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

// Carga DATABASE_URL desde .env (cwd = apps/api) si no viene ya en el entorno.
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  }
}

const { PrismaClient } = await import('@prisma/client');
const argon2 = (await import('argon2')).default;

const prisma = new PrismaClient();
const hash = (p) => argon2.hash(p, { type: argon2.argon2id });

async function main() {
  const [modo, email] = process.argv.slice(2);

  if (!modo || modo === 'list') {
    const us = await prisma.usuario.findMany({
      select: { email: true, nombre: true, rol: true, activo: true, debeCambiarPassword: true },
      orderBy: [{ rol: 'asc' }, { email: 'asc' }],
    });
    console.log('\nCuentas:');
    for (const u of us) {
      const estado = u.activo ? 'activa' : 'INACTIVA';
      const flag = u.debeCambiarPassword ? '  (debe cambiar al entrar)' : '';
      console.log(`  ${u.email.padEnd(40)} ${u.rol.padEnd(13)} ${estado}${flag}`);
    }
    console.log(`\nTotal: ${us.length}\n`);
    return;
  }

  if (!email) {
    throw new Error('Falta el correo. Ej: node scripts/set-password.mjs set paula@nannies.mx');
  }
  const u = await prisma.usuario.findUnique({ where: { email } });
  if (!u) throw new Error(`No existe la cuenta "${email}". Corre "list" para ver las cuentas.`);

  if (modo === 'set') {
    const pw = process.env.NEW_PASSWORD;
    if (!pw || pw.length < 8) {
      throw new Error(
        'Define NEW_PASSWORD (minimo 8 caracteres). Ejemplo:\n' +
          `  read -s -p "Nueva contrasena: " NEW_PASSWORD && echo && NEW_PASSWORD="$NEW_PASSWORD" node scripts/set-password.mjs set ${email}`,
      );
    }
    await prisma.usuario.update({
      where: { email },
      data: { passwordHash: await hash(pw), debeCambiarPassword: false },
    });
    console.log(`\nOK: contrasena actualizada para ${email} (lista para usar).\n`);
    return;
  }

  if (modo === 'temp') {
    const temp = randomBytes(24).toString('base64url').replace(/[-_]/g, '').slice(0, 12);
    await prisma.usuario.update({
      where: { email },
      data: { passwordHash: await hash(temp), debeCambiarPassword: true },
    });
    console.log(`\nOK: contrasena TEMPORAL para ${email}:\n`);
    console.log(`    ${temp}\n`);
    console.log('Comparte esta contrasena con la persona. Se le pedira cambiarla al entrar.\n');
    return;
  }

  throw new Error(`Modo no reconocido: "${modo}". Usa: list | set <correo> | temp <correo>.`);
}

main()
  .catch((e) => {
    console.error('\nERROR:', e.message, '\n');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
