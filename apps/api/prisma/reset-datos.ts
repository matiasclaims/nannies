/**
 * Reseteo de datos operativos: deja el sistema "como nuevo" pero CONSERVA las
 * cuentas de acceso (usuarios) y los perfiles de nannies.
 *
 * Borra (agenda + nómina/finanzas + incidencias + familias):
 *   finanzas_servicio, ofertas_respuesta, servicios, paquetes, bonos,
 *   nomina_pagos, cierres de mes, incidencias, disponibilidad,
 *   notas_familia, ninos, familias.
 * Reinicia en cada nannie: serviciosAcumulados=0, rango=BASE, nivel=BASE.
 *
 * Uso (desde apps/api, apunta a la BD de DATABASE_URL — por defecto la LOCAL):
 *   npx ts-node prisma/reset-datos.ts
 */
import { PrismaClient, NivelTarifa, RangoPermanente } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  const destino = /localhost|127\.0\.0\.1/.test(url) ? 'LOCAL' : 'REMOTA';
  console.log(`Reseteando datos en BD ${destino}…`);

  const r = await prisma.$transaction(async (tx) => {
    // Orden respetando llaves foráneas (hijos antes que padres).
    const finanzas = await tx.finanzaServicio.deleteMany();
    const ofertas = await tx.ofertaRespuesta.deleteMany();
    const servicios = await tx.servicio.deleteMany();
    const paquetes = await tx.paquete.deleteMany();
    const bonos = await tx.bono.deleteMany();
    const nomina = await tx.nominaPago.deleteMany();
    const cierres = await tx.cierreMes.deleteMany();
    const incidencias = await tx.incidencia.deleteMany();
    const disponibilidad = await tx.disponibilidad.deleteMany();
    const notas = await tx.notaFamilia.deleteMany();
    const ninos = await tx.nino.deleteMany();
    const familias = await tx.familia.deleteMany();

    // Perfiles de nannies: se conservan, pero se reinician sus contadores.
    const nannies = await tx.nannie.updateMany({
      data: {
        serviciosAcumulados: 0,
        rangoPermanente: RangoPermanente.BASE,
        nivelTarifaMesActual: NivelTarifa.BASE,
      },
    });

    return {
      finanzas: finanzas.count,
      ofertas: ofertas.count,
      servicios: servicios.count,
      paquetes: paquetes.count,
      bonos: bonos.count,
      nomina: nomina.count,
      cierres: cierres.count,
      incidencias: incidencias.count,
      disponibilidad: disponibilidad.count,
      notas: notas.count,
      ninos: ninos.count,
      familias: familias.count,
      nanniesReiniciadas: nannies.count,
    };
  });

  const usuarios = await prisma.usuario.count();
  const nanniesVivas = await prisma.nannie.count();

  console.log('Borrado:');
  console.table(r);
  console.log(`Conservados → usuarios: ${usuarios} · perfiles de nannies: ${nanniesVivas}`);
  console.log('Listo. Agenda y nómina en cero; perfiles intactos.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
