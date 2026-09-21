import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function prom(nums: number[]): number | null {
  return nums.length ? Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10 : null;
}

/** Datos que la NANNIE ve de sí misma en su Panorama (M7 · vista nannie). */
@Injectable()
export class MiPanoramaService {
  constructor(private readonly prisma: PrismaService) {}

  async para(nannieId: string | null | undefined) {
    if (!nannieId) throw new ForbiddenException('Solo las nannies tienen panorama personal.');
    const ahora = new Date();
    const y = ahora.getUTCFullYear();
    const m = ahora.getUTCMonth();
    const inicioMes = new Date(Date.UTC(y, m, 1));
    const finMesExcl = new Date(Date.UTC(y, m + 1, 1));
    const inicio12 = new Date(Date.UTC(y, m - 11, 1)); // 12 meses hacia atrás

    const [nannie, serviciosMesActual, ofertasPendientes, serviciosHist, evalPapas, evalAgencia] = await Promise.all([
      this.prisma.nannie.findUnique({
        where: { id: nannieId },
        select: { nombre: true, foto: true, especialidad: true, rangoPermanente: true, nivelTarifaMesActual: true },
      }),
      this.prisma.servicio.findMany({
        where: { nannieId, fecha: { gte: inicioMes, lt: finMesExcl } },
        select: { estado: true, duracionHoras: true },
      }),
      // Ofertas por responder de CUALQUIER fecha (una oferta a futuro cuenta).
      this.prisma.servicio.count({ where: { nannieId, estado: 'OFERTADO' } }),
      // Servicios COMPLETADOS de los últimos 12 meses (para el histórico por mes/semana).
      this.prisma.servicio.findMany({
        where: { nannieId, estado: 'COMPLETADO', fecha: { gte: inicio12, lt: finMesExcl } },
        select: { fecha: true, duracionHoras: true },
      }),
      this.prisma.evaluacionServicio.findMany({
        where: { respondidoEn: { not: null }, servicio: { nannieId } },
        select: { calificacion: true },
      }),
      // Calificación de agencia = promedio de las evaluaciones POR SERVICIO
      // (Paula 2026-09-03; las semanales viejas quedan como histórico aparte).
      this.prisma.evaluacionCoordServicio.findMany({ where: { nannieId }, select: { calificacion: true } }),
    ]);

    const completadosMes = serviciosMesActual.filter((s) => s.estado === 'COMPLETADO');
    const horasMes = completadosMes.reduce((s, x) => s + x.duracionHoras, 0);
    const ofertas = ofertasPendientes;

    // Histórico por MES (12 meses)
    const buckMes = new Map<string, { mes: string; label: string; horas: number }>();
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(y, m - 11 + i, 1));
      buckMes.set(d.toISOString().slice(0, 7), { mes: d.toISOString().slice(0, 7), label: MESES[d.getUTCMonth()], horas: 0 });
    }
    // Histórico por SEMANA (últimas 8, dom-sáb)
    const hoy0 = new Date(Date.UTC(y, m, ahora.getUTCDate()));
    const domActual = new Date(hoy0);
    domActual.setUTCDate(hoy0.getUTCDate() - hoy0.getUTCDay()); // domingo de esta semana
    const buckSem: { semana: string; ini: number; horas: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const ini = new Date(domActual);
      ini.setUTCDate(domActual.getUTCDate() - i * 7);
      buckSem.push({ semana: `${ini.getUTCDate()}/${ini.getUTCMonth() + 1}`, ini: ini.getTime(), horas: 0 });
    }
    for (const s of serviciosHist) {
      const bm = buckMes.get(s.fecha.toISOString().slice(0, 7));
      if (bm) bm.horas += s.duracionHoras;
      const t = s.fecha.getTime();
      for (let i = buckSem.length - 1; i >= 0; i--) {
        if (t >= buckSem[i].ini) {
          buckSem[i].horas += s.duracionHoras;
          break;
        }
      }
    }

    return {
      nombre: nannie?.nombre ?? '',
      foto: nannie?.foto ?? null,
      especialidad: nannie?.especialidad ?? null,
      rangoPermanente: nannie?.rangoPermanente ?? 'BASE',
      nivelMes: nannie?.nivelTarifaMesActual ?? 'BASE',
      horasMes,
      serviciosMes: completadosMes.length,
      ofertas,
      calificacionPapas: { promedio: prom(evalPapas.map((e) => e.calificacion ?? 0)), total: evalPapas.length },
      calificacionAgencia: { promedio: prom(evalAgencia.map((e) => Number(e.calificacion))), total: evalAgencia.length },
      horasPorSemana: buckSem.map((b) => ({ semana: b.semana, horas: b.horas })),
      horasPorMes: [...buckMes.values()],
    };
  }

  /** Proyección de fechas de la nannie: sus servicios a futuro (confirmados y por
   *  responder), para ver/descargar su agenda de varios meses (paquetes largos). */
  async proyeccion(nannieId: string | null | undefined) {
    if (!nannieId) throw new ForbiddenException('Solo las nannies tienen agenda propia.');
    const ahora = new Date();
    const hoy = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));

    const [nannie, servicios] = await Promise.all([
      this.prisma.nannie.findUnique({ where: { id: nannieId }, select: { nombre: true } }),
      this.prisma.servicio.findMany({
        where: { nannieId, fecha: { gte: hoy }, estado: { in: ['ACEPTADO', 'OFERTADO'] } },
        orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
        select: {
          fecha: true,
          horaInicio: true,
          horaFin: true,
          tipoServicio: true,
          zona: true,
          direccion: true,
          estado: true,
          familia: { select: { nombreContacto: true } },
        },
      }),
    ]);

    return {
      nombre: nannie?.nombre ?? '',
      sesiones: servicios.map((s) => ({
        fecha: s.fecha.toISOString().slice(0, 10),
        horaInicio: s.horaInicio,
        horaFin: s.horaFin,
        tipoServicio: s.tipoServicio,
        familia: s.familia.nombreContacto,
        zona: s.zona,
        direccion: s.direccion ?? null,
        pendiente: s.estado === 'OFERTADO',
      })),
    };
  }

  /** Paquetes en los que la nannie tiene al menos una sesión asignada. Ve el
   *  avance (horas cubiertas/restantes) y el calendario de sesiones del paquete,
   *  con sus propias sesiones marcadas. NUNCA ve paquetes donde no participa ni
   *  el nombre de otras nannies. */
  async misPaquetes(nannieId: string | null | undefined) {
    if (!nannieId) throw new ForbiddenException('Solo las nannies tienen paquetes asignados.');

    const paquetes = await this.prisma.paquete.findMany({
      where: {
        estado: { not: 'CANCELADO' },
        servicios: { some: { nannieId, estado: { notIn: ['CANCELADO', 'RECHAZADO'] } } },
      },
      include: {
        familia: { select: { nombreContacto: true } },
        servicios: {
          where: { estado: { notIn: ['CANCELADO', 'RECHAZADO'] } },
          orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
          select: {
            fecha: true,
            horaInicio: true,
            horaFin: true,
            duracionHoras: true,
            tipoServicio: true,
            estado: true,
            nannieId: true,
          },
        },
      },
      orderBy: [{ estado: 'asc' }, { fechaContratacion: 'desc' }], // ACTIVO antes que CONSUMIDO
    });

    return paquetes.map((p) => ({
      paqueteId: p.id,
      familia: p.familia.nombreContacto,
      estado: p.estado,
      horasTotales: p.horasTotales,
      horasConsumidas: p.horasConsumidas,
      horasRestantes: p.horasTotales - p.horasConsumidas,
      sesiones: p.servicios.map((s) => ({
        fecha: s.fecha.toISOString().slice(0, 10),
        horaInicio: s.horaInicio,
        horaFin: s.horaFin,
        duracionHoras: s.duracionHoras,
        tipoServicio: s.tipoServicio,
        estado: s.estado,
        mia: s.nannieId === nannieId,
      })),
    }));
  }
}
