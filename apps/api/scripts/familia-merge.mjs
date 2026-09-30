// Homologa (fusiona) dos familias: mueve TODO lo de la familia ORIGEN (paquetes,
// servicios, niños, notas) a la familia DESTINO y borra la origen. NO modifica lo
// que la destino ya tenía. Dry-run por defecto.
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/familia-merge.mjs --origen "Dany candelas" --destino "Daniela Candelas y Marcos Solache"
//   ...agrega --apply para aplicar. Puedes pasar un id de familia en vez del nombre.
//
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}
const args = process.argv.slice(2);
const APLICAR = args.includes('--apply');
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const qOrigen = val('--origen'); const qDestino = val('--destino');
if (!qOrigen || !qDestino) { console.error('\nUso: node scripts/familia-merge.mjs --origen "<nombre|id>" --destino "<nombre|id>" [--apply]\n'); process.exit(1); }

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

async function resolver(q) {
  // Por id exacto primero; si no, por nombre (contains, único).
  const porId = await prisma.familia.findUnique({ where: { id: q }, select: { id: true, nombreContacto: true, apellido: true, plaza: true } }).catch(() => null);
  if (porId) return porId;
  const fams = await prisma.familia.findMany({
    where: { OR: [{ nombreContacto: { contains: q, mode: 'insensitive' } }, { apellido: { contains: q, mode: 'insensitive' } }] },
    select: { id: true, nombreContacto: true, apellido: true, plaza: true },
  });
  if (fams.length === 0) throw new Error(`No hay familia que coincida con "${q}".`);
  if (fams.length > 1) throw new Error(`"${q}" coincide con varias: ${fams.map((f) => [f.nombreContacto, f.apellido].filter(Boolean).join(' ') + ' (' + f.id + ')').join(' | ')}. Usa el id.`);
  return fams[0];
}

let origen, destino;
try { origen = await resolver(qOrigen); destino = await resolver(qDestino); }
catch (e) { console.error(`\n✗ ${e.message}\n`); await prisma.$disconnect(); process.exit(1); }
if (origen.id === destino.id) { console.error('\n✗ Origen y destino son la misma familia.\n'); await prisma.$disconnect(); process.exit(1); }

const nom = (f) => [f.nombreContacto, f.apellido].filter(Boolean).join(' ');
const [nPaq, nServ, nNin, nNot] = await Promise.all([
  prisma.paquete.count({ where: { familiaId: origen.id } }),
  prisma.servicio.count({ where: { familiaId: origen.id } }),
  prisma.nino.count({ where: { familiaId: origen.id } }),
  prisma.notaFamilia.count({ where: { familiaId: origen.id } }),
]);

console.log(`\nMERGE de familias`);
console.log(`  ORIGEN  (se mueve y se borra): ${nom(origen)}  [${origen.id}]`);
console.log(`  DESTINO (se conserva):         ${nom(destino)}  [${destino.id}]`);
console.log(`  Se mueven de origen -> destino: ${nPaq} paquetes, ${nServ} servicios, ${nNin} niños, ${nNot} notas.`);
if (origen.plaza !== destino.plaza) console.log(`  ⚠ Plazas distintas: origen=${origen.plaza} destino=${destino.plaza}. Revisa que sea correcto.`);

if (!APLICAR) { console.log('\n(DRY-RUN. Nada se movió ni borró. Agrega --apply para aplicar.)\n'); await prisma.$disconnect(); process.exit(0); }

await prisma.$transaction(async (tx) => {
  await tx.paquete.updateMany({ where: { familiaId: origen.id }, data: { familiaId: destino.id } });
  await tx.servicio.updateMany({ where: { familiaId: origen.id }, data: { familiaId: destino.id } });
  await tx.nino.updateMany({ where: { familiaId: origen.id }, data: { familiaId: destino.id } });
  await tx.notaFamilia.updateMany({ where: { familiaId: origen.id }, data: { familiaId: destino.id } });
  await tx.familia.delete({ where: { id: origen.id } });
});
console.log(`\n✔ Movidos ${nPaq} paquetes y ${nServ} servicios (+${nNin} niños, ${nNot} notas) a "${nom(destino)}". Familia "${nom(origen)}" borrada.\n`);
await prisma.$disconnect();
