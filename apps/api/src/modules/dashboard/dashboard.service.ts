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
    const ahora = new Date();
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
        estado: true,
        zona: true,
        nannieId: true,
        fecha: true,
        canceladaCobrada: true,
        nannie: { select: { id: true, nombre: true, color: true } },
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
      where: { estado: 'CANCELADO', canceladaCobrada: false, fecha: { gte: inicioMes, lt: finMesExcl } },
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

    // --- Servicios del mes que lleva cada nannie (para la dona) ---
    const porNannieServ = new Map<string, { nannieId: string; nombre: string; color: string | null; total: number }>();
    for (const s of relevantes) {
      if (!s.nannie) continue;
      const g = porNannieServ.get(s.nannie.id) ?? {
        nannieId: s.nannie.id,
        nombre: s.nannie.nombre,
        color: s.nannie.color,
        total: 0,
      };
      g.total++;
      porNannieServ.set(s.nannie.id, g);
    }
    const serviciosPorNannie = [...porNannieServ.values()].sort((a, b) => b.total - a.total);

    // --- Paquetes de horas activos (familias con saldo vigente) ---
    const paquetesActivos = await this.prisma.paquete.count({ where: { estado: 'ACTIVO' } });

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
      serviciosPorNannie,
      actividad,
      margen,
    };
  }
}
