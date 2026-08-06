import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Incidencia } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { pagoDeServicio } from '../finanzas/pago-servicio';
import { RegistrarIncidenciaDto } from './dto/registrar-incidencia.dto';

const redondea2 = (n: number) => Math.round(n * 100) / 100;
import {
  REGLAS_INCIDENCIA,
  REGLAS_VALIDAS,
  UMBRAL_STRIKES,
  PCT_STRIKES,
  reglaPorNumero,
  type TipoConsecuencia,
} from './incidencias.catalogo';

export interface PenalidadPendiente {
  clave: string;
  regla: number | null; // null = paquete de 3 strikes acumulados
  descripcion: string;
  tipo: TipoConsecuencia;
  pct?: number;
  consecuenciaTexto: string;
  ocurrenciasIds: string[];
}

/** M4 · Incidencias: registro, bandeja (cálculo de penalizaciones) y aplicación. */
@Injectable()
export class IncidenciasService {
  constructor(private readonly prisma: PrismaService) {}

  /** El catálogo, para que el frontend muestre las reglas al registrar. */
  catalogo() {
    return REGLAS_INCIDENCIA;
  }

  async registrar(dto: RegistrarIncidenciaDto, registradaPor: string) {
    if (!REGLAS_VALIDAS.includes(dto.regla)) {
      throw new BadRequestException('Regla de incidencia inválida.');
    }
    const nannie = await this.prisma.nannie.findUnique({ where: { id: dto.nannieId } });
    if (!nannie) throw new NotFoundException('Nannie no encontrada');
    await this.prisma.incidencia.create({
      data: {
        nannieId: dto.nannieId,
        regla: dto.regla,
        nota: dto.nota?.trim() || null,
        registradaPor,
        estado: 'ACUMULANDO',
      },
    });
    return { ok: true };
  }

  /** Bandeja: nannies con incidencias, su historial, penalizaciones pendientes
   *  y el progreso de las que aún acumulan. */
  async bandeja() {
    const nannies = await this.prisma.nannie.findMany({
      where: { incidencias: { some: {} } },
      select: {
        id: true,
        nombre: true,
        estado: true,
        color: true,
        incidencias: { orderBy: { fecha: 'desc' } },
      },
      orderBy: { nombre: 'asc' },
    });
    return nannies.map((n) => ({
      nannieId: n.id,
      nombre: n.nombre,
      estado: n.estado,
      color: n.color,
      ...calcular(n.incidencias),
    }));
  }

  /** Bandeja de UNA nannie (para su expediente). */
  async bandejaDe(nannieId: string) {
    const n = await this.prisma.nannie.findUnique({
      where: { id: nannieId },
      select: { incidencias: { orderBy: { fecha: 'desc' } } },
    });
    if (!n) throw new NotFoundException('Nannie no encontrada');
    return calcular(n.incidencias);
  }

  /** Descarta una ocurrencia (no se contará). */
  async descartar(id: string) {
    await this.prisma.incidencia
      .update({ where: { id }, data: { estado: 'DESCARTADA' } })
      .catch(() => undefined);
    return { ok: true };
  }

  /**
   * Aplica una penalización de cambio de estado (Baja #7/#11, Prueba #14):
   * marca las ocurrencias como APLICADA y cambia el estado de la nannie. Los
   * descuentos al pago (tipos de descuento y descontar-horas) se aplican desde
   * Finanzas (fase 2b). SOLO Directora.
   */
  async aplicar(nannieId: string, ocurrenciasIds: string[], servicioId?: string, monto?: number) {
    const ocs = await this.prisma.incidencia.findMany({
      where: { id: { in: ocurrenciasIds }, nannieId, estado: 'ACUMULANDO' },
    });
    if (ocs.length === 0) throw new BadRequestException('No hay ocurrencias válidas para aplicar.');
    const regla = reglaPorNumero(ocs[0].regla);
    if (!regla) throw new BadRequestException('Regla no reconocida.');

    if (regla.tipo === 'BAJA' || regla.tipo === 'PRUEBA') {
      await this.prisma.$transaction(async (tx) => {
        await tx.incidencia.updateMany({
          where: { id: { in: ocs.map((o) => o.id) } },
          data: { estado: 'APLICADA', aplicadaEn: new Date() },
        });
        await tx.nannie.update({
          where: { id: nannieId },
          data: { estado: regla.tipo === 'BAJA' ? 'BAJA' : 'PRUEBA' },
        });
        if (regla.tipo === 'BAJA') {
          await tx.usuario.updateMany({ where: { nannieId }, data: { activo: false } });
        }
      });
      return { ok: true, aplicado: regla.tipo };
    }

    // Descuento al PAGO: se aplica a un servicio elegido (reduce su pago → margen sube).
    if (!servicioId || monto == null || monto <= 0) {
      throw new BadRequestException('Este descuento requiere elegir un servicio y un monto.');
    }
    const finanza = await this.prisma.finanzaServicio.findUnique({
      where: { servicioId },
      include: { servicio: { select: { nannieId: true } } },
    });
    if (!finanza || finanza.servicio.nannieId !== nannieId) {
      throw new BadRequestException('El servicio no pertenece a esta nannie.');
    }
    await this.prisma.$transaction(async (tx) => {
      const acumulado = (finanza.descuentoNannie ? Number(finanza.descuentoNannie) : 0) + monto;
      await tx.finanzaServicio.update({
        where: { servicioId },
        data: { descuentoNannie: redondea2(acumulado) },
      });
      await tx.incidencia.updateMany({
        where: { id: { in: ocs.map((o) => o.id) } },
        data: { estado: 'APLICADA', aplicadaEn: new Date() },
      });
    });
    return { ok: true, aplicado: 'DESCUENTO', monto };
  }

  /** Servicios COMPLETADOS recientes de la nannie con su pago, para elegir a
   *  cuál aplicar un descuento por incidencia. */
  async serviciosParaDescuento(nannieId: string) {
    const nannie = await this.prisma.nannie.findUnique({
      where: { id: nannieId },
      select: { nivelTarifaMesActual: true },
    });
    if (!nannie) throw new NotFoundException('Nannie no encontrada');
    const desde = new Date();
    desde.setUTCDate(desde.getUTCDate() - 45);
    const servicios = await this.prisma.servicio.findMany({
      where: { nannieId, estado: 'COMPLETADO', fecha: { gte: desde } },
      include: {
        paquete: { select: { horasTotales: true } },
        finanza: { select: { descuentoNannie: true } },
      },
      orderBy: { fecha: 'desc' },
      take: 20,
    });
    return servicios.map((s) => {
      const pago = pagoDeServicio(s.tipoServicio, s.duracionHoras, s.formato, nannie.nivelTarifaMesActual, {
        paqueteHoras: s.paquete?.horasTotales,
        ludotecaMontaje: s.ludotecaMontaje,
        plaza: s.plaza,
        zona: s.zona,
      });
      return {
        servicioId: s.id,
        fecha: s.fecha.toISOString().slice(0, 10),
        tipo: s.tipoServicio,
        pago: pago.monto,
        descuentoActual: s.finanza?.descuentoNannie ? Number(s.finanza.descuentoNannie) : 0,
      };
    });
  }
}

/** Calcula penalizaciones pendientes y progreso a partir de las incidencias. */
function calcular(incidencias: Incidencia[]) {
  const acumulando = incidencias.filter((i) => i.estado === 'ACUMULANDO');
  const t = (i: Incidencia) => i.fecha.getTime();
  const pendientes: PenalidadPendiente[] = [];
  const progreso: { etiqueta: string; actual: number; umbral: number }[] = [];

  // Strikes UNIFICADOS: toda incidencia de descuento suma 1 strike. Cada 3
  // strikes → −20% del próximo servicio.
  const strikes = acumulando
    .filter((i) => reglaPorNumero(i.regla)?.esStrike)
    .sort((a, b) => t(a) - t(b));
  let s = 0;
  while (strikes.length - s >= UMBRAL_STRIKES) {
    pendientes.push({
      clave: `strikes-${strikes[s].id}`,
      regla: null,
      descripcion: `${UMBRAL_STRIKES} strikes acumulados`,
      tipo: 'DESCUENTO_PROX_SERVICIO',
      pct: PCT_STRIKES,
      consecuenciaTexto: `−${PCT_STRIKES}% del próximo servicio`,
      ocurrenciasIds: strikes.slice(s, s + UMBRAL_STRIKES).map((o) => o.id),
    });
    s += UMBRAL_STRIKES;
  }
  if (strikes.length - s > 0) {
    progreso.push({ etiqueta: 'Strikes', actual: strikes.length - s, umbral: UMBRAL_STRIKES });
  }

  // Reglas directas (Baja #7/#11, Prueba #14, Descontar horas #10): cada
  // ocurrencia aplica por sí sola.
  const directas = acumulando
    .filter((i) => {
      const r = reglaPorNumero(i.regla);
      return r && !r.esStrike;
    })
    .sort((a, b) => t(a) - t(b));
  for (const oc of directas) {
    const r = reglaPorNumero(oc.regla)!;
    pendientes.push({
      clave: `r${oc.regla}-${oc.id}`,
      regla: oc.regla,
      descripcion: r.situacion,
      tipo: r.tipo!,
      consecuenciaTexto: r.consecuenciaTexto,
      ocurrenciasIds: [oc.id],
    });
  }

  return {
    historial: incidencias.slice(0, 20).map((i) => ({
      id: i.id,
      regla: i.regla,
      situacion: reglaPorNumero(i.regla)?.situacion ?? `Regla ${i.regla}`,
      fecha: i.fecha.toISOString().slice(0, 10),
      registradaPor: i.registradaPor,
      nota: i.nota,
      estado: i.estado,
    })),
    pendientes,
    progreso,
  };
}
