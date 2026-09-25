// Importación del HISTÓRICO de Querétaro (2023-2025) — solo estadística/reportes.
//
// SEGURIDAD:
//  - Por defecto es DRY-RUN: no escribe nada, solo reporta el plan y las cifras.
//    Para aplicar de verdad:  node scripts/qro-historico-importar.mjs apply
//  - Es IDEMPOTENTE: usa ids deterministas (qrohist-*), así que correrlo dos
//    veces no duplica.
//  - Solo INSERTA (familias históricas + servicios + finanzas). El ÚNICO cambio
//    a un registro existente es corregir la plaza de Paulina Best a Querétaro
//    (confirmado por Mario, 2026-09-25). No borra nada.
//
// Decisiones (Mario/Paula): zona histórica sin mapear; "Grupo Burbuja" como nota;
// nannie se liga solo si existe activa en Qro (si no, el nombre queda en la nota,
// sin impacto en estadísticas); familias 2023-2025 se crean históricas salvo
// Paulina/Marcelo que se LIGA a la familia viva.
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

// Familia viva a la que se LIGA (y se le corrige la plaza). Clave = mamá normalizada.
const LINKS = { paulina: { id: 'cmuey8izj001kl9iba2x9cey2', fixPlaza: true } };
// Fusión de variantes de la misma familia.
const ALIAS = { stef: 'stefania' };

const datos = JSON.parse(readFileSync(new URL('./qro-historico-datos.json', import.meta.url), 'utf8'));

const norm = (s) =>
  (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sinnombre';
const famKey = (mama) => ALIAS[norm(mama)] ?? (norm(mama) || 'sinnombre');
const red2 = (n) => Math.round(n * 100) / 100;

function mapTipo(raw) {
  const t = norm(raw);
  if (t.includes('paquete')) return { tipo: 'DAYCARE', formato: 'PAQUETE' };
  if (t.includes('night')) return { tipo: 'NIGHTCARE', formato: 'INDIVIDUAL' };
  if (t.includes('acompan')) return { tipo: 'ACOMPANAMIENTO_EVENTO', formato: 'INDIVIDUAL' };
  if (t.includes('fiesta')) return { tipo: 'NANNIE_FIESTA_PLAYDATE', formato: 'INDIVIDUAL' };
  if (t.includes('daycare')) return { tipo: 'DAYCARE', formato: 'INDIVIDUAL' };
  return { tipo: 'DAYCARE', formato: 'INDIVIDUAL' }; // Grupo Burbuja u otros → nota
}
function contarNinos(s) {
  if (!s) return 1;
  const p = norm(s).split(/[/,]+|\by\b/).map((x) => x.trim()).filter((x) => x.length >= 2);
  return Math.min(8, Math.max(1, p.length));
}

async function main() {
  console.log(`\n=== Importación histórico Qro — ${APLICAR ? 'APLICAR (escribe)' : 'DRY-RUN (no escribe)'} ===`);
  console.log(`Filas en el archivo: ${datos.length}\n`);

  // 1) Nannies activas de Querétaro (para ligar por nombre de pila).
  const nanniesQro = await prisma.nannie.findMany({
    where: { plaza: 'QUERETARO' },
    select: { id: true, nombre: true },
  });
  const nanniePorToken = new Map(); // primer token → [ids]
  for (const n of nanniesQro) {
    const tok = norm(n.nombre).split(' ')[0];
    if (!nanniePorToken.has(tok)) nanniePorToken.set(tok, []);
    nanniePorToken.get(tok).push({ id: n.id, nombre: n.nombre });
  }
  const ligaNannie = (cubrio) => {
    const tok = norm(cubrio).split(/[/,\s]+/)[0];
    const cand = nanniePorToken.get(tok);
    return cand && cand.length === 1 ? cand[0] : null; // solo si es inequívoca
  };

  // 2) Agrupar filas por familia y resolver el destino (ligar vs crear).
  const grupos = new Map(); // famKey → { nombre, ninos:Set, filas:[] }
  for (const r of datos) {
    const k = famKey(r.mama);
    if (!grupos.has(k)) grupos.set(k, { nombre: r.mama || '(Sin nombre)', ninos: new Set(), filas: [] });
    const g = grupos.get(k);
    if (r.mama && r.mama.length > g.nombre.length) g.nombre = r.mama;
    if (r.ninos) g.ninos.add(r.ninos);
    g.filas.push(r);
  }

  const familiaIdPorKey = new Map();
  let ligadas = 0;
  let creadas = 0;

  console.log('--- Familias ---');
  for (const [k, g] of grupos) {
    const link = LINKS[k];
    if (link) {
      const existe = await prisma.familia.findUnique({ where: { id: link.id }, select: { id: true, nombreContacto: true, plaza: true } });
      if (existe) {
        familiaIdPorKey.set(k, existe.id);
        ligadas++;
        console.log(`  LIGAR   "${g.nombre}" → ${existe.nombreContacto} (${existe.id})${link.fixPlaza && existe.plaza !== 'QUERETARO' ? `  [corrige plaza ${existe.plaza}→QUERETARO]` : ''}`);
        if (APLICAR && link.fixPlaza && existe.plaza !== 'QUERETARO') {
          await prisma.familia.update({ where: { id: existe.id }, data: { plaza: 'QUERETARO' } });
        }
        continue;
      }
      console.log(`  (aviso) la familia a ligar ${link.id} no existe en esta base → se crea histórica`);
    }
    const id = `qrohist-fam-${slug(g.nombre)}`;
    familiaIdPorKey.set(k, id);
    creadas++;
    console.log(`  CREAR   "${g.nombre}" → ${id}`);
    if (APLICAR) {
      await prisma.familia.upsert({
        where: { id },
        update: {},
        create: { id, nombreContacto: g.nombre, plaza: 'QUERETARO', zona: 'Histórica' },
      });
    }
  }

  // 3) Servicios + finanzas.
  console.log('\n--- Servicios ---');
  const porAnio = {};
  let ligadosNannie = 0;
  let sinNannie = 0;
  for (const r of datos) {
    const { tipo, formato } = mapTipo(r.tipoRaw);
    const familiaId = familiaIdPorKey.get(famKey(r.mama));
    const nan = ligaNannie(r.cubrio);
    if (nan) ligadosNannie++;
    else sinNannie++;
    const dur = Math.max(1, Math.round(r.horas ?? 1));
    const fecha = new Date(`${r.fecha}T00:00:00.000Z`);
    const nota =
      `Histórico Qro ${r.ref}. Tipo: ${r.tipoRaw || '—'}. Zona: ${r.zonaRaw || '—'}. ` +
      `Niño(s): ${r.ninos || '—'}. Cubrió: ${r.cubrio || '—'}${nan ? ' (ligada)' : ' (no en sistema)'}.`;
    const sid = `qrohist-serv-${r.ref}`;

    const y = r.fecha.slice(0, 4);
    porAnio[y] = porAnio[y] || { n: 0, costo: 0, pago: 0 };
    porAnio[y].n++;
    porAnio[y].costo += r.costo ?? 0;
    porAnio[y].pago += r.pago ?? 0;

    if (APLICAR) {
      await prisma.servicio.upsert({
        where: { id: sid },
        update: {
          familiaId,
          nannieId: nan?.id ?? null,
          plaza: 'QUERETARO',
          zona: r.zonaRaw || 'Histórica',
          tipoServicio: tipo,
          formato,
          numNinos: contarNinos(r.ninos),
          fecha,
          horaInicio: '00:00',
          horaFin: '00:00',
          duracionHoras: dur,
          estado: 'COMPLETADO',
          esHistorico: true,
          notaHistorica: nota,
          creadoEn: fecha,
          completadoEn: fecha,
        },
        create: {
          id: sid,
          familiaId,
          nannieId: nan?.id ?? null,
          plaza: 'QUERETARO',
          zona: r.zonaRaw || 'Histórica',
          tipoServicio: tipo,
          formato,
          numNinos: contarNinos(r.ninos),
          fecha,
          horaInicio: '00:00',
          horaFin: '00:00',
          duracionHoras: dur,
          estado: 'COMPLETADO',
          esHistorico: true,
          notaHistorica: nota,
          creadoEn: fecha,
          completadoEn: fecha,
        },
      });
      await prisma.finanzaServicio.upsert({
        where: { servicioId: sid },
        update: { cobroFamilia: r.costo ?? 0, pagoNannie: r.pago ?? null },
        create: { servicioId: sid, cobroFamilia: r.costo ?? 0, pagoNannie: r.pago ?? null },
      });
    }
  }

  console.log(`\nServicios: ${datos.length}  | nannie ligada: ${ligadosNannie}  | sin nannie (solo nombre): ${sinNannie}`);
  console.log('\n--- Cifras de control (por año) ---');
  for (const y of Object.keys(porAnio).sort()) {
    const a = porAnio[y];
    console.log(`  ${y}: ${a.n} serv | Costo ${red2(a.costo).toLocaleString('es-MX')} | Pago ${red2(a.pago).toLocaleString('es-MX')}`);
  }
  console.log(`\nFamilias: LIGAR ${ligadas} | CREAR ${creadas}`);
  console.log(APLICAR ? '\n✔ Aplicado.\n' : '\nDRY-RUN: no se escribió nada. Corre con "apply" para aplicar.\n');
}

main()
  .catch((e) => {
    console.error('\nERROR:', e.message, '\n');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
