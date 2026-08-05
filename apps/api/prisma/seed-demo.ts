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
import { PrismaClient, Rol, type TipoServicio } from '@prisma/client';
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
  // Rango/nivel variados para que el cierre de mes muestre movimientos:
  // Beatriz es Senior (pero hará <25 h → caerá a Base); Nannie Demo es Base y
  // hará ≥25 h → subirá a "25 hrs"; Jackie es Rookie.
  const nannies = [
    { id: 'nannie-jackie', nombre: 'Jackeline', plaza: 'TOLUCA' as const, zonas: ['Toluca Centro'], rango: 'ROOKIE' as const, serv: 55, nivel: 'ROOKIE' as const },
    { id: 'seed-nannie-01', nombre: 'Nannie Demo', plaza: 'TOLUCA' as const, zonas: ['Metepec'], rango: 'BASE' as const, serv: 12, nivel: 'BASE' as const },
    { id: 'seed-nannie-02', nombre: 'Beatriz', plaza: 'TOLUCA' as const, zonas: ['Toluca Centro'], rango: 'SENIOR' as const, serv: 140, nivel: 'SENIOR' as const },
    { id: 'seed-nannie-03', nombre: 'Carla', plaza: 'QUERETARO' as const, zonas: ['Corazón', 'Conecta'], rango: 'BASE' as const, serv: 3, nivel: 'BASE' as const },
  ];
  for (const n of nannies) {
    const datos = {
      nombre: n.nombre,
      plaza: n.plaza,
      zonas: n.zonas,
      rangoPermanente: n.rango,
      serviciosAcumulados: n.serv,
      nivelTarifaMesActual: n.nivel,
    };
    await prisma.nannie.upsert({
      where: { id: n.id },
      update: datos,
      create: { id: n.id, estado: 'ACTIVA', ...datos },
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
    update: { telefono: '722 123 4567', email: 'familia.ejemplo@correo.mx' },
    create: {
      id: 'fam-demo',
      nombreContacto: 'Familia Ejemplo',
      telefono: '722 123 4567',
      email: 'familia.ejemplo@correo.mx',
      plaza: 'TOLUCA',
      zona: 'Metepec',
      estado: 'ACTIVA',
    },
  });

  // --- Familia de Querétaro (demo del tabulador por zona) ---
  await prisma.familia.upsert({
    where: { id: 'fam-qro' },
    update: { plaza: 'QUERETARO', zona: 'Corazón' },
    create: {
      id: 'fam-qro',
      nombreContacto: 'Familia Querétaro',
      telefono: '442 555 1212',
      email: 'qro.ejemplo@correo.mx',
      plaza: 'QUERETARO',
      zona: 'Corazón',
      estado: 'ACTIVA',
    },
  });

  // --- Limpieza de datos de calendario (idempotencia) ---
  await prisma.ofertaRespuesta.deleteMany({});
  await prisma.finanzaServicio.deleteMany({});
  await prisma.cierreMes.deleteMany({});
  await prisma.servicio.deleteMany({});
  await prisma.paquete.deleteMany({});
  await prisma.disponibilidad.deleteMany({});
  await prisma.notaFamilia.deleteMany({});
  await prisma.nino.deleteMany({});

  // --- Niños + bitácora de la familia demo (M5) ---
  await prisma.nino.createMany({
    data: [
      {
        familiaId: 'fam-demo',
        nombre: 'Sofía',
        apellidos: 'Salvador Ruiz',
        edad: 5,
        genero: 'Femenino',
        salud: 'Alergia a nueces y polen. Lleva antihistamínico en su mochila.',
        rutinas: 'Siesta 14:00, lunch 12:30, clase de natación lunes 17:00.',
        necesidades: 'Le gustan los dinosaurios; se adapta con tiempo a personas nuevas.',
      },
      {
        familiaId: 'fam-demo',
        nombre: 'Mateo',
        apellidos: 'Salvador Ruiz',
        edad: 2,
        genero: 'Masculino',
        salud: 'Sin condiciones conocidas.',
        rutinas: 'Siesta 13:00. Aún usa pañal.',
        necesidades: 'Muy cariñoso; conducta de riesgo: se mete objetos a la boca.',
      },
    ],
  });
  await prisma.notaFamilia.create({
    data: {
      familiaId: 'fam-demo',
      texto: 'Familia muy puntual y amable. Prefieren nannies que propongan actividades.',
      autorNombre: 'Paula',
    },
  });

  // Ficha de nannie heredada de Paula: ya no opera como nannie (solo Directora).
  // Se elimina aquí, cuando ya no quedan servicios/disponibilidad que la referencien.
  await prisma.nannie.deleteMany({ where: { id: 'nannie-paula' } });

  // --- Paquete de horas de demo (M2) para "Familia Ejemplo" ---
  const paqueteDemo = await prisma.paquete.create({
    data: { familiaId: 'fam-demo', horasTotales: 30, horasConsumidas: 4, precioTotal: 3750 },
  });

  // --- Paquete de Querétaro (precio por zona: Corazón 20 h = $2,650) ---
  await prisma.paquete.create({
    data: { familiaId: 'fam-qro', horasTotales: 20, horasConsumidas: 0, precioTotal: 2650 },
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
    { nannieId: 'seed-nannie-02', d: 3, ini: '14:00', fin: '19:00', estado: 'BLOQUEADO' },
    { nannieId: 'seed-nannie-03', d: 1, ini: '10:00', fin: '15:00' },
    { nannieId: 'seed-nannie-03', d: 3, ini: '09:00', fin: '15:00' },
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

  // --- Servicios / ofertas (cada uno con su finanza: cobro a la familia) ---
  // A) Por asignar (aparece en el riel de coordinación)
  const porAsignar = await prisma.servicio.create({
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
  // Cobro individual = tarifa/hora × horas ($125/h × 5 h = 625).
  await prisma.finanzaServicio.create({
    data: { servicioId: porAsignar.id, cobroFamilia: 625 },
  });
  // B) Ofertado a Nannie Demo (ella lo verá para aceptar/rechazar)
  const ofertado = await prisma.servicio.create({
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
  // $140/h × 4 h = 560.
  await prisma.finanzaServicio.create({
    data: { servicioId: ofertado.id, cobroFamilia: 560 },
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
  // Cobro prorrateado del paquete: (3750/30) × 4 h = 500.
  await prisma.finanzaServicio.create({
    data: { servicioId: aceptado.id, cobroFamilia: 500 },
  });

  // D–G) Servicios COMPLETADOS de la semana (para la nómina). El último es
  // Ludoteca: su tarifa de PAGO está pendiente de definir (se verá "pendiente").
  const completados: {
    nannieId: string;
    tipo: TipoServicio;
    d: number;
    ini: string;
    fin: string;
    dur: number;
    ninos: number;
    cobro: number;
  }[] = [
    // cobro = tarifa/hora × horas para daycare; fiesta/ludoteca con monto libre.
    { nannieId: 'seed-nannie-01', tipo: 'DAYCARE', d: 0, ini: '09:00', fin: '14:00', dur: 5, ninos: 2, cobro: 625 }, // $125/h
    { nannieId: 'seed-nannie-02', tipo: 'DAYCARE', d: 1, ini: '08:00', fin: '11:00', dur: 3, ninos: 1, cobro: 285 }, // $95/h
    { nannieId: 'nannie-jackie', tipo: 'NANNIE_FIESTA_PLAYDATE', d: 2, ini: '12:00', fin: '15:00', dur: 3, ninos: 5, cobro: 650 },
    { nannieId: 'seed-nannie-01', tipo: 'LUDOTECA_MOVIL', d: 3, ini: '10:00', fin: '14:00', dur: 4, ninos: 6, cobro: 700 },
    // Nannie Demo acumula ≥25 h en el mes (5+4+9+9=27) → el cierre la sube a "25 hrs".
    { nannieId: 'seed-nannie-01', tipo: 'DAYCARE', d: 1, ini: '09:00', fin: '18:00', dur: 9, ninos: 2, cobro: 1125 }, // $125/h
    { nannieId: 'seed-nannie-01', tipo: 'DAYCARE', d: 4, ini: '09:00', fin: '18:00', dur: 9, ninos: 2, cobro: 1125 },
  ];
  for (const c of completados) {
    const s = await prisma.servicio.create({
      data: {
        familiaId: 'fam-demo',
        nannieId: c.nannieId,
        plaza: 'TOLUCA',
        zona: 'Metepec',
        tipoServicio: c.tipo,
        formato: 'INDIVIDUAL',
        numNinos: c.ninos,
        fecha: dia(c.d),
        horaInicio: c.ini,
        horaFin: c.fin,
        duracionHoras: c.dur,
        estado: 'COMPLETADO',
      },
    });
    await prisma.ofertaRespuesta.create({
      data: { servicioId: s.id, nannieId: c.nannieId, respuesta: 'ACEPTO' },
    });
    await prisma.finanzaServicio.create({ data: { servicioId: s.id, cobroFamilia: c.cobro } });
  }

  // --- Servicios COMPLETADOS de QUERÉTARO (Carla). El pago se calcula por zona
  //     (sin nivel); aquí solo se guarda el cobro y, en individuales, la tarifa
  //     por hora resuelta del nivel elegido. Familia/zona: fam-qro / Corazón. ---
  const qroCompletados: {
    tipo: TipoServicio;
    d: number;
    ini: string;
    fin: string;
    dur: number;
    ninos: number;
    cobro: number;
    tarifaDia?: number;
  }[] = [
    // Daycare Corazón, día, nivel Básico ($160/h × 5 h = 800). Pago = 103.33/h.
    { tipo: 'DAYCARE', d: 1, ini: '10:00', fin: '15:00', dur: 5, ninos: 2, cobro: 800, tarifaDia: 160 },
    // Nannie de fiesta Corazón ($280/h × 3 h = 840). Pago = 170/h.
    { tipo: 'NANNIE_FIESTA_PLAYDATE', d: 2, ini: '12:00', fin: '15:00', dur: 3, ninos: 5, cobro: 840 },
  ];
  for (const c of qroCompletados) {
    const s = await prisma.servicio.create({
      data: {
        familiaId: 'fam-qro',
        nannieId: 'seed-nannie-03',
        plaza: 'QUERETARO',
        zona: 'Corazón',
        tipoServicio: c.tipo,
        formato: 'INDIVIDUAL',
        numNinos: c.ninos,
        fecha: dia(c.d),
        horaInicio: c.ini,
        horaFin: c.fin,
        duracionHoras: c.dur,
        estado: 'COMPLETADO',
      },
    });
    await prisma.ofertaRespuesta.create({
      data: { servicioId: s.id, nannieId: 'seed-nannie-03', respuesta: 'ACEPTO' },
    });
    await prisma.finanzaServicio.create({
      data: { servicioId: s.id, cobroFamilia: c.cobro, tarifaDia: c.tarifaDia },
    });
  }

  // H) Servicio RECHAZADO (para ver el panel de rechazadas en burdeos). La
  //    coordinación puede reofrecerlo a otra nannie.
  const rechazado = await prisma.servicio.create({
    data: {
      familiaId: 'fam-demo',
      nannieId: 'seed-nannie-01',
      plaza: 'TOLUCA',
      zona: 'Metepec',
      tipoServicio: 'DAYCARE',
      formato: 'INDIVIDUAL',
      numNinos: 1,
      fecha: dia(2),
      horaInicio: '16:00',
      horaFin: '19:00',
      duracionHoras: 3,
      estado: 'RECHAZADO',
    },
  });
  await prisma.ofertaRespuesta.create({
    data: { servicioId: rechazado.id, nannieId: 'seed-nannie-01', respuesta: 'RECHAZO' },
  });
  await prisma.finanzaServicio.create({ data: { servicioId: rechazado.id, cobroFamilia: 300 } });

  console.log('Seed de demo completado: usuarios, nannies, disponibilidad y servicios.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
