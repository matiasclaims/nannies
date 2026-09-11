import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { reglaPorNumero } from './incidencias.catalogo';
import { PILARES, INCIDENCIA_PILAR, calificacionPonderada, type ClavePilar } from './evaluaciones.catalogo';
import { GuardarEvalCoordDto } from './dto/guardar-eval-coord.dto';

const ACTIVAS_SESION = ['OFERTADO', 'ACEPTADO', 'COMPLETADO'] as const;

/** M4 (Paula 2026-09-03) · Evaluación de coordinación POR SERVICIO. Un servicio
 *  individual COMPLETADO = 1 evaluación; un paquete CONSUMIDO = 1 por cada nannie
 *  que lo cubrió. Puede quedar pendiente sin bloquear. Los cancelados no se evalúan. */
@Injectable()
export class EvaluacionCoordService {
  constructor(private readonly prisma: PrismaService) {}

  pilares() {
    return PILARES;
  }

  /** Bandeja de pendientes: individuales COMPLETADOS sin evaluar + paquetes
   *  CONSUMIDOS sin evaluar (por cada nannie que participó). */
  async pendientes() {
    const [individuales, paquetes] = await Promise.all([
      this.prisma.servicio.findMany({
        where: {
          formato: 'INDIVIDUAL',
          estado: 'COMPLETADO',
          nannieId: { not: null },
          evaluacionCoord: null,
          // Excluye el import histórico (COMPLETADO en bloque, nunca operado en
          // el sistema): no se evalúa. Ver historico-cuentas-excel (ids hs-/hp-).
          id: { not: { startsWith: 'hs-' } },
        },
        orderBy: { fecha: 'desc' },
        select: {
          id: true,
          fecha: true,
          tipoServicio: true,
          nannie: { select: { id: true, nombre: true } },
          familia: { select: { nombreContacto: true } },
        },
      }),
      this.prisma.paquete.findMany({
        where: { estado: 'CONSUMIDO', id: { not: { startsWith: 'hp-' } } },
        select: {
          id: true,
          horasTotales: true,
          fechaContratacion: true,
          familia: { select: { nombreContacto: true } },
          servicios: {
            where: { nannieId: { not: null }, estado: { in: [...ACTIVAS_SESION] } },
            select: { nannieId: true, nannie: { select: { nombre: true } } },
          },
          evaluacionesCoord: { select: { nannieId: true } },
        },
      }),
    ]);

    type ItemPendiente = {
      tipo: 'INDIVIDUAL' | 'PAQUETE';
      id: string;
      nannieId: string;
      nannie: string;
      familia: string;
      fecha: string;
      detalle: string;
    };
    const items: ItemPendiente[] = individuales.map((s) => ({
      tipo: 'INDIVIDUAL',
      id: s.id,
      nannieId: s.nannie!.id,
      nannie: s.nannie!.nombre,
      familia: s.familia.nombreContacto,
      fecha: s.fecha.toISOString().slice(0, 10),
      detalle: s.tipoServicio as string,
    }));

    for (const p of paquetes) {
      const evaluadas = new Set(p.evaluacionesCoord.map((e) => e.nannieId));
      const porNannie = new Map<string, string>();
      for (const s of p.servicios) if (s.nannieId) porNannie.set(s.nannieId, s.nannie!.nombre);
      for (const [nannieId, nombre] of porNannie) {
        if (evaluadas.has(nannieId)) continue;
        items.push({
          tipo: 'PAQUETE',
          id: p.id,
          nannieId,
          nannie: nombre,
          familia: p.familia.nombreContacto,
          fecha: p.fechaContratacion.toISOString().slice(0, 10),
          detalle: `Paquete ${p.horasTotales} h`,
        });
      }
    }

    items.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
    return { total: items.length, pendientes: items };
  }

  /** Incidencias (culposas) de una nannie en un rango, mapeadas a su pilar, para
   *  orientar la "merma" al evaluar (igual criterio que la semanal). */
  private async mermaIncidencias(nannieId: string, gte: Date, lte: Date) {
    const incs = await this.prisma.incidencia.findMany({
      where: { nannieId, fecha: { gte, lte }, estado: { not: 'DESCARTADA' } },
      orderBy: { fecha: 'asc' },
    });
    return incs
      .map((i) => {
        const r = reglaPorNumero(i.regla);
        if (!r || r.noCulposa) return null;
        return {
          id: i.id,
          situacion: r.situacion,
          fecha: i.fecha.toISOString().slice(0, 10),
          pilar: (INCIDENCIA_PILAR[i.regla] ?? null) as ClavePilar | null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  private mapEval(ev: {
    atencionInfantil: number;
    cumplimientoServicio: number;
    comunicacion: number;
    profesionalismo: number;
    puntualidad: number;
    calificacion: unknown;
    evaluadaPor: string;
    nota: string | null;
  } | null) {
    return ev
      ? {
          atencionInfantil: ev.atencionInfantil,
          cumplimientoServicio: ev.cumplimientoServicio,
          comunicacion: ev.comunicacion,
          profesionalismo: ev.profesionalismo,
          puntualidad: ev.puntualidad,
          calificacion: Number(ev.calificacion),
          evaluadaPor: ev.evaluadaPor,
          nota: ev.nota,
        }
      : null;
  }

  /** Detalle para evaluar un servicio INDIVIDUAL. */
  async deServicio(servicioId: string) {
    const s = await this.prisma.servicio.findUnique({
      where: { id: servicioId },
      include: {
        nannie: { select: { id: true, nombre: true } },
        familia: { select: { nombreContacto: true } },
        evaluacionCoord: true,
      },
    });
    if (!s) throw new NotFoundException('Servicio no encontrado');
    if (s.formato !== 'INDIVIDUAL' || s.estado !== 'COMPLETADO' || !s.nannie) {
      throw new BadRequestException('Este servicio no es evaluable.');
    }
    const dia = new Date(s.fecha);
    const fin = new Date(dia);
    fin.setUTCHours(23, 59, 59, 999);
    return {
      tipo: 'INDIVIDUAL' as const,
      id: s.id,
      nannieId: s.nannie.id,
      nannie: s.nannie.nombre,
      familia: s.familia.nombreContacto,
      fecha: s.fecha.toISOString().slice(0, 10),
      detalle: s.tipoServicio as string,
      incidencias: await this.mermaIncidencias(s.nannie.id, dia, fin),
      evaluacion: this.mapEval(s.evaluacionCoord),
    };
  }

  /** Detalle para evaluar a UNA nannie por un PAQUETE consumido. */
  async dePaquete(paqueteId: string, nannieId: string) {
    const p = await this.prisma.paquete.findUnique({
      where: { id: paqueteId },
      include: {
        familia: { select: { nombreContacto: true } },
        servicios: {
          where: { nannieId, estado: { in: [...ACTIVAS_SESION] } },
          orderBy: { fecha: 'asc' },
          select: { fecha: true },
        },
        evaluacionesCoord: { where: { nannieId } },
      },
    });
    if (!p) throw new NotFoundException('Paquete no encontrado');
    if (p.servicios.length === 0) throw new BadRequestException('Esta nannie no cubrió sesiones de este paquete.');
    const nannie = await this.prisma.nannie.findUnique({ where: { id: nannieId }, select: { nombre: true } });
    const gte = new Date(p.servicios[0].fecha);
    const lte = new Date(p.servicios[p.servicios.length - 1].fecha);
    lte.setUTCHours(23, 59, 59, 999);
    return {
      tipo: 'PAQUETE' as const,
      id: p.id,
      nannieId,
      nannie: nannie?.nombre ?? '',
      familia: p.familia.nombreContacto,
      fecha: p.fechaContratacion.toISOString().slice(0, 10),
      detalle: `Paquete ${p.horasTotales} h · ${p.servicios.length} sesiones`,
      incidencias: await this.mermaIncidencias(nannieId, gte, lte),
      evaluacion: this.mapEval(p.evaluacionesCoord[0] ?? null),
    };
  }

  private notas(dto: GuardarEvalCoordDto) {
    const notas: Record<ClavePilar, number> = {
      atencionInfantil: dto.atencionInfantil,
      cumplimientoServicio: dto.cumplimientoServicio,
      comunicacion: dto.comunicacion,
      profesionalismo: dto.profesionalismo,
      puntualidad: dto.puntualidad,
    };
    return { notas, calificacion: calificacionPonderada(notas) };
  }

  async guardarServicio(servicioId: string, dto: GuardarEvalCoordDto, evaluadaPor: string) {
    const s = await this.prisma.servicio.findUnique({
      where: { id: servicioId },
      select: { nannieId: true, formato: true, estado: true },
    });
    if (!s) throw new NotFoundException('Servicio no encontrado');
    if (s.formato !== 'INDIVIDUAL' || s.estado !== 'COMPLETADO' || !s.nannieId) {
      throw new BadRequestException('Este servicio no es evaluable.');
    }
    const { notas, calificacion } = this.notas(dto);
    await this.prisma.evaluacionCoordServicio.upsert({
      where: { servicioId },
      update: { ...notas, calificacion, evaluadaPor, nota: dto.nota?.trim() || null },
      create: { servicioId, nannieId: s.nannieId, ...notas, calificacion, evaluadaPor, nota: dto.nota?.trim() || null },
    });
    return { ok: true, calificacion };
  }

  async guardarPaquete(paqueteId: string, nannieId: string, dto: GuardarEvalCoordDto, evaluadaPor: string) {
    const cubrio = await this.prisma.servicio.count({
      where: { paqueteId, nannieId, estado: { in: [...ACTIVAS_SESION] } },
    });
    if (cubrio === 0) throw new BadRequestException('Esta nannie no cubrió sesiones de este paquete.');
    const { notas, calificacion } = this.notas(dto);
    await this.prisma.evaluacionCoordServicio.upsert({
      where: { paqueteId_nannieId: { paqueteId, nannieId } },
      update: { ...notas, calificacion, evaluadaPor, nota: dto.nota?.trim() || null },
      create: { paqueteId, nannieId, ...notas, calificacion, evaluadaPor, nota: dto.nota?.trim() || null },
    });
    return { ok: true, calificacion };
  }

  /** Historial de evaluaciones por servicio de una nannie (para su ficha). */
  async historialNannie(nannieId: string) {
    const evs = await this.prisma.evaluacionCoordServicio.findMany({
      where: { nannieId },
      orderBy: { creadoEn: 'desc' },
      take: 60,
      include: {
        servicio: { select: { fecha: true, tipoServicio: true, familia: { select: { nombreContacto: true } } } },
        paquete: { select: { horasTotales: true, fechaContratacion: true, familia: { select: { nombreContacto: true } } } },
      },
    });
    return evs.map((e) => ({
      id: e.id,
      tipo: e.servicioId ? ('INDIVIDUAL' as const) : ('PAQUETE' as const),
      fecha: (e.servicio?.fecha ?? e.paquete?.fechaContratacion ?? e.creadoEn).toISOString().slice(0, 10),
      familia: e.servicio?.familia.nombreContacto ?? e.paquete?.familia.nombreContacto ?? '',
      detalle: e.servicio ? (e.servicio.tipoServicio as string) : `Paquete ${e.paquete?.horasTotales ?? ''} h`,
      calificacion: Number(e.calificacion),
      evaluadaPor: e.evaluadaPor,
      nota: e.nota,
    }));
  }
}
