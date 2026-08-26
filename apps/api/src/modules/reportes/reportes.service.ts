import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { GuardarReporteDto } from './dto/guardar-reporte.dto';
import { reglaPorNumero } from '../nannies/incidencias.catalogo';

/** M6 · 6.1 — Reporte de servicio. La nannie deja UN reporte por servicio
 *  (actividades, ánimo del niño, incidentes, notas); coordinación lo lee. */
@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Carga el servicio y valida pertenencia: una NANNIE solo toca los suyos. */
  private async exigirServicio(servicioId: string, user: UsuarioAutenticado) {
    const servicio = await this.prisma.servicio.findUnique({
      where: { id: servicioId },
      select: { id: true, nannieId: true, estado: true },
    });
    if (!servicio) throw new NotFoundException('Servicio no encontrado');
    if (user.rol === 'NANNIE' && servicio.nannieId !== (user.nannieId ?? '__none__')) {
      throw new ForbiddenException('Solo puedes ver o escribir el reporte de tus propios servicios.');
    }
    return servicio;
  }

  /** Crea o actualiza el reporte de un servicio (upsert por servicioId). */
  async guardar(servicioId: string, dto: GuardarReporteDto, user: UsuarioAutenticado) {
    const servicio = await this.exigirServicio(servicioId, user);
    // Solo se reporta un servicio que se aceptó o completó (no ofertas/cancelados).
    if (servicio.estado !== 'ACEPTADO' && servicio.estado !== 'COMPLETADO') {
      throw new BadRequestException('Solo se puede reportar un servicio aceptado o completado.');
    }
    const datos = {
      actividades: dto.actividades.trim(),
      animoNino: dto.animoNino,
      incidentes: dto.incidentes?.trim() || null,
      notas: dto.notas?.trim() || null,
      autorNombre: user.nombre,
    };
    const reporte = await this.prisma.reporteServicio.upsert({
      where: { servicioId },
      create: { servicioId, ...datos },
      update: datos,
    });
    return { ok: true, id: reporte.id };
  }

  /** Reporte GENERAL (M6): una fila por nannie con su actividad del periodo —
   *  servicios y horas realizadas, calificación de papás, evaluación de agencia
   *  e incidencias. Coordinación lo consulta y lo exporta a PDF. */
  async general(desde: string, hasta: string) {
    const gte = new Date(`${desde}T00:00:00Z`);
    const lt = new Date(new Date(`${hasta}T00:00:00Z`).getTime() + 86_400_000); // hasta inclusive

    const [nannies, servicios, evalPapas, evalAgencia, incidencias] = await Promise.all([
      this.prisma.nannie.findMany({
        where: { estado: { in: ['ACTIVA', 'PRUEBA'] } },
        select: { id: true, nombre: true, color: true, estado: true },
      }),
      this.prisma.servicio.findMany({
        where: { fecha: { gte, lt }, nannieId: { not: null } },
        select: { nannieId: true, estado: true, duracionHoras: true },
      }),
      this.prisma.evaluacionServicio.findMany({
        where: { respondidoEn: { not: null }, servicio: { fecha: { gte, lt } } },
        select: { calificacion: true, servicio: { select: { nannieId: true } } },
      }),
      this.prisma.evaluacionNannie.findMany({
        where: { semana: { gte, lt } },
        select: { nannieId: true, calificacion: true },
      }),
      this.prisma.incidencia.findMany({
        where: { fecha: { gte, lt }, estado: { not: 'CONDONADA' } },
        select: { nannieId: true },
      }),
    ]);

    const acc = new Map(
      nannies.map((n) => [
        n.id,
        { nannieId: n.id, nombre: n.nombre, color: n.color, prueba: n.estado === 'PRUEBA', servicios: 0, horas: 0, pSum: 0, pN: 0, aSum: 0, aN: 0, incidencias: 0 },
      ]),
    );
    for (const s of servicios) {
      const g = s.nannieId ? acc.get(s.nannieId) : null;
      if (g && s.estado === 'COMPLETADO') {
        g.servicios++;
        g.horas += s.duracionHoras;
      }
    }
    for (const e of evalPapas) {
      const g = e.servicio.nannieId ? acc.get(e.servicio.nannieId) : null;
      if (g && e.calificacion != null) {
        g.pSum += e.calificacion;
        g.pN++;
      }
    }
    for (const e of evalAgencia) {
      const g = acc.get(e.nannieId);
      if (g) {
        g.aSum += Number(e.calificacion);
        g.aN++;
      }
    }
    for (const i of incidencias) {
      const g = acc.get(i.nannieId);
      if (g) g.incidencias++;
    }

    const prom = (sum: number, n: number) => (n ? Math.round((sum / n) * 10) / 10 : null);
    const filas = [...acc.values()]
      .map((g) => ({
        nannieId: g.nannieId,
        nombre: g.nombre,
        color: g.color,
        prueba: g.prueba,
        servicios: g.servicios,
        horas: g.horas,
        calificacionPapas: prom(g.pSum, g.pN),
        evaluacionPapasN: g.pN,
        evaluacionAgencia: prom(g.aSum, g.aN),
        incidencias: g.incidencias,
      }))
      .sort((a, b) => b.servicios - a.servicios || a.nombre.localeCompare(b.nombre));

    return {
      desde,
      hasta,
      totales: {
        servicios: filas.reduce((s, f) => s + f.servicios, 0),
        horas: filas.reduce((s, f) => s + f.horas, 0),
        incidencias: filas.reduce((s, f) => s + f.incidencias, 0),
      },
      nannies: filas,
    };
  }

  /** Reporte DETALLADO de una nannie en el periodo (M6 · Bloque 2): sus KPIs +
   *  reportes de servicio + evaluaciones de papás + incidencias + evaluación de
   *  agencia. Coordinación lo consulta y lo exporta a PDF. */
  async detalleNannie(nannieId: string, desde: string, hasta: string) {
    const gte = new Date(`${desde}T00:00:00Z`);
    const lt = new Date(new Date(`${hasta}T00:00:00Z`).getTime() + 86_400_000);
    const nannie = await this.prisma.nannie.findUnique({
      where: { id: nannieId },
      select: { id: true, nombre: true, color: true, estado: true, especialidad: true },
    });
    if (!nannie) throw new NotFoundException('Nannie no encontrada');

    const [servicios, reportes, evalPapas, incidencias, evalAgencia] = await Promise.all([
      this.prisma.servicio.findMany({ where: { nannieId, fecha: { gte, lt } }, select: { estado: true, duracionHoras: true } }),
      this.prisma.reporteServicio.findMany({
        where: { servicio: { nannieId, fecha: { gte, lt } } },
        include: { servicio: { select: { fecha: true, tipoServicio: true, familia: { select: { nombreContacto: true } } } } },
        orderBy: { servicio: { fecha: 'desc' } },
      }),
      this.prisma.evaluacionServicio.findMany({
        where: { respondidoEn: { not: null }, servicio: { nannieId, fecha: { gte, lt } } },
        include: { servicio: { select: { fecha: true, familia: { select: { nombreContacto: true } } } } },
        orderBy: { respondidoEn: 'desc' },
      }),
      this.prisma.incidencia.findMany({ where: { nannieId, fecha: { gte, lt } }, orderBy: { fecha: 'desc' } }),
      this.prisma.evaluacionNannie.findMany({ where: { nannieId, semana: { gte, lt } }, orderBy: { semana: 'desc' } }),
    ]);

    const completados = servicios.filter((s) => s.estado === 'COMPLETADO');
    const horas = completados.reduce((s, x) => s + x.duracionHoras, 0);
    const papas = evalPapas.map((e) => e.calificacion).filter((n): n is number => n != null);
    const promPapas = papas.length ? Math.round((papas.reduce((s, n) => s + n, 0) / papas.length) * 10) / 10 : null;
    const ag = evalAgencia.map((e) => Number(e.calificacion));
    const promAg = ag.length ? Math.round((ag.reduce((s, n) => s + n, 0) / ag.length) * 10) / 10 : null;

    return {
      desde,
      hasta,
      nannie: { id: nannie.id, nombre: nannie.nombre, color: nannie.color, prueba: nannie.estado === 'PRUEBA', especialidad: nannie.especialidad },
      kpis: {
        servicios: completados.length,
        horas,
        calificacionPapas: promPapas,
        evaluacionPapasN: papas.length,
        evaluacionAgencia: promAg,
        incidencias: incidencias.filter((i) => i.estado !== 'CONDONADA').length,
      },
      reportes: reportes.map((r) => ({
        familia: r.servicio.familia.nombreContacto,
        fecha: r.servicio.fecha.toISOString().slice(0, 10),
        tipoServicio: r.servicio.tipoServicio,
        actividades: r.actividades,
        animoNino: r.animoNino,
        incidentes: r.incidentes,
        notas: r.notas,
      })),
      evaluacionesPapas: evalPapas.map((e) => ({
        familia: e.servicio.familia.nombreContacto,
        fecha: e.servicio.fecha.toISOString().slice(0, 10),
        calificacion: e.calificacion,
        volveriaContratar: e.volveriaContratar,
        comentario: e.comentario,
      })),
      incidencias: incidencias.map((i) => ({
        situacion: reglaPorNumero(i.regla)?.situacion ?? `Regla ${i.regla}`,
        fecha: i.fecha.toISOString().slice(0, 10),
        nota: i.nota,
        condonada: i.estado === 'CONDONADA',
      })),
      evaluacionesAgencia: evalAgencia.map((e) => ({
        semana: e.semana.toISOString().slice(0, 10),
        calificacion: Number(e.calificacion),
        nota: e.nota,
      })),
    };
  }

  /** Lee el reporte de un servicio (null si aún no existe). */
  async deServicio(servicioId: string, user: UsuarioAutenticado) {
    await this.exigirServicio(servicioId, user);
    const r = await this.prisma.reporteServicio.findUnique({ where: { servicioId } });
    if (!r) return null;
    return {
      actividades: r.actividades,
      animoNino: r.animoNino,
      incidentes: r.incidentes,
      notas: r.notas,
      autor: r.autorNombre,
      fecha: r.actualizadoEn.toISOString().slice(0, 10),
    };
  }
}
