// Busca familias por texto (solo lectura). Uso:
//   node scripts/buscar-familias.mjs karina eliss prendes viruega
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const norm = (s) => (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const terms = (process.argv.slice(2).length ? process.argv.slice(2) : ['karina', 'eliss', 'elisa', 'prendes', 'viruega']).map(norm);
const fams = await prisma.familia.findMany({ select: { id: true, nombreContacto: true, apellido: true, plaza: true, estado: true } });
console.log(`\nFamilias que contienen: ${terms.join(', ')}\n`);
for (const f of fams) {
  const hay = norm(`${f.nombreContacto} ${f.apellido ?? ''}`);
  if (terms.some((t) => hay.includes(t))) {
    const hist = f.id.startsWith('histfam-') || f.id.startsWith('hist-') ? ' [HISTÓRICA]' : '';
    console.log(`  "${f.nombreContacto}${f.apellido ? ' ' + f.apellido : ''}" · ${f.plaza} · ${f.estado} · ${f.id}${hist}`);
  }
}
console.log('');
await prisma.$disconnect();
