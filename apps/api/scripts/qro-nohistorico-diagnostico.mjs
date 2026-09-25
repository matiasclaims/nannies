// Diagnóstico (SOLO LECTURA): ¿de quién son los servicios NO históricos con
// plaza=QUERETARO? Sirve para detectar si al reclasificar una familia (p.ej.
// Paulina Best) se arrastraron servicios que en realidad eran de Toluca.
// No escribe nada.
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/qro-nohistorico-diagnostico.mjs
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

async function main() {
  const servs = await prisma.servicio.findMany({
    where: { plaza: 'QUERETARO', esHistorico: false },
    select: {
      fecha: true, estado: true, duracionHoras: true,
      familia: { select: { id: true, nombreContacto: true, plaza: true } },
    },
  });
  console.log(`\nServicios NO históricos con plaza=QUERETARO: ${servs.length}\n`);

  // Agrupar por familia.
  const porFam = new Map();
  for (const s of servs) {
    const key = s.familia?.id ?? 'sin-familia';
    const g = porFam.get(key) ?? {
      nombre: s.familia?.nombreContacto ?? '—',
      famPlaza: s.familia?.plaza ?? '—',
      n: 0, horas: 0, anios: new Set(),
    };
    g.n++; g.horas += s.duracionHoras; g.anios.add(s.fecha.getUTCFullYear());
    porFam.set(key, g);
  }
  console.log('--- Por familia (n serv / horas / años / plaza de la familia) ---');
  for (const [id, g] of [...porFam.entries()].sort((a, b) => b[1].n - a[1].n)) {
    console.log(`  ${String(g.n).padStart(3)} serv  ${String(g.horas).padStart(4)} h  años:[${[...g.anios].sort().join(',')}]  fam="${g.nombre}" (plaza ${g.famPlaza})  id=${id}`);
  }
  console.log('');
}

main()
  .catch((e) => { console.error('\nERROR:', e.message, '\n'); process.exit(1); })
  .finally(() => prisma.$disconnect());
