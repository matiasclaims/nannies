// Ajustes de conciliación de SEPTIEMBRE (VPS). Cambios puntuales pedidos por
// Paula para que el sistema cuadre con sus controles externos.
//
// SEGURIDAD: DRY-RUN por defecto (no escribe). Aplicar:
//   node scripts/ajustes-conciliacion-sep.mjs apply
// Cada servicio se ubica por clave única (fecha+tipo+estado+nannie+cobro+
// duración+creadoEn al minuto); si no hay exactamente 1 match, se marca y NO se
// toca. Hacer respaldo (backup-prod.sh) antes de aplicar.
//
import { readFileSync, existsSync } from 'node:fs';

if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  }
}
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const APLICAR = process.argv.includes('apply');

// Servicios objetivo: clave de match + acción.
const T = [
  { fila: 15, fecha: '2026-09-03', tipo: 'ACOMPANAMIENTO_EVENTO', estado: 'COMPLETADO', nannie: 'Ivette', cobro: 380, dur: 4, creado: '2026-09-17 18:39', accion: 'repoint', familiaId: 'cmt8vb8i40137uys8jj0h1arm' },
  { fila: 17, fecha: '2026-09-03', tipo: 'ACOMPANAMIENTO_EVENTO', estado: 'CANCELADO', nannie: 'Ivette', cobro: 500, dur: 4, creado: '2026-09-17 18:32', accion: 'delete' },
  { fila: 26, fecha: '2026-09-04', tipo: 'DAYCARE', estado: 'COMPLETADO', nannie: 'Aide', cobro: 285, dur: 3, creado: '2026-09-17 18:37', accion: 'delete' },
  { fila: 38, fecha: '2026-09-05', tipo: 'NANNIE_EXPRESS', estado: 'CANCELADO', nannie: 'Vianney', cobro: 475, dur: 6, creado: '2026-09-18 18:26', accion: 'delete' },
  { fila: 41, fecha: '2026-09-05', tipo: 'NANNIE_EXPRESS', estado: 'ACEPTADO', nannie: 'Stephanie', cobro: 380, dur: 4, creado: '2026-09-17 18:50', accion: 'delete' },
  { fila: 54, fecha: '2026-09-08', tipo: 'NANNIE_FIESTA_PLAYDATE', estado: 'COMPLETADO', nannie: 'Vianney', cobro: 500, dur: 2, creado: '2026-09-22 00:23', accion: 'repoint', familiaId: 'cmullkakj015ll91bmt3soxbo', bono: 260 },
  { fila: 55, fecha: '2026-09-08', tipo: 'LUDOTECA_MOVIL', estado: 'COMPLETADO', nannie: 'Vianney', cobro: 820, dur: 2, creado: '2026-09-21 18:48', accion: 'repoint', familiaId: 'cmullkakj015ll91bmt3soxbo', descuento: 130 },
  { fila: 58, fecha: '2026-09-09', tipo: 'DAYCARE', estado: 'COMPLETADO', nannie: 'Fabiola', cobro: 610, dur: 5, creado: '2026-09-22 00:23', accion: 'repoint', familiaId: 'cmulmex6f015ml91bd10718tt' },
];

const norm = (s) => (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
const minuto = (d) => d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM (UTC)

async function main() {
  console.log(`\n=== Ajustes conciliación septiembre — ${APLICAR ? 'APLICAR (escribe)' : 'DRY-RUN'} ===\n`);

  const servicios = await prisma.servicio.findMany({
    where: { fecha: { gte: new Date('2026-09-01T00:00:00Z'), lt: new Date('2026-10-01T00:00:00Z') } },
    include: { nannie: { select: { id: true, nombre: true } }, familia: { select: { nombreContacto: true } }, finanza: { select: { cobroFamilia: true, descuentoNannie: true } } },
  });

  const familiaPorNombre = async (nombre) => {
    const fs = await prisma.familia.findMany({ where: {}, select: { id: true, nombreContacto: true, plaza: true } });
    const hit = fs.filter((f) => norm(f.nombreContacto) === norm(nombre));
    return hit;
  };

  const hallar = (t) => servicios.filter((s) =>
    s.fecha.toISOString().slice(0, 10) === t.fecha &&
    s.tipoServicio === t.tipo &&
    s.estado === t.estado &&
    norm(s.nannie?.nombre) === norm(t.nannie) &&
    s.duracionHoras === t.dur &&
    Number(s.finanza?.cobroFamilia ?? -1) === t.cobro &&
    minuto(s.creadoEn) === `${t.creado.slice(0, 10)}T${t.creado.slice(11, 16)}`,
  );

  const ops = [];
  for (const t of T) {
    const hits = hallar(t);
    if (hits.length !== 1) {
      console.log(`FILA ${t.fila}: ⚠ ${hits.length} coincidencias (esperaba 1) — NO se toca.`);
      continue;
    }
    const s = hits[0];
    const et = `FILA ${t.fila} [${s.id}] ${t.fecha} ${t.tipo} ${t.nannie} $${t.cobro} (fam actual: ${s.familia?.nombreContacto})`;
    if (t.accion === 'delete') {
      console.log(`${et}\n   -> BORRAR servicio y sus registros ligados.`);
      ops.push({ tipo: 'delete', id: s.id });
    } else if (t.accion === 'repoint') {
      const dest = t.familiaId
        ? await prisma.familia.findUnique({ where: { id: t.familiaId }, select: { id: true, nombreContacto: true, plaza: true } })
        : (await familiaPorNombre(t.familia))[0];
      if (!dest) {
        console.log(`${et}\n   ⚠ familia destino no encontrada (${t.familiaId ?? t.familia}) — NO se toca.`);
        continue;
      }
      const aviso = dest.plaza !== s.plaza ? `  ⚠ (destino es ${dest.plaza}, servicio es ${s.plaza})` : '';
      console.log(`${et}\n   -> FAMILIA a "${dest.nombreContacto}" (${dest.id})${aviso}`);
      ops.push({ tipo: 'repoint', id: s.id, familiaId: dest.id });
      if (t.descuento) {
        console.log(`   -> descuentoNannie = $${t.descuento} (pago neto baja a $260)`);
        ops.push({ tipo: 'descuento', id: s.id, monto: t.descuento });
      }
      if (t.bono) {
        console.log(`   -> BONO $${t.bono} a ${s.nannie?.nombre} (fecha ${t.fecha}) por pago especial`);
        ops.push({ tipo: 'bono', nannieId: s.nannie.id, monto: t.bono, fecha: t.fecha, motivo: `Ajuste pago fiesta ${t.fecha} (familia ${dest.nombreContacto}, tarifa especial)` });
      }
    }
  }

  // Nivel de Ivette -> 25 hrs
  const ivette = await prisma.nannie.findMany({ where: {}, select: { id: true, nombre: true, nivelTarifaMesActual: true } });
  const iv = ivette.filter((n) => norm(n.nombre) === 'ivette');
  if (iv.length === 1) {
    console.log(`\nNIVEL: Ivette (${iv[0].id}) ${iv[0].nivelTarifaMesActual} -> TARIFA_25HRS (recalcula el pago de TODOS sus servicios)`);
    ops.push({ tipo: 'nivel', id: iv[0].id });
  } else {
    console.log(`\nNIVEL: ⚠ ${iv.length} nannies "Ivette" — NO se toca.`);
  }

  // Verificación: familia "Carla planner"
  const carla = await familiaPorNombre('Carla planner');
  console.log(`\nVERIFICAR "Carla planner": ${carla.length} familia(s) ${carla.map((f) => `[${f.id} ${f.nombreContacto} ${f.plaza}]`).join(' ')}`);

  if (!APLICAR) {
    console.log(`\nDRY-RUN: no se escribió nada. Operaciones listas: ${ops.length}. Corre con "apply" tras respaldar.\n`);
    return;
  }

  for (const o of ops) {
    if (o.tipo === 'repoint') {
      await prisma.servicio.update({ where: { id: o.id }, data: { familiaId: o.familiaId } });
    } else if (o.tipo === 'descuento') {
      await prisma.finanzaServicio.update({ where: { servicioId: o.id }, data: { descuentoNannie: o.monto } });
    } else if (o.tipo === 'bono') {
      await prisma.bono.create({ data: { nannieId: o.nannieId, monto: o.monto, motivo: o.motivo, fecha: new Date(`${o.fecha}T12:00:00Z`) } });
    } else if (o.tipo === 'nivel') {
      await prisma.nannie.update({ where: { id: o.id }, data: { nivelTarifaMesActual: 'TARIFA_25HRS' } });
    } else if (o.tipo === 'delete') {
      await prisma.$transaction([
        prisma.ofertaRespuesta.deleteMany({ where: { servicioId: o.id } }),
        prisma.reporteServicio.deleteMany({ where: { servicioId: o.id } }),
        prisma.evaluacionServicio.deleteMany({ where: { servicioId: o.id } }),
        prisma.evaluacionCoordServicio.deleteMany({ where: { servicioId: o.id } }),
        prisma.finanzaServicio.deleteMany({ where: { servicioId: o.id } }),
        prisma.servicio.delete({ where: { id: o.id } }),
      ]);
    }
  }
  console.log(`\n✔ Aplicado. ${ops.length} operaciones.\n`);
}

main().catch((e) => { console.error('\nERROR:', e.message, '\n'); process.exit(1); }).finally(() => prisma.$disconnect());
