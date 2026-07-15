/**
 * Seed inicial: crea los usuarios de los 3 roles para poder autenticar.
 * Las contraseñas se toman de variables de entorno (SEGURIDAD §6) y se
 * hashean con argon2 (§4). NUNCA hardcodear contraseñas reales aquí.
 *
 * Uso:
 *   SEED_DIRECTORA_PASS=... SEED_SUB_PASS=... SEED_NANNIE_PASS=... npm run db:seed
 */
import { PrismaClient, Rol } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function hash(plano: string): Promise<string> {
  return argon2.hash(plano, { type: argon2.argon2id });
}

async function main(): Promise<void> {
  const passDir = requireEnv('SEED_DIRECTORA_PASS');
  const passSub = requireEnv('SEED_SUB_PASS');
  const passNannie = requireEnv('SEED_NANNIE_PASS');

  // Directora (Paula)
  await prisma.usuario.upsert({
    where: { email: 'paula@nannies.mx' },
    update: {},
    create: {
      nombre: 'Paula',
      email: 'paula@nannies.mx',
      passwordHash: await hash(passDir),
      rol: Rol.DIRECTORA,
    },
  });

  // Subdirectora (Jackeline)
  await prisma.usuario.upsert({
    where: { email: 'jackeline@nannies.mx' },
    update: {},
    create: {
      nombre: 'Jackeline',
      email: 'jackeline@nannies.mx',
      passwordHash: await hash(passSub),
      rol: Rol.SUBDIRECTORA,
    },
  });

  // Nannie de ejemplo (con su ficha enlazada)
  const nannie = await prisma.nannie.upsert({
    where: { id: 'seed-nannie-01' },
    update: {},
    create: {
      id: 'seed-nannie-01',
      nombre: 'Nannie Demo',
      plaza: 'TOLUCA',
      zonas: ['Metepec'],
    },
  });
  await prisma.usuario.upsert({
    where: { email: 'nannie@nannies.mx' },
    update: {},
    create: {
      nombre: 'Nannie Demo',
      email: 'nannie@nannies.mx',
      passwordHash: await hash(passNannie),
      rol: Rol.NANNIE,
      nannieId: nannie.id,
    },
  });

  console.log('Seed completado: 3 usuarios (directora, subdirectora, nannie).');
}

function requireEnv(nombre: string): string {
  const v = process.env[nombre];
  if (!v || v.length < 8) {
    throw new Error(`Falta ${nombre} (mínimo 8 caracteres) para el seed.`);
  }
  return v;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
