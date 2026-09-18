import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FinanzasService } from '../finanzas/finanzas.service';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';

const redondea2 = (n: number) => Math.round(n * 100) / 100;

/** M7 · Dashboard 360 — SOLO LECTURA, consume de todos. Una sola pasada por mes
 *  (cuida el vCPU único: pocas consultas + agregación en memoria). */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finanzas: FinanzasService,
  ) {}

  async panorama(user: UsuarioAutenticado) {
    // Fecha "de hoy" en hora de México (UTC-6): así "hoy"/"mañana" y los límites
    // del mes cuadran con cómo se guarda la fecha del servicio (medianoche UTC).
    const ahora = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const y = ahora.getUTCFullYear();
    const m = ahora.getUTCMonth();
    const inicioMes = new Date(Date.UTC(y, m, 1));
    const finMesExcl = new Date(Date.UTC(y, m + 1, 1)); // exclusivo (primer día del mes siguiente)
    const hoy = new Date(Date.UTC(y, m, ahora.getUTCDate()));
    const desde = inicioMes.toISOString().slice(0, 10);
    const hasta = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);

    // --- Servicios del mes (una consulta) ---
    const servicios = await this.prisma.servicio.findMany({
      where: { fecha: { gte: inicioMes, lt: finMesExcl } },
      select: {
        id: true,
        estado: true,
        zona: true,
        plaza: true,
        tipoServicio: true,
        nannieId: true,
        fecha: true,
        horaInicio: true,
        canceladaCobrada: true,
        nannie: { select: { id: true, nombre: true, color: true } },
        familia: { select: { id: true, nombreContacto: true } },
      },
    });
    const cuenta = (f: (s: (typeof servicios)[number]) => boolean) => servicios.filter(f).length;
    const relevantes = servicios.filter((s) => s.estado !== 'CANCELADO' && s.estado !== 'RECHAZADO');
    const cancelados = cuenta((s) => s.estado === 'CANCELADO');
    const canceladosCobrados = cuenta((s) => s.estado === 'CANCELADO' && s.canceladaCobrada);

    // Cobertura y zonas de demanda (sobre servicios vigentes)
    const conNannie = relevantes.filter((s) => s.nannieId).length;
    const porZona: Record<string, number> = {};
    for (const s of relevantes) porZona[s.zona || '—'] = (porZona[s.zona || '—'] || 0) + 1;
    const zonasDemanda = Object.entries(porZona)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([zona, n]) => ({ zona, servicios: n }));

    // --- Aceptación (ofertas respondidas en el mes) ---
    const ofertas = await this.prisma.ofertaRespuesta.findMany({
      where: { fechaRespuesta: { gte: inicioMes, lt: finMesExcl } },
      select: { respuesta: true, nannie: { select: { id: true, nombre: true } } },
    });
    const aceptadas = ofertas.filter((o) => o.respuesta === 'ACEPTO').length;
    const porNannie: Record<string, { id: string; nombre: string; acepto: number; total: number }> = {};
    for (const o of ofertas) {
      const g = (porNannie[o.nannie.id] ??= { id: o.nannie.id, nombre: o.nannie.nombre, acepto: 0, total: 0 });
      g.total++;
      if (o.respuesta === 'ACEPTO') g.acepto++;
    }
    const aceptacionNannies = Object.values(porNannie)
      .map((x) => ({ nannieId: x.id, nombre: x.nombre, tasa: Math.round((x.acepto / x.total) * 100), ofertas: x.total }))
      .sort((a, b) => a.tasa - b.tasa) // las más bajas primero (requieren atención)
      .slice(0, 6);

    // --- Ingreso no capturado: cancelaciones NO cobradas → cobro perdido ---
    const cancNoCobradas = await this.prisma.servicio.findMany({
      // Solo INDIVIDUALES: cancelar una sesión de PAQUETE sin cobrar devuelve la
      // hora al saldo (no se pierde ingreso; el paquete ya se cobró al contratarse).
      where: { estado: 'CANCELADO', canceladaCobrada: false, formato: 'INDIVIDUAL', fecha: { gte: inicioMes, lt: finMesExcl } },
      select: { finanza: { select: { cobroFamilia: true } } },
    });
    const ingresoNoCapturado = redondea2(
      cancNoCobradas.reduce((s, x) => s + (x.finanza ? Number(x.finanza.cobroFamilia) : 0), 0),
    );

    // --- Actividad reciente (últimos servicios tocados) ---
    const recientes = await this.prisma.servicio.findMany({
      orderBy: { actualizadoEn: 'desc' },
      take: 8,
      select: {
        estado: true,
        fecha: true,
        zona: true,
        familia: { select: { id: true, nombreContacto: true } },
        nannie: { select: { nombre: true } },
      },
    });
    const actividad = recientes.map((s) => ({
      estado: s.estado,
      familiaId: s.familia.id,
      familia: s.familia.nombreContacto,
      nannie: s.nannie?.nombre ?? 'Por asignar',
      zona: s.zona,
      fecha: s.fecha.toISOString().slice(0, 10),
    }));

    // --- Servicios del mes que lleva cada nannie (dona, separada por plaza) ---
    const porNannieServ = new Map<string, { nannieId: string; nombre: string; color: string | null; plaza: string; total: number }>();
    for (const s of relevantes) {
      if (!s.nannie) continue;
      const g = porNannieServ.get(s.nannie.id) ?? {
        nannieId: s.nannie.id,
        nombre: s.nannie.nombre,
        color: s.nannie.color,
        plaza: s.plaza,
        total: 0,
      };
      g.total++;
      porNannieServ.set(s.nannie.id, g);
    }
    const serviciosPorNannie = [...porNannieServ.values()].sort((a, b) => b.total - a.total);

    // --- Servicio más demandado del mes (por tipo) ---
    const porTipo: Record<string, number> = {};
    for (const s of relevantes) porTipo[s.tipoServicio] = (porTipo[s.tipoServicio] || 0) + 1;
    const serviciosPorTipo = Object.entries(porTipo)
      .sort((a, b) => b[1] - a[1])
      .map(([tipo, total]) => ({ tipo, total }));

    // --- Agenda de MAÑANA (para preparar el día): quién tiene servicio y a qué hora ---
    const finManana = new Date(hoy.getTime() + 2 * 86_400_000);
    const inicioManana = new Date(hoy.getTime() + 86_400_000);
    const svsManana = await this.prisma.servicio.findMany({
      where: { fecha: { gte: inicioManana, lt: finManana }, estado: { in: ['ACEPTADO', 'OFERTADO'] } },
      orderBy: { horaInicio: 'asc' },
      select: {
        horaInicio: true,
        zona: true,
        estado: true,
        familia: { select: { nombreContacto: true } },
        nannie: { select: { nombre: true } },
      },
    });
    const manana = svsManana.map((s) => ({
      horaInicio: s.horaInicio,
      zona: s.zona,
      familia: s.familia.nombreContacto,
      nannie: s.nannie?.nombre ?? 'Por asignar',
      porAsignar: !s.nannie,
    }));

    // --- Comparativo anual: horas del MES ACTUAL en los últimos 4 años ---
    // Cuenta TODOS los servicios relevantes (no cancelados/rechazados), no solo
    // los COMPLETADO: así el mes en curso —cuyos servicios están OFERTADO/ACEPTADO
    // y aún no se completan— sí suma sus horas programadas (Mario 2026-09-18).
    const comparativoAnual: { anio: number; horas: number }[] = [];
    for (let dy = 3; dy >= 0; dy--) {
      const ini = new Date(Date.UTC(y - dy, m, 1));
      const fin = new Date(Date.UTC(y - dy, m + 1, 1));
      const svs = await this.prisma.servicio.findMany({
        where: { estado: { notIn: ['CANCELADO', 'RECHAZADO'] }, fecha: { gte: ini, lt: fin } },
        select: { duracionHoras: true },
      });
      comparativoAnual.push({ anio: y - dy, horas: svs.reduce((s, x) => s + x.duracionHoras, 0) });
    }

    // --- Lista de servicios POR ASIGNAR (mismo criterio que el indicador): sin
    //     nannie, ofertados y a futuro. Para el atajo del dashboard: dice CUÁL. ---
    const porAsignarLista = servicios
      .filter((s) => !s.nannieId && s.estado === 'OFERTADO' && s.fecha >= hoy)
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
      .map((s) => ({
        servicioId: s.id,
        fecha: s.fecha.toISOString().slice(0, 10),
        horaInicio: s.horaInicio,
        familiaId: s.familia.id,
        familia: s.familia.nombreContacto,
        zona: s.zona,
        tipoServicio: s.tipoServicio,
      }));

    // --- Paquetes de horas activos (familias con saldo vigente) ---
    const paquetesActivosRows = await this.prisma.paquete.findMany({
      where: { estado: 'ACTIVO' },
      select: {
        id: true,
        horasTotales: true,
        horasConsumidas: true,
        fechaContratacion: true,
        familia: { select: { id: true, nombreContacto: true } },
      },
    });
    const paquetesActivos = paquetesActivosRows.length;

    // --- Paquetes por agotarse: quedan ≤5 h O ya se consumió ≥80% (avisar para
    //     ofrecer renovación). Solo horas (los paquetes no tienen vigencia por fecha). ---
    const paquetesPorAgotarse = paquetesActivosRows
      .map((p) => {
        const restantes = p.horasTotales - p.horasConsumidas;
        const pct = p.horasTotales > 0 ? p.horasConsumidas / p.horasTotales : 0;
        return {
          paqueteId: p.id,
          familiaId: p.familia.id,
          familia: p.familia.nombreContacto,
          horasTotales: p.horasTotales,
          restantes,
          consumidoPct: Math.round(pct * 100),
          desde: p.fechaContratacion.toISOString().slice(0, 10),
        };
      })
      .filter((p) => p.restantes <= 5 || p.consumidoPct >= 80)
      .sort((a, b) => a.restantes - b.restantes);

    // --- Adeudos por definir: horas de DESBORDE de paquete sin facturar (la
    //     familia usó más horas de las que le quedaban). Abiertos hasta que
    //     Paula/Jacky decidan (individual o paquete nuevo). No se filtran por mes:
    //     el adeudo sigue vivo hasta resolverse (Mario 2026-09-18). ---
    const adeudosRows = await this.prisma.servicio.findMany({
      where: { esDesborde: true, estadoCobro: 'POR_DEFINIR' },
      orderBy: { fecha: 'asc' },
      select: {
        id: true,
        fecha: true,
        horaInicio: true,
        horaFin: true,
        duracionHoras: true,
        zona: true,
        familia: { select: { id: true, nombreContacto: true } },
        nannie: { select: { nombre: true } },
      },
    });
    const adeudosPorDefinir = adeudosRows.map((s) => ({
      servicioId: s.id,
      familiaId: s.familia.id,
      familia: s.familia.nombreContacto,
      fecha: s.fecha.toISOString().slice(0, 10),
      horaInicio: s.horaInicio,
      horaFin: s.horaFin,
      horas: s.duracionHoras,
      nannie: s.nannie?.nombre ?? 'Por asignar',
      zona: s.zona,
    }));

    // --- Horas pagadas del mes (indicador de Paula, movido de Finanzas) ---
    const ingresos = await this.finanzas.ingresos(desde, hasta);
    const horasPagadas = ingresos.horasPagadas;

    // --- Margen (SOLO Directora): reutiliza Finanzas (mismo número que ve en M3) ---
    let margen: number | null = null;
    if (user.rol === 'DIRECTORA') {
      const mg = await this.finanzas.margen(desde, hasta);
      margen = mg.totales?.margenNeto ?? mg.totales?.margen ?? null;
    }

    return {
      mes: desde.slice(0, 7),
      servicios: {
        total: relevantes.length,
        completados: cuenta((s) => s.estado === 'COMPLETADO'),
        proximos: cuenta((s) => s.estado === 'ACEPTADO' && s.fecha >= hoy),
        hoy: cuenta((s) => s.fecha.getTime() === hoy.getTime() && s.estado !== 'CANCELADO' && s.estado !== 'RECHAZADO'),
        porAsignar: cuenta((s) => !s.nannieId && s.estado === 'OFERTADO' && s.fecha >= hoy),
      },
      aceptacion: {
        global: ofertas.length ? Math.round((aceptadas / ofertas.length) * 100) : null,
        respondidas: ofertas.length,
        porNannie: aceptacionNannies,
      },
      cobertura: {
        porcentaje: relevantes.length ? Math.round((conNannie / relevantes.length) * 100) : 100,
        sinCobertura: relevantes.length - conNannie,
      },
      zonasDemanda,
      cancelaciones: { total: cancelados, cobradas: canceladosCobrados, noCobradas: cancelados - canceladosCobrados },
      ingresoNoCapturado,
      horasPagadas,
      paquetesActivos,
      paquetesPorAgotarse,
      adeudosPorDefinir,
      porAsignarLista,
      serviciosPorNannie,
      serviciosPorTipo,
      comparativoAnual,
      manana,
      actividad,
      margen,
    };
  }
}
