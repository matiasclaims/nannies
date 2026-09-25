// Reporte de EMPAREJAMIENTO del histórico de Querétaro contra la base en vivo.
//
// SOLO LECTURA: no crea, no actualiza y no borra nada. Su único fin es decidir,
// antes de importar el histórico, qué familias históricas YA existen en el
// sistema (para LIGARLES sus servicios viejos, sin duplicar) y cuáles no (para
// CREARLAS como familias históricas). Empareja por nombre de contacto + nombre
// del niño (más confiable que solo el nombre de pila).
//
// Uso (en el VPS, desde /var/www/nannies/apps/api):
//   node scripts/qro-historico-match.mjs
//
import { readFileSync, existsSync } from 'node:fs';

// Carga DATABASE_URL desde .env (cwd = apps/api) si no viene ya en el entorno.
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  }
}

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

// Familias del histórico de Querétaro EN ALCANCE (2023/2024/2025; ya fusionada
// la variante Stef/Stefanía). La fila de 2026 (nelly) NO se importa: septiembre
// y julio-2026 se capturan a mano, por eso no se lista aquí.
const HIST = [
  { nombre: 'Stefanía', ninos: ['Antonella'] },
  { nombre: 'Paulina', ninos: ['Marcelo'] },
  { nombre: 'Claudia Cortés', ninos: ['Amaia y Begoña'] },
  { nombre: 'Maggie', ninos: [] },
  { nombre: 'Lorena', ninos: ['Sam', 'Samantha'] },
  { nombre: 'Regina', ninos: ['Luciana'] },
  { nombre: 'Lenny', ninos: ['Rodrigo'] },
  { nombre: 'Victoria', ninos: ['Victor', 'Víctor'] },
  { nombre: '(Sin nombre)', ninos: [] },
  { nombre: 'Lesly', ninos: [] },
  { nombre: 'Mariana', ninos: ['Nico'] },
  { nombre: 'Paola', ninos: [] },
  { nombre: 'Luz', ninos: [] },
  { nombre: 'Carolina', ninos: ['Max'] },
  { nombre: 'Priscila', ninos: ['Emilio'] },
  { nombre: 'Roxana', ninos: [] },
  { nombre: 'Evelyn Urrutia', ninos: ['Gemelosb'] },
];

const norm = (s) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// Tokens de nombre útiles (descarta conectores y palabras muy cortas).
const tokens = (s) =>
  norm(s)
    .split(/[\s/,+]+|\by\b/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);

// ¿Dos nombres de pila coinciden? Igualdad o prefijo (Sam ~ Samantha).
const casan = (a, b) => a === b || a.startsWith(b) || b.startsWith(a);

// ¿Algún token de A casa con algún token de B?
function tokensCasan(as, bs) {
  const A = as.flatMap(tokens);
  const B = bs.flatMap(tokens);
  return A.some((a) => B.some((b) => casan(a, b)));
}

async function main() {
  const familias = await prisma.familia.findMany({
    where: { plaza: 'QUERETARO' },
    select: {
      id: true,
      nombreContacto: true,
      apellido: true,
      ninos: { select: { nombre: true } },
    },
    orderBy: { nombreContacto: 'asc' },
  });

  console.log(`\nFamilias de Querétaro en la base (en vivo): ${familias.length}`);
  console.log('='.repeat(70));

  let ligar = 0;
  let crear = 0;

  for (const h of HIST) {
    const hNombre = [h.nombre];
    const candidatos = familias
      .map((f) => {
        const nombreCasa = tokensCasan(hNombre, [f.nombreContacto]);
        const ninosF = f.ninos.map((n) => n.nombre);
        const ninoCasa = h.ninos.length > 0 && ninosF.length > 0 && tokensCasan(h.ninos, ninosF);
        let score = 0;
        if (nombreCasa) score += 2;
        if (ninoCasa) score += 2;
        return { f, nombreCasa, ninoCasa, score };
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score);

    const ninosTxt = h.ninos.length ? ` (niño: ${h.ninos.join(' / ')})` : '';
    console.log(`\n• ${h.nombre}${ninosTxt}`);

    if (candidatos.length === 0) {
      console.log('    → sin coincidencia          [CREAR histórica]');
      crear++;
      continue;
    }

    for (const c of candidatos) {
      const ninosF = c.f.ninos.map((n) => n.nombre).join(', ') || '—';
      const fuerza = c.nombreCasa && c.ninoCasa ? 'FUERTE (nombre+niño)' : c.nombreCasa ? 'nombre' : 'niño';
      const marca = c.nombreCasa && c.ninoCasa ? '[LIGAR]' : '[REVISAR]';
      const apellido = c.f.apellido ? ` ${c.f.apellido}` : '';
      console.log(
        `    → coincidencia ${fuerza}: "${c.f.nombreContacto}${apellido}" (niños: ${ninosF}) id=${c.f.id}  ${marca}`,
      );
    }
    if (candidatos[0].nombreCasa && candidatos[0].ninoCasa) ligar++;
    else crear++; // por defecto se crea salvo que confirmes ligar la de [REVISAR]
  }

  console.log('\n' + '='.repeat(70));
  console.log(`Resumen tentativo: LIGAR ${ligar}  |  CREAR ${crear}  (de ${HIST.length} familias históricas)`);
  console.log('Las marcadas [REVISAR] necesitan tu confirmación (coincidencia parcial).');
  console.log('Este script NO escribió nada en la base.\n');
}

main()
  .catch((e) => {
    console.error('\nERROR:', e.message, '\n');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
