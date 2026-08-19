import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { reglaPorNumero } from './incidencias.catalogo';
import { PILARES, INCIDENCIA_PILAR, calificacionPonderada, type ClavePilar } from './evaluaciones.catalogo';
import { GuardarEvaluacionDto } from './dto/guardar-evaluacion.dto';

/** Domingo (inicio de semana) de una fecha, en UTC. */
function domingoDe(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - x.getUTCDay());
  return x;
}

/** M4 · Evaluación de desempeño de nannies (coordinación, semanal). */
@Injectable()
export class EvaluacionesService {
  constructor(private readonly prisma: PrismaService) {}

  pilares() {
    return PILARES;
  }

  /** Datos de la semana: la evaluación (si existe), las incidencias de esa
   *  semana mapeadas a su pilar (para la "merma") y el histórico reciente. */
  async deNannie(nannieId: string, semanaISO?: string) {
    const nannie = await this.prisma.nannie.findUnique({ where: { id: nannieId }, select: { id: true } });
    if (!nannie) throw new NotFoundException('Nannie no encontrada');

    const semana = semanaISO ? new Date(`${semanaISO}T00:00:00.000Z`) : domingoDe(new Date());
    const gte = semana;
    const lte = new Date(semana);
    lte.setUTCDate(lte.getUTCDate() + 6);
    lte.setUTCHours(23, 59, 59, 999);

    const ev = await this.prisma.evaluacionNannie.findUnique({
      where: { nannieId_semana: { nannieId, semana } },
    });

    const incs = await this.prisma.incidencia.findMany({
      where: { nannieId, fecha: { gte, lte }, estado: { not: 'DESCARTADA' } },
      orderBy: { fecha: 'asc' },
    });
    const incidenciasSemana = incs
      .map((i) => {
        const r = reglaPorNumero(i.regla);
        if (!r || r.noCulposa) return null; // las justificadas no merman
        return {
          id: i.id,
          situacion: r.situacion,
          fecha: i.fecha.toISOString().slice(0, 10),
          pilar: (INCIDENCIA_PILAR[i.regla] ?? null) as ClavePilar | null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const historialRaw = await this.prisma.evaluacionNannie.findMany({
      where: { nannieId },
      orderBy: { semana: 'desc' },
      take: 12,
    });
    const historial = historialRaw.map((e) => ({
      semana: e.semana.toISOString().slice(0, 10),
      calificacion: Number(e.calificacion),
    }));

    return {
      semana: semana.toISOString().slice(0, 10),
      evaluacion: ev
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
        : null,
      incidenciasSemana,
      historial,
    };
  }

  async guardar(nannieId: string, dto: GuardarEvaluacionDto, evaluadaPor: string) {
    const nannie = await this.prisma.nannie.findUnique({ where: { id: nannieId }, select: { id: true } });
    if (!nannie) throw new NotFoundException('Nannie no encontrada');

    const semana = new Date(`${dto.semana}T00:00:00.000Z`);
    if (semana.getUTCDay() !== 0) {
      throw new BadRequestException('La semana debe iniciar en domingo.');
    }
    const notas: Record<ClavePilar, number> = {
      atencionInfantil: dto.atencionInfantil,
      cumplimientoServicio: dto.cumplimientoServicio,
      comunicacion: dto.comunicacion,
      profesionalismo: dto.profesionalismo,
      puntualidad: dto.puntualidad,
    };
    const calificacion = calificacionPonderada(notas);

    await this.prisma.evaluacionNannie.upsert({
      where: { nannieId_semana: { nannieId, semana } },
      update: { ...notas, calificacion, evaluadaPor, nota: dto.nota?.trim() || null },
      create: { nannieId, semana, ...notas, calificacion, evaluadaPor, nota: dto.nota?.trim() || null },
    });
    return { ok: true, calificacion };
  }
}
