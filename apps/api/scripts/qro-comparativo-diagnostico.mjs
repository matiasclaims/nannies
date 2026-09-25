// Diagnóstico (SOLO LECTURA) del comparativo anual de Querétaro.
// La gráfica "Horas cubiertas por mes (comparativo por año)" suma SOLO servicios
// COMPLETADO, separados por plaza. Aquí vemos, para Querétaro, cuántos servicios
// hay por año y por estado (para saber por qué no aparece). No escribe nada.
//
// Uso (VPS, desde /var/www/nannies/apps/api):
//   node scripts/qro-comparativo-diagnostico.mjs
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
  const hist = await prisma.servicio.count({ where: { esHistorico: true } });
  console.log(`\nServicios históricos (esHistorico=true) en total: ${hist}`);

  const qro = await prisma.servicio.findMany({
    where: { plaza: 'QUERETARO' },
    select: { fecha: true, estado: true, duracionHoras: true, esHistorico: true },
  });
  console.log(`Servicios con plaza=QUERETARO en total: ${qro.length}\n`);

  // Agrupado por año → estado → {n, horas}
  const porAnio = {};
  for (const s of qro) {
    const y = s.fecha.getUTCFullYear();
    porAnio[y] = porAnio[y] || {};
    porAnio[y][s.estado] = porAnio[y][s.estado] || { n: 0, horas: 0 };
    porAnio[y][s.estado].n++;
    porAnio[y][s.estado].horas += s.duracionHoras;
  }
  console.log('--- Querétaro por AÑO y ESTADO (n serv / horas) ---');
  for (const y of Object.keys(porAnio).sort()) {
    console.log(`  ${y}:`);
    for (const est of Object.keys(porAnio[y])) {
      const a = porAnio[y][est];
      console.log(`     ${est.padEnd(11)} ${String(a.n).padStart(3)} serv  ${String(a.horas).padStart(4)} h`);
    }
  }

  // Lo que la gráfica SÍ suma (COMPLETADO), por año, últimos 3 años.
  const y = new Date().getUTCFullYear();
  console.log('\n--- Lo que la gráfica muestra hoy (Querétaro, solo COMPLETADO) ---');
  for (const anio of [y - 2, y - 1, y]) {
    const h = qro.filter((s) => s.estado === 'COMPLETADO' && s.fecha.getUTCFullYear() === anio)
      .reduce((a, s) => a + s.duracionHoras, 0);
    console.log(`  ${anio}: ${h} h`);
  }
  console.log('');
}

main()
  .catch((e) => { console.error('\nERROR:', e.message, '\n'); process.exit(1); })
  .finally(() => prisma.$disconnect());
