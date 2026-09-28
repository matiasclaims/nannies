// Repunta a la familia "Eventos sin ID familiar" los 4 servicios de la fiesta
// del 07-nov (Oscar Pérez / Valery Juárez), filas 96-99 de la hoja de futuros.
// Solo cambia la familia; nada más. DRY-RUN por defecto.
//   node scripts/repoint-eventos-sinid.mjs [apply]
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

const DESTINO = 'Eventos sin ID familiar';
const COMUN = { fecha: '2026-11-07', tipo: 'NANNIE_FIESTA_PLAYDATE', cobro: 1000, dur: 4, creado: '2026-09-18 19:55' };
const T = [
  { fila: 96, nannie: 'Jackeline' },
  { fila: 97, nannie: 'Roxana' },
  { fila: 98, nannie: 'Vianney' },
  { fila: 99, nannie: 'Mariana C (Tol)' },
].map((t) => ({ ...COMUN, ...t }));

async function main() {
  console.log(`\n=== Repunte fiesta 07-nov -> "${DESTINO}" — ${APLICAR ? 'APLICAR' : 'DRY-RUN'} ===\n`);

  // Familia destino.
  const fams = await prisma.familia.findMany({ select: { id: true, nombreContacto: true, apellido: true, plaza: true, estado: true } });
  const dest = fams.filter((f) => norm(`${f.nombreContacto} ${f.apellido ?? ''}`) === norm(DESTINO));
  if (dest.length !== 1) {
    console.log(`⚠ Familia destino "${DESTINO}": ${dest.length} coincidencias. Candidatos que contienen "eventos":`);
    for (const f of fams.filter((f) => norm(`${f.nombreContacto} ${f.apellido ?? ''}`).includes('eventos'))) console.log(`   "${f.nombreContacto}${f.apellido ? ' ' + f.apellido : ''}" · ${f.plaza} · ${f.estado} · ${f.id}`);
    console.log('\nNo se toca nada hasta resolver la familia destino.\n');
    return;
  }
  const d = dest[0];
  console.log(`Familia destino: "${d.nombreContacto}${d.apellido ? ' ' + d.apellido : ''}" · ${d.plaza} · ${d.id}\n`);

  const servicios = await prisma.servicio.findMany({
    where: { fecha: { gte: new Date('2026-11-07T00:00:00Z'), lt: new Date('2026-11-08T00:00:00Z') } },
    include: { nannie: { select: { nombre: true } }, familia: { select: { nombreContacto: true } }, finanza: { select: { cobroFamilia: true } } },
  });
  const ops = [];
  for (const t of T) {
    const hits = servicios.filter((s) =>
      s.tipoServicio === t.tipo && norm(s.nannie?.nombre) === norm(t.nannie) && s.duracionHoras === t.dur &&
      Number(s.finanza?.cobroFamilia ?? -1) === t.cobro && minuto(s.creadoEn) === `${t.creado.slice(0, 10)}T${t.creado.slice(11, 16)}`);
    if (hits.length !== 1) { console.log(`FILA ${t.fila} (${t.nannie}): ⚠ ${hits.length} coincidencias — NO se toca.`); continue; }
    const s = hits[0];
    const aviso = d.plaza !== s.plaza ? `  ⚠ (destino ${d.plaza}, servicio ${s.plaza})` : '';
    console.log(`FILA ${t.fila} [${s.id}] ${t.nannie} $${t.cobro}: familia "${s.familia?.nombreContacto}" -> "${d.nombreContacto}"${aviso}`);
    ops.push(s.id);
  }
  if (!APLICAR) { console.log(`\nDRY-RUN: no se escribió nada. Repuntes listos: ${ops.length}.\n`); return; }
  for (const id of ops) await prisma.servicio.update({ where: { id }, data: { familiaId: d.id } });
  console.log(`\n✔ Aplicado. ${ops.length} servicios repuntados a "${d.nombreContacto}".\n`);
}
main().catch((e) => { console.error('\nERROR:', e.message, '\n'); process.exit(1); }).finally(() => prisma.$disconnect());
