// Edita o AGREGA una sesion de un paquete (reconciliacion contra la base de
// Paula, opcion B). Recalcula el cobro prorrateado de la sesion y el saldo del
// paquete (horasConsumidas + estado). SOLO paquetes. Dry-run por defecto.
//
// Editar (por folio + fecha; la fecha debe ser unica en el paquete):
//   node scripts/paquete-sesion.mjs <folio> --fecha 2026-09-24 --nannie "Stephanie" --estado COMPLETADO
//   node scripts/paquete-sesion.mjs <folio> --fecha 2026-09-26 --fin 18:00 --estado COMPLETADO --apply
//   node scripts/paquete-sesion.mjs <folio> --fecha 2026-09-28 --inicio 09:00 --fin 11:00 --estado COMPLETADO --apply
// Agregar:
//   node scripts/paquete-sesion.mjs <folio> --add --fecha 2026-08-31 --inicio 10:00 --fin 11:00 --nannie "Stephanie" --estado COMPLETADO --apply
//
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}
const args = process.argv.slice(2);
const folio = Number(args[0]);
const APLICAR = args.includes('--apply');
const ADD = args.includes('--add');
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const CERRADOS = ['CANCELADO', 'RECHAZADO'];
const ESTADOS = ['OFERTADO', 'ACEPTADO', 'COMPLETADO', 'CANCELADO', 'RECHAZADO'];
const r2 = (n) => Math.round(n * 100) / 100;
const durDe = (ini, fin) => { const a = ini.split(':').map(Number), b = fin.split(':').map(Number); let d = (b[0] * 60 + b[1]) - (a[0] * 60 + a[1]); if (d <= 0) d += 24 * 60; return d / 60; };

const fecha = val('--fecha');
if (!Number.isFinite(folio) || !fecha) { console.error('\nUso: node scripts/paquete-sesion.mjs <folio> [--add] --fecha YYYY-MM-DD [--nannie N] [--inicio HH:MM] [--fin HH:MM] [--estado E] [--apply]\n'); process.exit(1); }
const estadoArg = val('--estado');
if (estadoArg && !ESTADOS.includes(estadoArg)) { console.error(`\nEstado invalido. Usa: ${ESTADOS.join(', ')}\n`); process.exit(1); }

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const p = await prisma.paquete.findUnique({
  where: { folio },
  select: {
    id: true, folio: true, estado: true, horasTotales: true, horasConsumidas: true, precioTotal: true, familiaId: true,
    familia: { select: { nombreContacto: true, apellido: true, plaza: true, zona: true } },
    servicios: { select: { id: true, fecha: true, horaInicio: true, horaFin: true, duracionHoras: true, estado: true, tipoServicio: true, numNinos: true, plaza: true, zona: true, coloniaToluca: { select: { id: true } }, requierePlaneacion: true, nannie: { select: { nombre: true } } } },
  },
});
if (!p) { console.error(`\nNo existe el paquete #${folio}.\n`); await prisma.$disconnect(); process.exit(1); }
const precioHora = Number(p.precioTotal) / p.horasTotales;

async function resolverNannie(nombre) {
  const ns = await prisma.nannie.findMany({ where: { nombre: { contains: nombre, mode: 'insensitive' } }, select: { id: true, nombre: true } });
  if (ns.length === 0) { throw new Error(`No hay nannie que coincida con "${nombre}".`); }
  if (ns.length > 1) { throw new Error(`"${nombre}" coincide con varias: ${ns.map((n) => n.nombre).join(', ')}. Se mas especifico.`); }
  return ns[0];
}

const fechaUTC = new Date(`${fecha}T00:00:00.000Z`);
let plan;
try {
  if (ADD) {
    const tpl = p.servicios[0]; // plantilla de una sesion hermana (tipo/zona/plaza/niños)
    const inicio = val('--inicio'), fin = val('--fin');
    if (!inicio || !fin) throw new Error('Para --add hay que dar --inicio y --fin.');
    const dur = durDe(inicio, fin);
    const nan = val('--nannie') ? await resolverNannie(val('--nannie')) : null;
    const estado = estadoArg ?? 'COMPLETADO';
    plan = {
      tipo: 'ADD', dur, inicio, fin, estado,
      nannieNombre: nan?.nombre ?? '(sin nannie)', nannieId: nan?.id ?? null,
      cobro: r2(precioHora * dur),
      tipoServicio: tpl?.tipoServicio ?? 'DAYCARE',
      numNinos: tpl?.numNinos ?? 1,
      plaza: tpl?.plaza ?? p.familia.plaza,
      zona: tpl?.zona ?? p.familia.zona ?? '',
      coloniaId: tpl?.coloniaToluca?.id ?? null,
      requierePlaneacion: tpl?.requierePlaneacion ?? false,
    };
  } else {
    const cands = p.servicios.filter((s) => s.fecha.toISOString().slice(0, 10) === fecha);
    if (cands.length === 0) throw new Error(`El paquete no tiene sesion en ${fecha}.`);
    if (cands.length > 1) throw new Error(`Hay ${cands.length} sesiones en ${fecha}; este script edita por fecha unica.`);
    const s = cands[0];
    const inicio = val('--inicio') ?? s.horaInicio;
    const fin = val('--fin') ?? s.horaFin;
    const dur = durDe(inicio, fin);
    const nan = val('--nannie') ? await resolverNannie(val('--nannie')) : null;
    const estado = estadoArg ?? s.estado;
    plan = {
      tipo: 'EDIT', id: s.id,
      antes: { inicio: s.horaInicio, fin: s.horaFin, dur: s.duracionHoras, estado: s.estado, nannie: s.nannie?.nombre ?? '(sin nannie)' },
      inicio, fin, dur, estado,
      nannieNombre: nan?.nombre ?? (s.nannie?.nombre ?? '(sin nannie)'), nannieId: nan?.id ?? undefined,
      cobro: r2(precioHora * dur),
    };
  }
} catch (e) { console.error(`\n✗ ${e.message}\n`); await prisma.$disconnect(); process.exit(1); }

const fam = [p.familia.nombreContacto, p.familia.apellido].filter(Boolean).join(' ');
console.log(`\nPaquete #${p.folio} — ${fam}   (${p.horasConsumidas}/${p.horasTotales} h, ${p.estado})`);
if (plan.tipo === 'ADD') {
  console.log(`  AGREGAR sesion: ${fecha}  ${plan.inicio}-${plan.fin}  ${plan.dur}h  ${plan.estado}  ${plan.nannieNombre}  cobro $${plan.cobro.toFixed(2)}`);
} else {
  console.log(`  EDITAR sesion ${fecha}:`);
  console.log(`     antes:   ${plan.antes.inicio}-${plan.antes.fin}  ${plan.antes.dur}h  ${plan.antes.estado}  ${plan.antes.nannie}`);
  console.log(`     despues: ${plan.inicio}-${plan.fin}  ${plan.dur}h  ${plan.estado}  ${plan.nannieNombre}  cobro $${plan.cobro.toFixed(2)}`);
}

// Saldo resultante = suma de horas de sesiones vivas tras el cambio.
const durTrasCambio = (s) => {
  if (plan.tipo === 'EDIT' && s.id === plan.id) return { dur: plan.dur, estado: plan.estado };
  return { dur: s.duracionHoras, estado: s.estado };
};
let vivas = p.servicios.map(durTrasCambio);
if (plan.tipo === 'ADD') vivas.push({ dur: plan.dur, estado: plan.estado });
const consumidasNuevas = vivas.filter((x) => !CERRADOS.includes(x.estado)).reduce((a, x) => a + x.dur, 0);
const estadoPaqNuevo = consumidasNuevas >= p.horasTotales ? 'CONSUMIDO' : (p.estado === 'CONSUMIDO' ? 'ACTIVO' : p.estado);
console.log(`  Saldo del paquete: ${p.horasConsumidas}/${p.horasTotales} -> ${consumidasNuevas}/${p.horasTotales}  estado ${p.estado} -> ${estadoPaqNuevo}`);

if (!APLICAR) { console.log('\n(DRY-RUN. Nada se cambió. Agrega --apply para aplicar.)\n'); await prisma.$disconnect(); process.exit(0); }

await prisma.$transaction(async (tx) => {
  if (plan.tipo === 'ADD') {
    const s = await tx.servicio.create({
      data: {
        familia: { connect: { id: p.familiaId } },
        ...(plan.nannieId ? { nannie: { connect: { id: plan.nannieId } } } : {}),
        paquete: { connect: { id: p.id } },
        formato: 'PAQUETE', tipoServicio: plan.tipoServicio, numNinos: plan.numNinos,
        plaza: plan.plaza, zona: plan.zona,
        ...(plan.coloniaId ? { coloniaToluca: { connect: { id: plan.coloniaId } } } : {}),
        requierePlaneacion: plan.requierePlaneacion,
        fecha: fechaUTC, horaInicio: plan.inicio, horaFin: plan.fin, duracionHoras: plan.dur,
        estado: plan.estado, ...(plan.estado === 'COMPLETADO' ? { completadoEn: fechaUTC } : {}),
      },
    });
    await tx.finanzaServicio.create({ data: { servicioId: s.id, cobroFamilia: plan.cobro } });
  } else {
    await tx.servicio.update({
      where: { id: plan.id },
      data: {
        horaInicio: plan.inicio, horaFin: plan.fin, duracionHoras: plan.dur, estado: plan.estado,
        ...(plan.nannieId !== undefined ? { nannieId: plan.nannieId } : {}),
        ...(plan.estado === 'COMPLETADO' ? { completadoEn: fechaUTC } : {}),
      },
    });
    await tx.finanzaServicio.upsert({
      where: { servicioId: plan.id },
      update: { cobroFamilia: plan.cobro },
      create: { servicioId: plan.id, cobroFamilia: plan.cobro },
    });
  }
  await tx.paquete.update({ where: { id: p.id }, data: { horasConsumidas: consumidasNuevas, estado: estadoPaqNuevo } });
});
console.log('\n✔ Aplicado.\n');
await prisma.$disconnect();
