/**
 * Seed de DEMO para el preview (Vercel/Render). Datos de ejemplo FALSOS.
 * Puebla: 3 usuarios (roles), nannies, una familia ficticia, disponibilidad
 * y servicios/ofertas de la semana actual, para que la demo se vea viva.
 *
 * Contraseñas por env (SEGURIDAD §6). Uso:
 *   DATABASE_URL=<render-external> SEED_DIRECTORA_PASS=... SEED_SUB_PASS=... \
 *   SEED_NANNIE_PASS=... npx ts-node prisma/seed-demo.ts
 *
 * Idempotente: limpia disponibilidad/servicios/ofertas y los recrea en la
 * semana actual en cada corrida.
 */
import { PrismaClient, Rol } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const hash = (p: string) => argon2.hash(p, { type: argon2.argon2id });

function requireEnv(n: string): string {
  const v = process.env[n];
  if (!v || v.length < 8) throw new Error(`Falta ${n} (mín 8 caracteres).`);
  return v;
}

// --- Semana actual (lunes) en UTC ---
const hoy = new Date();
const lunes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));
lunes.setUTCDate(lunes.getUTCDate() - ((lunes.getUTCDay() + 6) % 7));
function dia(offset: number): Date {
  const d = new Date(lunes);
  d.setUTCDate(lunes.getUTCDate() + offset);
  return d;
}

async function main(): Promise<void> {
  const passDir = requireEnv('SEED_DIRECTORA_PASS');
  const passSub = requireEnv('SEED_SUB_PASS');
  const passNan = requireEnv('SEED_NANNIE_PASS');

  // --- Nannies (Jackie también funge como nannie; Paula es solo Directora) ---
  const nannies = [
    { id: 'nannie-jackie', nombre: 'Jackeline', plaza: 'TOLUCA' as const, zonas: ['Toluca Centro'] },
    { id: 'seed-nannie-01', nombre: 'Nannie Demo', plaza: 'TOLUCA' as const, zonas: ['Metepec'] },
    { id: 'seed-nannie-02', nombre: 'Beatriz', plaza: 'TOLUCA' as const, zonas: ['Toluca Centro'] },
    { id: 'seed-nannie-03', nombre: 'Carla', plaza: 'QUERETARO' as const, zonas: ['Centro'] },
  ];
  for (const n of nannies) {
    await prisma.nannie.upsert({
      where: { id: n.id },
      update: { nombre: n.nombre, plaza: n.plaza, zonas: n.zonas },
      create: { id: n.id, nombre: n.nombre, plaza: n.plaza, zonas: n.zonas, estado: 'ACTIVA' },
    });
  }

  // --- Usuarios (3 roles) ---
  const usuarios = [
    { email: 'paula@nannies.mx', nombre: 'Paula', rol: Rol.DIRECTORA, pass: passDir, nannieId: null },
    { email: 'jackeline@nannies.mx', nombre: 'Jackeline', rol: Rol.SUBDIRECTORA, pass: passSub, nannieId: 'nannie-jackie' },
    { email: 'nannie@nannies.mx', nombre: 'Nannie Demo', rol: Rol.NANNIE, pass: passNan, nannieId: 'seed-nannie-01' },
  ];
  for (const u of usuarios) {
    const passwordHash = await hash(u.pass);
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: { passwordHash, nannieId: u.nannieId },
      create: { email: u.email, nombre: u.nombre, rol: u.rol, passwordHash, nannieId: u.nannieId },
    });
  }

  // --- Familia ficticia ---
  await prisma.familia.upsert({
    where: { id: 'fam-demo' },
    update: {},
    create: {
      id: 'fam-demo',
      nombreContacto: 'Familia Ejemplo',
      plaza: 'TOLUCA',
      zona: 'Metepec',
      estado: 'ACTIVA',
    },
  });

  // --- Limpieza de datos de calendario (idempotencia) ---
  await prisma.ofertaRespuesta.deleteMany({});
  await prisma.servicio.deleteMany({});
  await prisma.paquete.deleteMany({});
  await prisma.disponibilidad.deleteMany({});

  // --- Paquete de horas de demo (M2) para "Familia Ejemplo" ---
  const paqueteDemo = await prisma.paquete.create({
    data: { familiaId: 'fam-demo', horasTotales: 30, horasConsumidas: 4, precioTotal: 3750 },
  });

  // --- Disponibilidad de la semana ---
  const disp: {
    nannieId: string;
    d: number;
    ini: string;
    fin: string;
    estado?: 'DISPONIBLE' | 'BLOQUEADO';
  }[] = [
    { nannieId: 'seed-nannie-01', d: 0, ini: '09:00', fin: '13:00' },
    { nannieId: 'seed-nannie-01', d: 1, ini: '09:00', fin: '14:00' },
    { nannieId: 'seed-nannie-02', d: 0, ini: '08:00', fin: '12:00' },
    { nannieId: 'seed-nannie-02', d: 2, ini: '08:00', fin: '12:00' },
    { nannieId: 'seed-nannie-02', d: 4, ini: '00:00', fin: '23:59', estado: 'BLOQUEADO' },
    { nannieId: 'seed-nannie-03', d: 1, ini: '10:00', fin: '15:00' },
    { nannieId: 'nannie-jackie', d: 3, ini: '09:00', fin: '13:00' },
  ];
  for (const b of disp) {
    await prisma.disponibilidad.create({
      data: {
        nannieId: b.nannieId,
        fecha: dia(b.d),
        horaInicio: b.ini,
        horaFin: b.fin,
        estado: b.estado ?? 'DISPONIBLE',
      },
    });
  }

  // --- Servicios / ofertas ---
  // A) Por asignar (aparece en el riel de coordinación)
  await prisma.servicio.create({
    data: {
      familiaId: 'fam-demo',
      plaza: 'TOLUCA',
      zona: 'Metepec',
      tipoServicio: 'DAYCARE',
      formato: 'INDIVIDUAL',
      numNinos: 2,
      fecha: dia(2),
      horaInicio: '09:00',
      horaFin: '14:00',
      duracionHoras: 5,
      estado: 'OFERTADO', // sin nannie = por asignar
    },
  });
  // B) Ofertado a Nannie Demo (ella lo verá para aceptar/rechazar)
  await prisma.servicio.create({
    data: {
      familiaId: 'fam-demo',
      nannieId: 'seed-nannie-01',
      plaza: 'TOLUCA',
      zona: 'Metepec',
      tipoServicio: 'NIGHTCARE',
      formato: 'INDIVIDUAL',
      numNinos: 1,
      fecha: dia(4),
      horaInicio: '16:00',
      horaFin: '20:00',
      duracionHoras: 4,
      estado: 'OFERTADO',
    },
  });
  // C) Aceptado por Beatriz (se ve asignado en el calendario del equipo);
  //    va contra el paquete de la familia (consume 4 h → saldo 26/30).
  const aceptado = await prisma.servicio.create({
    data: {
      familiaId: 'fam-demo',
      nannieId: 'seed-nannie-02',
      plaza: 'TOLUCA',
      zona: 'Toluca Centro',
      tipoServicio: 'DAYCARE',
      formato: 'PAQUETE',
      paqueteId: paqueteDemo.id,
      numNinos: 2,
      fecha: dia(1),
      horaInicio: '08:00',
      horaFin: '12:00',
      duracionHoras: 4,
      estado: 'ACEPTADO',
    },
  });
  await prisma.ofertaRespuesta.create({
    data: { servicioId: aceptado.id, nannieId: 'seed-nannie-02', respuesta: 'ACEPTO' },
  });

  console.log('Seed de demo completado: usuarios, nannies, disponibilidad y servicios.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
