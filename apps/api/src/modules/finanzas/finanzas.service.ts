import { Injectable, NotFoundException } from '@nestjs/common';
import { NivelTarifa, RangoPermanente } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { pagoDeServicio } from './pago-servicio';
import { EditarFinanzaDto } from './dto/editar-finanza.dto';
import { CrearBonoDto } from './dto/crear-bono.dto';
import { reglaPorNumero, UMBRAL_STRIKES } from '../nannies/incidencias.catalogo';

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

/**
 * Rango de carrera según servicios de por vida (umbrales confirmados por Paula):
 * Rookie 50, Junior 80, Senior 130. Se asciende automático en el cierre de mes;
 * no baja. (Querétaro no tiene rango: el cierre lo omite.)
 */
function rangoPorServicios(serviciosAcumulados: number): RangoPermanente {
  if (serviciosAcumulados >= 130) return RangoPermanente.SENIOR;
  if (serviciosAcumulados >= 80) return RangoPermanente.JUNIOR;
  if (serviciosAcumulados >= 50) return RangoPermanente.ROOKIE;
  return RangoPermanente.BASE;
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
        nannie: {
          select: {
            id: true,
            nombre: true,
            foto: true,
            color: true,
            nivelTarifaMesActual: true,
            documentacionCompleta: true,
            capacitacionCompleta: true,
          },
        },
        paquete: { select: { horasTotales: true } },
        familia: { select: { nombreContacto: true } },
        finanza: { select: { descuentoNannie: true } },
      },
      orderBy: { fecha: 'asc' },
    });

    // Agrupa por nannie.
    const porNannie = new Map<
      string,
      {
        nannieId: string;
        nombre: string;
        foto: string | null;
        color: string | null;
        nivel: string;
        servicios: {
          id: string;
          tipoServicio: string;
          familia: string;
          fecha: string;
          duracionHoras: number;
          monto: number | null;
          descuento?: number;
          motivo?: string;
        }[];
        bonos: { id: string; monto: number; motivo: string; fecha: string }[];
        total: number;
        tienePendientes: boolean;
        documentacionCompleta: boolean;
        capacitacionCompleta: boolean;
      }
    >();

    for (const s of servicios) {
      const n = s.nannie!;
      const pago = pagoDeServicio(s.tipoServicio, s.duracionHoras, s.formato, n.nivelTarifaMesActual, {
        paqueteHoras: s.paquete?.horasTotales,
        ludotecaMontaje: s.ludotecaMontaje,
        plaza: s.plaza,
        zona: s.zona,
      });
      let grupo = porNannie.get(n.id);
      if (!grupo) {
        grupo = {
          nannieId: n.id,
          nombre: n.nombre,
          foto: n.foto,
          color: n.color,
          nivel: n.nivelTarifaMesActual,
          servicios: [],
          bonos: [],
          total: 0,
          tienePendientes: false,
          documentacionCompleta: n.documentacionCompleta,
          capacitacionCompleta: n.capacitacionCompleta,
        };
        porNannie.set(n.id, grupo);
      }
      // Descuento por incidencia (M4): reduce el pago de la nannie.
      const descuento = s.finanza?.descuentoNannie ? Number(s.finanza.descuentoNannie) : 0;
      const montoNeto = pago.monto == null ? null : redondea2(pago.monto - descuento);
      grupo.servicios.push({
        id: s.id,
        tipoServicio: s.tipoServicio,
        familia: s.familia?.nombreContacto ?? '—',
        fecha: s.fecha.toISOString().slice(0, 10),
        duracionHoras: s.duracionHoras,
        monto: montoNeto,
        descuento: descuento > 0 ? descuento : undefined,
        motivo: pago.motivo,
      });
      if (montoNeto == null) grupo.tienePendientes = true;
      else grupo.total += montoNeto;
    }

    // Bonos de la semana: se pagan junto con la nómina (reunión M3 con Paula).
    // Suman a lo que se le paga a la nannie. Una nannie puede tener bono sin
    // servicios completados esa semana: se crea su grupo igual.
    const bonos = await this.prisma.bono.findMany({
      where: { fecha: { gte, lte } },
      include: {
        nannie: {
          select: {
            id: true,
            nombre: true,
            foto: true,
            color: true,
            nivelTarifaMesActual: true,
            documentacionCompleta: true,
            capacitacionCompleta: true,
          },
        },
      },
      orderBy: { fecha: 'asc' },
    });
    for (const b of bonos) {
      const n = b.nannie;
      let grupo = porNannie.get(n.id);
      if (!grupo) {
        grupo = {
          nannieId: n.id,
          nombre: n.nombre,
          foto: n.foto,
          color: n.color,
          nivel: n.nivelTarifaMesActual,
          servicios: [],
          bonos: [],
          total: 0,
          tienePendientes: false,
          documentacionCompleta: n.documentacionCompleta,
          capacitacionCompleta: n.capacitacionCompleta,
        };
        porNannie.set(n.id, grupo);
      }
      const monto = Number(b.monto);
      grupo.bonos.push({ id: b.id, monto, motivo: b.motivo, fecha: b.fecha.toISOString().slice(0, 10) });
      grupo.total += monto;
    }

    // Marcas de "pagado" de esta semana (una por nannie; existencia = pagado).
    const semana = new Date(`${desde}T00:00:00.000Z`);
    const pagos = await this.prisma.nominaPago.findMany({ where: { semana } });
    const pagadoSet = new Set(pagos.map((p) => p.nannieId));

    // Recordatorio M4: descuentos por strikes ya identificados (3 strikes = un
    // −20%) que la Directora aún no aplica a un servicio. Se cuentan strikes
    // ACUMULANDO de todas las nannies de esta nómina.
    const ids = [...porNannie.keys()];
    const incidencias = ids.length
      ? await this.prisma.incidencia.findMany({
          where: { nannieId: { in: ids }, estado: 'ACUMULANDO' },
          select: { nannieId: true, regla: true },
        })
      : [];
    const strikeConteo = new Map<string, number>();
    for (const inc of incidencias) {
      if (reglaPorNumero(inc.regla)?.esStrike) {
        strikeConteo.set(inc.nannieId, (strikeConteo.get(inc.nannieId) ?? 0) + 1);
      }
    }

    const nannies = [...porNannie.values()]
      .map((g) => ({
        ...g,
        total: redondea2(g.total),
        pagado: pagadoSet.has(g.nannieId),
        strikesPendientes: Math.floor((strikeConteo.get(g.nannieId) ?? 0) / UMBRAL_STRIKES),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    return {
      rango: { desde, hasta },
      nannies,
      total: redondea2(nannies.reduce((s, g) => s + g.total, 0)),
    };
  }

  /** Marca o desmarca como pagada la nómina de una nannie en una semana
   *  (dom-sáb). `semana` = el domingo de inicio. SOLO coordinación. */
  async marcarPago(nannieId: string, semanaISO: string, pagado: boolean) {
    const semana = new Date(`${semanaISO}T00:00:00.000Z`);
    if (pagado) {
      await this.prisma.nominaPago.upsert({
        where: { nannieId_semana: { nannieId, semana } },
        update: {},
        create: { nannieId, semana },
      });
    } else {
      await this.prisma.nominaPago.deleteMany({ where: { nannieId, semana } });
    }
    return { ok: true, pagado };
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
        familia: { select: { nombreContacto: true } },
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
            plaza: s.plaza,
            zona: s.zona,
          })
        : { monto: null as number | null, motivo: 'Servicio sin nannie asignada' };
      // Descuento por incidencia (M4): reduce el pago de la nannie → margen sube.
      const descuentoNannie = s.finanza?.descuentoNannie ? Number(s.finanza.descuentoNannie) : 0;
      const margen =
        pago.monto == null ? null : redondea2(cobro - (pago.monto - descuentoNannie) - comision - ajuste);
      return {
        servicioId: s.id,
        nannie: s.nannie?.nombre ?? '—',
        familia: s.familia?.nombreContacto ?? '—',
        zona: s.zona,
        tipoServicio: s.tipoServicio,
        fecha: s.fecha.toISOString().slice(0, 10),
        cobro,
        pago: pago.monto,
        descuentoNannie,
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
        descuentoNannie: suma((x) => x.descuentoNannie),
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
      select: {
        id: true,
        nombre: true,
        rangoPermanente: true,
        nivelTarifaMesActual: true,
        serviciosAcumulados: true,
        plaza: true,
      },
    });

    return this.prisma.$transaction(async (tx) => {
      const resultados = [];
      for (const n of nannies) {
        // Querétaro no tiene niveles/programa de crecimiento: no se le fija nivel.
        if (n.plaza === 'QUERETARO') continue;
        const servs = await tx.servicio.findMany({
          where: { nannieId: n.id, estado: 'COMPLETADO', fecha: { gte, lte } },
          select: { duracionHoras: true },
        });
        const horas = servs.reduce((s, x) => s + x.duracionHoras, 0);
        // Ascenso de rango automático por servicios de por vida, y con ese rango
        // el nivel-tarifa del mes según las horas.
        const rango = rangoPorServicios(n.serviciosAcumulados);
        const nivel = nivelPara(horas, rango);

        await tx.nannie.update({
          where: { id: n.id },
          data: { rangoPermanente: rango, nivelTarifaMesActual: nivel },
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
              duracionHoras: true,
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

    // Horas pagadas del mes (indicador de Paula): el paquete cuenta sus horas
    // completas al contratarse (aunque se consuman después) + las horas de los
    // servicios individuales confirmados del mes.
    const horasPaquetes = paquetes.reduce((s, p) => s + p.horasTotales, 0);
    const horasIndividuales = individuales.reduce((s, f) => s + f.servicio.duracionHoras, 0);

    return {
      rango: { desde, hasta },
      paquetes: listaPaquetes,
      individuales: listaIndividuales,
      horasPagadas: redondea2(horasPaquetes + horasIndividuales),
      totales: {
        paquetes: redondea2(totalPaquetes),
        individuales: redondea2(totalIndividuales),
        total: redondea2(totalPaquetes + totalIndividuales),
      },
    };
  }

  /**
   * 3.5 · Reporte propio de la nannie (autoservicio). SOLO lo suyo y SIN datos
   * de familias/niños (SEGURIDAD): horas, servicios y ganado del mes + horas por
   * semana (8 semanas) para la gráfica. El pago usa el tabulador con su nivel.
   */
  async miReporte(nannieId: string) {
    const ahora = new Date();
    const anio = ahora.getUTCFullYear();
    const mes = ahora.getUTCMonth();
    const mesGte = new Date(Date.UTC(anio, mes, 1));
    const mesLte = new Date(Date.UTC(anio, mes + 1, 0, 23, 59, 59, 999));

    const domHoy = domingoUTC(ahora);
    const semanaGte = new Date(domHoy);
    semanaGte.setUTCDate(semanaGte.getUTCDate() - 7 * 7); // 8 semanas (incluye la actual)
    const rangoGte = semanaGte < mesGte ? semanaGte : mesGte;

    const nannie = await this.prisma.nannie.findUnique({
      where: { id: nannieId },
      select: { nivelTarifaMesActual: true },
    });
    const vacio = {
      mes: { anio, mes: mes + 1 },
      horasMes: 0,
      serviciosMes: 0,
      ganadoMes: 0,
      horasPorSemana: [] as { semana: string; horas: number }[],
    };
    if (!nannie) return vacio;

    const servicios = await this.prisma.servicio.findMany({
      where: { nannieId, estado: 'COMPLETADO', fecha: { gte: rangoGte } },
      include: { paquete: { select: { horasTotales: true } } },
    });

    let horasMes = 0;
    let serviciosMes = 0;
    let ganadoMes = 0;
    for (const s of servicios) {
      if (s.fecha < mesGte || s.fecha > mesLte) continue;
      horasMes += s.duracionHoras;
      serviciosMes += 1;
      const pago = pagoDeServicio(
        s.tipoServicio,
        s.duracionHoras,
        s.formato,
        nannie.nivelTarifaMesActual,
        {
          paqueteHoras: s.paquete?.horasTotales,
          ludotecaMontaje: s.ludotecaMontaje,
          plaza: s.plaza,
          zona: s.zona,
        },
      );
      if (pago.monto != null) ganadoMes += pago.monto;
    }

    // Horas por semana (8 semanas, dom-sáb) para la gráfica de barras.
    const semanas = [] as { inicio: number; label: string; horas: number }[];
    for (let i = 7; i >= 0; i--) {
      const ini = new Date(domHoy);
      ini.setUTCDate(ini.getUTCDate() - 7 * i);
      semanas.push({ inicio: ini.getTime(), label: etiquetaSemanaCorta(ini), horas: 0 });
    }
    for (const s of servicios) {
      const t = domingoUTC(s.fecha).getTime();
      const b = semanas.find((w) => w.inicio === t);
      if (b) b.horas += s.duracionHoras;
    }

    return {
      mes: { anio, mes: mes + 1 },
      horasMes,
      serviciosMes,
      ganadoMes: redondea2(ganadoMes),
      horasPorSemana: semanas.map((w) => ({ semana: w.label, horas: w.horas })),
    };
  }
}

function redondea2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Domingo (00:00 UTC) de la semana de una fecha. */
function domingoUTC(d: Date): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() - x.getUTCDay());
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];
/** Etiqueta corta "26 jul" del domingo de inicio de semana. */
function etiquetaSemanaCorta(dom: Date): string {
  return `${dom.getUTCDate()} ${MESES_CORTOS[dom.getUTCMonth()]}`;
}
