import { Injectable } from '@nestjs/common';
import { RangoPermanente } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CalendarioService } from '../calendario/calendario.service';
import { RecomendarDto } from './dto/recomendar.dto';
import { AsignarDto } from './dto/asignar.dto';

// Estados de servicio que "ocupan" a una nannie (para conflicto/carga).
const OCUPAN = ['ACEPTADO', 'OFERTADO', 'COMPLETADO'];
const RANGO_ORDEN: Record<RangoPermanente, number> = { BASE: 0, ROOKIE: 1, JUNIOR: 2, SENIOR: 3 };

// Tolerancia de recomendación: si no hay cobertura exacta, se considera a
// una nannie cuyo bloque quede hasta 1 h fuera en la entrada o la salida
// (petición de Paula). Se marca como "coincidencia aproximada".
const TOLERANCIA_MIN = 60;

export interface Candidata {
  nannieId: string;
  nombre: string;
  zonas: string[];
  rango: RangoPermanente;
  serviciosSemana: number;
  bloque: string; // "09:00–14:00"
  aproximada: boolean; // true = no cubre exacto, entró por tolerancia ±1h
  faltaInicioMin: number; // minutos que la nannie empieza tarde (0 si cubre)
  faltaFinMin: number; // minutos que la nannie termina antes (0 si cubre)
}

/**
 * M2 · Motor de asignación. NO tiene tabla propia: lee de M1 (disponibilidad,
 * servicios) y M4 (nivel), y el resultado lo escribe M1 (crea + oferta).
 * "El sistema recomienda; el humano decide" (override permanente).
 */
@Injectable()
export class AsignacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendario: CalendarioService,
  ) {}

  /**
   * Devuelve las nannies candidatas rankeadas para un servicio propuesto.
   * Filtros duros: zona + disponibilidad que cubra el horario + sin choque.
   * Ranking (inicial): equidad de carga (menos servicios la semana) + rango.
   * El ranking fino (historial, evaluaciones) se suma con M4/M5/M6.
   */
  async recomendar(dto: RecomendarDto): Promise<{ candidatas: Candidata[]; total: number }> {
    const fecha = fechaUTC(dto.fecha);
    const { desde, hasta } = rangoSemana(dto.fecha);
    const dia = dto.fecha;

    const [nannies, disp, servs] = await Promise.all([
      this.prisma.nannie.findMany({ where: { estado: { not: 'PAUSA' } } }),
      this.prisma.disponibilidad.findMany({ where: { fecha } }),
      this.prisma.servicio.findMany({ where: { fecha: { gte: desde, lte: hasta } } }),
    ]);

    const zona = norm(dto.zona);
    const candidatas: Candidata[] = [];

    for (const n of nannies) {
      // Zona compatible (por nombre; el criterio de radio lo definirá la clienta).
      if (!n.zonas.some((z) => norm(z) === zona)) continue;

      const susBloques = disp.filter((d) => d.nannieId === n.id);

      // Mejor bloque DISPONIBLE: se prefiere cobertura exacta; si no la hay,
      // se acepta un bloque que quede hasta 1 h fuera en entrada o salida.
      let mejor: { bloque: (typeof susBloques)[number]; faltaInicio: number; faltaFin: number } | null =
        null;
      for (const b of susBloques) {
        if (b.estado !== 'DISPONIBLE') continue;
        const faltaInicio = Math.max(0, aMin(b.horaInicio) - aMin(dto.horaInicio));
        const faltaFin = Math.max(0, aMin(dto.horaFin) - aMin(b.horaFin));
        if (faltaInicio > TOLERANCIA_MIN || faltaFin > TOLERANCIA_MIN) continue;
        if (!mejor || faltaInicio + faltaFin < mejor.faltaInicio + mejor.faltaFin) {
          mejor = { bloque: b, faltaInicio, faltaFin };
        }
      }
      if (!mejor) continue;
      const cubre = mejor.bloque;

      // Bloqueo (definitivo o temporal) que traslape el horario → fuera.
      const bloqueada = susBloques.some(
        (b) =>
          (b.estado === 'BLOQUEADO' || b.estado === 'TEMPORAL') &&
          solapan(b.horaInicio, b.horaFin, dto.horaInicio, dto.horaFin),
      );
      if (bloqueada) continue;

      // Choque con otro servicio suyo el mismo día en ese horario → fuera.
      const susServicios = servs.filter((s) => s.nannieId === n.id);
      const choque = susServicios.some(
        (s) =>
          s.fecha.toISOString().slice(0, 10) === dia &&
          (s.estado === 'ACEPTADO' || s.estado === 'OFERTADO') &&
          solapan(s.horaInicio, s.horaFin, dto.horaInicio, dto.horaFin),
      );
      if (choque) continue;

      const serviciosSemana = susServicios.filter((s) => OCUPAN.includes(s.estado)).length;

      candidatas.push({
        nannieId: n.id,
        nombre: n.nombre,
        zonas: n.zonas,
        rango: n.rangoPermanente,
        serviciosSemana,
        bloque: `${cubre.horaInicio}–${cubre.horaFin}`,
        aproximada: mejor.faltaInicio + mejor.faltaFin > 0,
        faltaInicioMin: mejor.faltaInicio,
        faltaFinMin: mejor.faltaFin,
      });
    }

    // Exactas primero; entre aproximadas, menor hueco; luego equidad de carga
    // (menos servicios) y por último mayor rango.
    candidatas.sort(
      (a, b) =>
        Number(a.aproximada) - Number(b.aproximada) ||
        a.faltaInicioMin + a.faltaFinMin - (b.faltaInicioMin + b.faltaFinMin) ||
        a.serviciosSemana - b.serviciosSemana ||
        RANGO_ORDEN[b.rango] - RANGO_ORDEN[a.rango],
    );

    return { candidatas, total: candidatas.length };
  }

  /**
   * Confirma la decisión: crea el servicio (con sus validaciones) y lo oferta
   * a la nannie elegida. La nannie luego acepta/rechaza (flujo de M1).
   */
  async asignar(dto: AsignarDto) {
    const servicio = await this.calendario.crearServicio(dto);
    return this.calendario.ofertarServicio({ servicioId: servicio.id, nannieId: dto.nannieId });
  }
}

// ---------------- helpers ----------------

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** "HH:mm" → minutos desde medianoche. */
function aMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Dos rangos "HH:mm" se traslapan si aInicio < bFin && bInicio < aFin. */
function solapan(aIni: string, aFin: string, bIni: string, bFin: string): boolean {
  return aIni < bFin && bIni < aFin;
}

function fechaUTC(dia: string): Date {
  return new Date(`${dia}T00:00:00.000Z`);
}

/** Rango domingo–sábado (UTC) que contiene el día dado (el pago es sábado). */
function rangoSemana(dia: string): { desde: Date; hasta: Date } {
  const d = fechaUTC(dia);
  const domingo = new Date(d);
  domingo.setUTCDate(d.getUTCDate() - d.getUTCDay()); // 0 = domingo
  const sabado = new Date(domingo);
  sabado.setUTCDate(domingo.getUTCDate() + 6);
  return { desde: domingo, hasta: sabado };
}
