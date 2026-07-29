import { Injectable, NotFoundException } from '@nestjs/common';
import { NivelTarifa, RangoPermanente } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { pagoDeServicio } from './pago-servicio';
import { EditarFinanzaDto } from './dto/editar-finanza.dto';
import { CrearBonoDto } from './dto/crear-bono.dto';

/**
 * Nivel-tarifa del mes entrante según horas del mes que cerró (§6.2):
 *  - < 25 h → BASE (aunque su rango permanente sea mayor).
 *  - ≥ 25 h → cobra en su rango: si sigue en Base (<50 serv) → TARIFA_25HRS;
 *    si es Rookie/Jr/Sr → esa columna.
 */
function nivelPara(horas: number, rango: RangoPermanente): NivelTarifa {
  if (horas < 25) return NivelTarifa.BASE;
  if (rango === RangoPermanente.ROOKIE) return NivelTarifa.ROOKIE;
  if (rango === RangoPermanente.JUNIOR) return NivelTarifa.JUNIOR;
  if (rango === RangoPermanente.SENIOR) return NivelTarifa.SENIOR;
  return NivelTarifa.TARIFA_25HRS; // rango Base pero cumplió 25 h
}

// Servicios individuales que cuentan como ingreso (confirmados; se excluyen
// los solo-ofertados/por-asignar y los rechazados/cancelados).
const CONFIRMADOS = ['ACEPTADO', 'COMPLETADO'] as const;

@Injectable()
export class FinanzasService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 3.1 · Nómina semanal (pago a nannies). Suma el pago de los servicios
   * COMPLETADOS de la semana (dom→sáb), cada uno tarifado con el tabulador
   * según el nivel-tarifa vigente de la nannie. Los servicios cuya tarifa aún
   * no está definida (paquete/ludoteca/fuera de tramo) se listan como
   * "pendientes" y NO entran al total.
   */
  async nomina(desde: string, hasta: string) {
    const gte = new Date(`${desde}T00:00:00.000Z`);
    const lte = new Date(`${hasta}T23:59:59.999Z`);

    const servicios = await this.prisma.servicio.findMany({
      where: { estado: 'COMPLETADO', nannieId: { not: null }, fecha: { gte, lte } },
      include: {
        nannie: { select: { id: true, nombre: true, nivelTarifaMesActual: true } },
        paquete: { select: { horasTotales: true } },
      },
      orderBy: { fecha: 'asc' },
    });

    // Agrupa por nannie.
    const porNannie = new Map<
      string,
      {
        nannieId: string;
        nombre: string;
        nivel: string;
        servicios: {
          id: string;
          tipoServicio: string;
          fecha: string;
          duracionHoras: number;
          monto: number | null;
          motivo?: string;
        }[];
        total: number;
        tienePendientes: boolean;
      }
    >();

    for (const s of servicios) {
      const n = s.nannie!;
      const pago = pagoDeServicio(s.tipoServicio, s.duracionHoras, s.formato, n.nivelTarifaMesActual, {
        paqueteHoras: s.paquete?.horasTotales,
        ludotecaMontaje: s.ludotecaMontaje,
      });
      let grupo = porNannie.get(n.id);
      if (!grupo) {
        grupo = {
          nannieId: n.id,
          nombre: n.nombre,
          nivel: n.nivelTarifaMesActual,
          servicios: [],
          total: 0,
          tienePendientes: false,
        };
        porNannie.set(n.id, grupo);
      }
      grupo.servicios.push({
        id: s.id,
        tipoServicio: s.tipoServicio,
        fecha: s.fecha.toISOString().slice(0, 10),
        duracionHoras: s.duracionHoras,
        monto: pago.monto,
        motivo: pago.motivo,
      });
      if (pago.monto == null) grupo.tienePendientes = true;
      else grupo.total += pago.monto;
    }

    const nannies = [...porNannie.values()]
      .map((g) => ({ ...g, total: redondea2(g.total) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    return {
      rango: { desde, hasta },
      nannies,
      total: redondea2(nannies.reduce((s, g) => s + g.total, 0)),
    };
  }

  /**
   * 3.4 · Margen por servicio (SOLO Directora). Por cada servicio COMPLETADO:
   * margen = cobro − pago − comisión − ajuste. La comisión y el ajuste son
   * manuales (3.3). Si el pago está pendiente de tarifa, el margen queda
   * pendiente y no suma.
   */
  async margen(desde: string, hasta: string) {
    const gte = new Date(`${desde}T00:00:00.000Z`);
    const lte = new Date(`${hasta}T23:59:59.999Z`);

    const servicios = await this.prisma.servicio.findMany({
      where: { estado: 'COMPLETADO', fecha: { gte, lte } },
      include: {
        nannie: { select: { nombre: true, nivelTarifaMesActual: true } },
        finanza: true,
        paquete: { select: { horasTotales: true } },
      },
      orderBy: { fecha: 'asc' },
    });

    const filas = servicios.map((s) => {
      const cobro = s.finanza ? Number(s.finanza.cobroFamilia) : 0;
      const comision = s.finanza?.comision ? Number(s.finanza.comision) : 0;
      const ajuste = s.finanza?.ajuste ? Number(s.finanza.ajuste) : 0;
      const pago = s.nannie
        ? pagoDeServicio(s.tipoServicio, s.duracionHoras, s.formato, s.nannie.nivelTarifaMesActual, {
            paqueteHoras: s.paquete?.horasTotales,
            ludotecaMontaje: s.ludotecaMontaje,
          })
        : { monto: null as number | null, motivo: 'Servicio sin nannie asignada' };
      const margen = pago.monto == null ? null : redondea2(cobro - pago.monto - comision - ajuste);
      return {
        servicioId: s.id,
        nannie: s.nannie?.nombre ?? '—',
        zona: s.zona,
        tipoServicio: s.tipoServicio,
        fecha: s.fecha.toISOString().slice(0, 10),
        cobro,
        pago: pago.monto,
        comision,
        ajuste,
        margen,
        pendiente: pago.monto == null,
        motivo: pago.monto == null ? pago.motivo : undefined,
      };
    });

    const suma = (f: (x: (typeof filas)[number]) => number) =>
      redondea2(filas.reduce((s, x) => s + f(x), 0));

    // Bonos manuales del periodo (reducen el margen; no van por servicio).
    const bonosRaw = await this.prisma.bono.findMany({
      where: { fecha: { gte, lte } },
      include: { nannie: { select: { nombre: true } } },
      orderBy: { fecha: 'asc' },
    });
    const bonos = bonosRaw.map((b) => ({
      id: b.id,
      nannie: b.nannie.nombre,
      monto: Number(b.monto),
      motivo: b.motivo,
      fecha: b.fecha.toISOString().slice(0, 10),
    }));
    const totalBonos = redondea2(bonos.reduce((s, b) => s + b.monto, 0));
    const margenBruto = suma((x) => x.margen ?? 0);

    return {
      rango: { desde, hasta },
      servicios: filas,
      bonos,
      totales: {
        cobro: suma((x) => x.cobro),
        pago: suma((x) => x.pago ?? 0),
        comision: suma((x) => x.comision),
        ajuste: suma((x) => x.ajuste),
        bonos: totalBonos,
        margen: margenBruto,
        margenNeto: redondea2(margenBruto - totalBonos),
      },
      pendientes: filas.filter((x) => x.pendiente).length,
    };
  }

  /** Aplica un bono manual a una nannie (M3). SOLO Directora. */
  async crearBono(dto: CrearBonoDto) {
    const nannie = await this.prisma.nannie.findUnique({ where: { id: dto.nannieId } });
    if (!nannie) throw new NotFoundException('Nannie no encontrada');
    return this.prisma.bono.create({
      data: { nannieId: dto.nannieId, monto: dto.monto, motivo: dto.motivo },
    });
  }

  /** Elimina un bono. SOLO Directora. */
  async eliminarBono(id: string) {
    await this.prisma.bono.delete({ where: { id } }).catch(() => undefined);
    return { ok: true };
  }

  /** 3.3 · Fija/ajusta la comisión de coordinadora y el ajuste manual de un
   *  servicio (SOLO Directora). Pasar null limpia el campo; omitir lo deja igual. */
  async editarFinanza(servicioId: string, dto: EditarFinanzaDto) {
    const finanza = await this.prisma.finanzaServicio.findUnique({ where: { servicioId } });
    if (!finanza) throw new NotFoundException('Este servicio no tiene registro financiero.');
    return this.prisma.finanzaServicio.update({
      where: { servicioId },
      data: {
        ...(dto.comision !== undefined ? { comision: dto.comision } : {}),
        ...(dto.ajuste !== undefined ? { ajuste: dto.ajuste } : {}),
      },
    });
  }

  /**
   * Cierre de mes (§6.2). Evalúa las horas COMPLETADAS del mes {anio, mes} por
   * nannie y estampa su nivel-tarifa para el mes ENTRANTE (mes+1), dejando
   * registro auditable en cierres_mes. No recalcula servicio a servicio dentro
   * del mes: el nivel queda fijo. SOLO Directora.
   */
  async cerrarMes(anio: number, mes: number) {
    const gte = new Date(Date.UTC(anio, mes - 1, 1));
    const lte = new Date(Date.UTC(anio, mes, 0, 23, 59, 59, 999));
    const sigAnio = mes === 12 ? anio + 1 : anio;
    const sigMes = mes === 12 ? 1 : mes + 1;

    const nannies = await this.prisma.nannie.findMany({
      select: { id: true, nombre: true, rangoPermanente: true, nivelTarifaMesActual: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const resultados = [];
      for (const n of nannies) {
        const servs = await tx.servicio.findMany({
          where: { nannieId: n.id, estado: 'COMPLETADO', fecha: { gte, lte } },
          select: { duracionHoras: true },
        });
        const horas = servs.reduce((s, x) => s + x.duracionHoras, 0);
        const nivel = nivelPara(horas, n.rangoPermanente);

        await tx.nannie.update({
          where: { id: n.id },
          data: { nivelTarifaMesActual: nivel },
        });
        await tx.cierreMes.upsert({
          where: { nannieId_anio_mes: { nannieId: n.id, anio: sigAnio, mes: sigMes } },
          update: { horasMesPrevio: horas, nivelAsignado: nivel },
          create: {
            nannieId: n.id,
            anio: sigAnio,
            mes: sigMes,
            horasMesPrevio: horas,
            nivelAsignado: nivel,
          },
        });
        resultados.push({
          nannie: n.nombre,
          horas,
          nivelAnterior: n.nivelTarifaMesActual,
          nivelAsignado: nivel,
          cambio: n.nivelTarifaMesActual !== nivel,
        });
      }
      return {
        mesCerrado: { anio, mes },
        aplicaA: { anio: sigAnio, mes: sigMes },
        resultados: resultados.sort((a, b) => a.nannie.localeCompare(b.nannie)),
      };
    });
  }

  /** Estado de niveles: nivel-tarifa vigente por nannie + historial de cierres. */
  async niveles() {
    const [nannies, cierres] = await Promise.all([
      this.prisma.nannie.findMany({
        select: {
          id: true,
          nombre: true,
          rangoPermanente: true,
          nivelTarifaMesActual: true,
          serviciosAcumulados: true,
        },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.cierreMes.findMany({
        include: { nannie: { select: { nombre: true } } },
        orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
        take: 60,
      }),
    ]);

    return {
      nannies: nannies.map((n) => ({
        nannieId: n.id,
        nombre: n.nombre,
        rango: n.rangoPermanente,
        nivelActual: n.nivelTarifaMesActual,
        serviciosAcumulados: n.serviciosAcumulados,
      })),
      cierres: cierres.map((c) => ({
        nannie: c.nannie.nombre,
        anio: c.anio,
        mes: c.mes,
        horasMesPrevio: Number(c.horasMesPrevio),
        nivelAsignado: c.nivelAsignado,
      })),
    };
  }

  /**
   * 3.2 · Registro de ingresos (cobro a familias) en un rango.
   * Ingreso de PAQUETES = precio del paquete al contratarlo (una sola vez).
   * Ingreso INDIVIDUAL = cobro por servicio individual confirmado.
   * No se suma el cobro prorrateado de servicios de paquete (evita doble conteo:
   * ese prorrateo solo alimenta el margen por servicio en 3.4).
   */
  async ingresos(desde: string, hasta: string) {
    const gte = new Date(`${desde}T00:00:00.000Z`);
    const lte = new Date(`${hasta}T23:59:59.999Z`);

    const [paquetes, individuales] = await Promise.all([
      this.prisma.paquete.findMany({
        where: { fechaContratacion: { gte, lte } },
        include: { familia: { select: { nombreContacto: true } } },
        orderBy: { fechaContratacion: 'asc' },
      }),
      this.prisma.finanzaServicio.findMany({
        where: {
          servicio: {
            formato: 'INDIVIDUAL',
            estado: { in: [...CONFIRMADOS] },
            fecha: { gte, lte },
          },
        },
        include: {
          servicio: {
            select: {
              tipoServicio: true,
              fecha: true,
              familia: { select: { nombreContacto: true } },
            },
          },
        },
        orderBy: { creadoEn: 'asc' },
      }),
    ]);

    const listaPaquetes = paquetes.map((p) => ({
      id: p.id,
      familia: p.familia.nombreContacto,
      horas: p.horasTotales,
      monto: Number(p.precioTotal),
      fecha: p.fechaContratacion.toISOString().slice(0, 10),
    }));

    const listaIndividuales = individuales.map((f) => ({
      id: f.id,
      familia: f.servicio.familia.nombreContacto,
      tipoServicio: f.servicio.tipoServicio,
      monto: Number(f.cobroFamilia),
      fecha: f.servicio.fecha.toISOString().slice(0, 10),
    }));

    const totalPaquetes = listaPaquetes.reduce((s, x) => s + x.monto, 0);
    const totalIndividuales = listaIndividuales.reduce((s, x) => s + x.monto, 0);

    return {
      rango: { desde, hasta },
      paquetes: listaPaquetes,
      individuales: listaIndividuales,
      totales: {
        paquetes: redondea2(totalPaquetes),
        individuales: redondea2(totalIndividuales),
        total: redondea2(totalPaquetes + totalIndividuales),
      },
    };
  }
}

function redondea2(n: number): number {
  return Math.round(n * 100) / 100;
}
