// SOLO LECTURA. Diagnóstico de "no me sugiere nannies al crear un servicio".
// Replica el motor de recomendación (asignacion.service.ts › recomendar) y dice
// POR QUÉ queda fuera cada nannie. No escribe nada.
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/diagnostico-sugerencias.mjs
//       -> chequeos generales (familias Toluca sin colonia de catálogo, colonias
//          sin coordenadas, colonias/días de cada nannie)
//   node scripts/diagnostico-sugerencias.mjs --familia="Lopez" --fecha=2026-11-20 --inicio=16:00 --fin=19:00
//       -> además simula ESA búsqueda y explica nannie por nannie
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}
const arg = (k) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null; };
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const RADIO_KM = 4;
const TOLERANCIA_MIN = 60;
const sinAcentos = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/^\s*(col\.?|colonia|fracc\.?|fraccionamiento|barrio|bo\.)\s+/i, '').replace(/\s+/g, ' ').trim();
const aMin = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
const finMin = (i, f) => (aMin(f) > aMin(i) ? aMin(f) : aMin(f) + 1440);
const solapan = (ai, af, bi, bf) => aMin(ai) < finMin(bi, bf) && aMin(bi) < finMin(ai, af);
const hav = (la1, ln1, la2, ln2) => { const r = (g) => (g * Math.PI) / 180; const a = Math.sin(r(la2 - la1) / 2) ** 2 + Math.cos(r(la1)) * Math.cos(r(la2)) * Math.sin(r(ln2 - ln1) / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); };

const catalogo = await prisma.coloniaToluca.findMany({ select: { id: true, municipio: true, colonia: true, lat: true, lng: true } });
const sinCoords = catalogo.filter((c) => c.lat == null || c.lng == null);
// Mismo criterio que la pantalla (asignacion/page.tsx › coloniaFamilia): igualdad exacta sin mayúsculas.
const matchExacto = (txt) => { const t = (txt ?? '').trim().toLowerCase(); return t ? catalogo.find((c) => c.colonia.toLowerCase() === t) : undefined; };
const parecido = (txt) => { const t = sinAcentos(txt); if (!t) return null; return catalogo.find((c) => sinAcentos(c.colonia) === t) ?? catalogo.find((c) => { const k = sinAcentos(c.colonia); return k.length > 3 && (t.includes(k) || k.includes(t)); }) ?? null; };

// ---------- A) Catálogo ----------
console.log(`\n=== A) Catálogo de colonias Toluca ===`);
console.log(`  Colonias: ${catalogo.length}   sin coordenadas: ${sinCoords.length}`);
if (sinCoords.length) console.log(`  Ej. sin coords: ${sinCoords.slice(0, 8).map((c) => c.colonia).join(', ')}`);

// ---------- B) Familias Toluca ----------
const fams = await prisma.familia.findMany({ where: { plaza: 'TOLUCA', estado: 'ACTIVA' }, select: { nombreContacto: true, apellido: true, zona: true } });
const conMatch = fams.filter((f) => matchExacto(f.zona));
const manual = fams.filter((f) => !matchExacto(f.zona));
console.log(`\n=== B) Familias Toluca ACTIVAS: ${fams.length} ===`);
console.log(`  Colonia SÍ coincide con catálogo (match por km): ${conMatch.length}`);
console.log(`  Colonia NO coincide ("colonia manual" -> SIN sugerencias): ${manual.length}`);
for (const f of manual.slice(0, 20)) {
  const p = parecido(f.zona);
  console.log(`   - ${[f.nombreContacto, f.apellido].filter(Boolean).join(' ').padEnd(32)} zona="${f.zona ?? ''}"${p ? `  -> parecida en catálogo: "${p.colonia}"` : ''}`);
}
if (manual.length > 20) console.log(`   … y ${manual.length - 20} más`);

// ---------- C) Nannies Toluca ----------
const nanniesTol = await prisma.nannie.findMany({
  where: { plaza: 'TOLUCA', estado: { not: 'PAUSA' } },
  select: { id: true, nombre: true, estado: true, zonas: true, coloniasTrabajo: { select: { dias: true, colonia: { select: { colonia: true, lat: true, lng: true } } } } },
  orderBy: { nombre: 'asc' },
});
console.log(`\n=== C) Nannies Toluca (no PAUSA): ${nanniesTol.length} ===`);
for (const n of nanniesTol) {
  const cs = n.coloniasTrabajo;
  const dias = [...new Set(cs.flatMap((c) => c.dias))].sort().map((d) => DIAS[d]).join(',');
  const sc = cs.filter((c) => c.colonia.lat == null).length;
  console.log(`  ${n.nombre.padEnd(18)} ${n.estado.padEnd(7)} colonias=${String(cs.length).padStart(2)}  días=[${dias || '—'}]${sc ? `  (${sc} sin coords)` : ''}  zonas=${JSON.stringify(n.zonas)}`);
}

// ---------- D) Simulación de una búsqueda ----------
const famTxt = arg('familia'), fecha = arg('fecha'), ini = arg('inicio'), fin = arg('fin');
if (famTxt && fecha && ini && fin) {
  const cand = await prisma.familia.findMany({ where: { nombreContacto: { contains: famTxt, mode: 'insensitive' } }, select: { nombreContacto: true, apellido: true, zona: true, plaza: true } });
  if (cand.length !== 1) {
    console.log(`\n✗ "${famTxt}" coincide con ${cand.length} familias: ${cand.map((f) => f.nombreContacto).join(' | ')}`);
  } else {
    const fam = cand[0];
    const col = fam.plaza === 'TOLUCA' ? matchExacto(fam.zona) : undefined;
    const esGeo = fam.plaza === 'TOLUCA' && !!col;
    const fD = new Date(`${fecha}T00:00:00.000Z`);
    const dS = fD.getUTCDay();
    const dom = new Date(fD); dom.setUTCDate(fD.getUTCDate() - dS);
    const sab = new Date(dom); sab.setUTCDate(dom.getUTCDate() + 6);
    const [nn, disp, servs, ncs] = await Promise.all([
      prisma.nannie.findMany({ where: { estado: { not: 'PAUSA' } }, select: { id: true, nombre: true, plaza: true, zonas: true } }),
      prisma.disponibilidad.findMany({ where: { fecha: fD } }),
      prisma.servicio.findMany({ where: { fecha: { gte: dom, lte: sab } } }),
      prisma.nannieColonia.findMany({ include: { colonia: { select: { lat: true, lng: true } } } }),
    ]);
    console.log(`\n=== D) Simulación: ${fam.nombreContacto} · ${fecha} (${DIAS[dS]}) ${ini}–${fin} · ${fam.plaza} ===`);
    console.log(`  Colonia de la familia: "${fam.zona ?? ''}" -> ${col ? `catálogo "${col.colonia}" ${col.lat == null ? '(¡SIN coordenadas!)' : `(${col.lat.toFixed(4)},${col.lng.toFixed(4)})`}` : 'NO está en catálogo (colonia manual)'}`);
    console.log(`  Ruta del motor: ${esGeo ? 'match por km (Toluca)' : 'respaldo por NOMBRE de zona'}`);
    console.log(`  Bloques de disponibilidad registrados ese día (todas las nannies): ${disp.length}`);
    let ok = 0;
    for (const n of nn.filter((x) => x.plaza === fam.plaza)) {
      let motivo = null, km = null;
      if (esGeo) {
        if (col.lat == null || col.lng == null) motivo = 'la colonia del servicio no tiene coordenadas';
        else {
          const act = ncs.filter((c) => c.nannieId === n.id && c.dias.includes(dS) && c.colonia.lat != null);
          if (!act.length) motivo = `sin colonia activa los ${DIAS[dS]}`;
          else { km = Math.min(...act.map((c) => hav(col.lat, col.lng, c.colonia.lat, c.colonia.lng))); if (km > RADIO_KM) motivo = `su colonia más cercana está a ${km.toFixed(1)} km (>4)`; }
        }
      } else if (!n.zonas.some((z) => z.trim().toLowerCase() === (fam.zona ?? '').trim().toLowerCase())) motivo = `zona no coincide (zonas=${JSON.stringify(n.zonas)})`;
      const sus = disp.filter((d) => d.nannieId === n.id);
      if (!motivo) {
        const cubre = sus.some((b) => b.estado === 'DISPONIBLE' && Math.max(0, aMin(b.horaInicio) - aMin(ini)) <= TOLERANCIA_MIN && Math.max(0, finMin(ini, fin) - finMin(b.horaInicio, b.horaFin)) <= TOLERANCIA_MIN);
        if (!cubre) motivo = sus.length ? `disponibilidad no cubre (${sus.map((b) => `${b.estado} ${b.horaInicio}-${b.horaFin}`).join(', ')})` : 'no marcó disponibilidad ese día';
      }
      if (!motivo && sus.some((b) => (b.estado === 'BLOQUEADO' || b.estado === 'TEMPORAL') && solapan(b.horaInicio, b.horaFin, ini, fin))) motivo = 'tiene bloqueo en ese horario';
      if (!motivo && servs.some((s) => s.nannieId === n.id && s.fecha.toISOString().slice(0, 10) === fecha && (s.estado === 'ACEPTADO' || s.estado === 'OFERTADO') && solapan(s.horaInicio, s.horaFin, ini, fin))) motivo = 'choca con otro servicio suyo';
      if (!motivo) ok++;
      console.log(`   ${motivo ? '✗' : '✔'} ${n.nombre.padEnd(18)} ${motivo ?? `CANDIDATA${km != null ? ` (${km.toFixed(1)} km)` : ''}`}`);
    }
    console.log(`  => Candidatas: ${ok}`);
  }
}
await prisma.$disconnect();
