// Aplica el "pago manual" (Opción A) a la fiesta (fila 54) y la ludoteca (fila
// 55) de Doctor Pepe: pago = $260 en cada uno (FinanzaServicio.pagoNannie),
// quita el descuento de $130 de la 55, y BORRA el bono de $260 que ya no hace
// falta. Requiere el cambio de finanzas ya desplegado (que respeta pagoNannie).
//
// DRY-RUN por defecto. Aplicar: node scripts/override-pagos-sep.mjs apply
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
const APLICAR = process.argv.includes('apply');
const norm = (s) => (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
const minuto = (d) => d.toISOString().slice(0, 16);

const OV = [
  { fila: 54, fecha: '2026-09-08', tipo: 'NANNIE_FIESTA_PLAYDATE', nannie: 'Vianney', cobro: 500, dur: 2, creado: '2026-09-22 00:23', pago: 260, quitaDescuento: false },
  { fila: 55, fecha: '2026-09-08', tipo: 'LUDOTECA_MOVIL', nannie: 'Vianney', cobro: 820, dur: 2, creado: '2026-09-21 18:48', pago: 260, quitaDescuento: true },
];

async function main() {
  console.log(`\n=== Pago manual (Opción A) — ${APLICAR ? 'APLICAR' : 'DRY-RUN'} ===\n`);
  const servicios = await prisma.servicio.findMany({
    where: { fecha: { gte: new Date('2026-09-01T00:00:00Z'), lt: new Date('2026-10-01T00:00:00Z') } },
    include: { nannie: { select: { id: true, nombre: true } }, finanza: { select: { cobroFamilia: true, pagoNannie: true, descuentoNannie: true } } },
  });
  const ops = [];
  let vianneyId = null;
  for (const t of OV) {
    const hits = servicios.filter((s) =>
      s.fecha.toISOString().slice(0, 10) === t.fecha && s.tipoServicio === t.tipo &&
      norm(s.nannie?.nombre) === norm(t.nannie) && s.duracionHoras === t.dur &&
      Number(s.finanza?.cobroFamilia ?? -1) === t.cobro &&
      minuto(s.creadoEn) === `${t.creado.slice(0, 10)}T${t.creado.slice(11, 16)}`);
    if (hits.length !== 1) { console.log(`FILA ${t.fila}: ⚠ ${hits.length} coincidencias — NO se toca.`); continue; }
    const s = hits[0];
    vianneyId = s.nannie.id;
    console.log(`FILA ${t.fila} [${s.id}] ${t.tipo} $${t.cobro}: pago manual -> $${t.pago}` + (t.quitaDescuento ? `  (quita descuento actual $${s.finanza?.descuentoNannie ?? 0})` : ''));
    ops.push({ id: s.id, pago: t.pago, quitaDescuento: t.quitaDescuento });
  }
  // Bono de $260 a Vianney (el que creamos) — borrar.
  let bono = null;
  if (vianneyId) {
    const bonos = await prisma.bono.findMany({ where: { nannieId: vianneyId, monto: 260 } });
    const cand = bonos.filter((b) => norm(b.motivo).includes('ajuste pago fiesta'));
    if (cand.length === 1) { bono = cand[0]; console.log(`BONO a borrar [${bono.id}] "$${Number(bono.monto)}" · ${bono.motivo}`); }
    else console.log(`BONO: ⚠ ${cand.length} candidatos "Ajuste pago fiesta" $260 — revisar (no se borra).`);
  }

  if (!APLICAR) { console.log(`\nDRY-RUN: no se escribió nada. Operaciones: ${ops.length} pago(s)${bono ? ' + 1 bono' : ''}.\n`); return; }
  for (const o of ops) {
    await prisma.finanzaServicio.update({ where: { servicioId: o.id }, data: { pagoNannie: o.pago, ...(o.quitaDescuento ? { descuentoNannie: null } : {}) } });
  }
  if (bono) await prisma.bono.delete({ where: { id: bono.id } });
  console.log(`\n✔ Aplicado. ${ops.length} pago(s) manual(es)${bono ? ' + bono borrado' : ''}.\n`);
}
main().catch((e) => { console.error('\nERROR:', e.message, '\n'); process.exit(1); }).finally(() => prisma.$disconnect());
