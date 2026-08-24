import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { filtrarCampos } from '../../core/rbac/permissions';
import { CrearFamiliaDto } from './dto/crear-familia.dto';
import { EditarFamiliaDto } from './dto/editar-familia.dto';
import { ImportarFamiliasDto } from './dto/importar-familias.dto';
import { CrearPaqueteDto } from './dto/crear-paquete.dto';
import { CrearNinoDto, EditarNinoDto } from './dto/nino.dto';
import { CrearNotaDto } from './dto/crear-nota.dto';
import { tramoPorHoras } from './paquetes.tarifa';
import { tarifasZonaQro } from '../finanzas/queretaro-tarifas';

/** Umbral de inactividad de una familia (Paula, M5): 60 días sin servicio. */
export const UMBRAL_INACTIVIDAD_DIAS = 60;

/** Anticipación mínima para que la familia cancele por su cuenta desde el enlace
 *  (política Paula: con menos de 24h se coordina directamente). */
export const CANCELACION_AUTOSERVICIO_HORAS = 24;

/** Plazas en el centro de México (UTC-6 fijo; sin horario de verano desde 2022). */
const OFFSET_MX_MS = 6 * 60 * 60 * 1000;

/** Instante (ms epoch) en que arranca el servicio: la fecha se guarda a
 *  medianoche UTC y la hora es local de México. */
function inicioServicioMs(fecha: Date, horaInicio: string): number {
  const [h, m] = horaInicio.split(':').map(Number);
  return fecha.getTime() + (h * 60 + m) * 60_000 + OFFSET_MX_MS;
}

/** ¿La familia puede cancelar esta sesión por su cuenta? Solo fechas futuras
 *  aún programadas y con ≥24h de anticipación. */
function esCancelablePorFamilia(estado: string, fecha: Date, horaInicio: string): boolean {
  if (estado !== 'OFERTADO' && estado !== 'ACEPTADO') return false;
  return inicioServicioMs(fecha, horaInicio) - Date.now() >= CANCELACION_AUTOSERVICIO_HORAS * 3_600_000;
}

/** Token URL-safe para el enlace público del avance del paquete. */
function nuevoTokenPublico(): string {
  return randomBytes(18).toString('base64url');
}

/** Días enteros transcurridos entre una fecha y "ahora" (negativo si es futura). */
function diasEntre(fecha: Date, ahora: Date): number {
  return Math.floor((ahora.getTime() - fecha.getTime()) / 86_400_000);
}

/** M5 (mínimo para M2): listado y alta rápida de familias + alta de paquete. */
@Injectable()
export class FamiliasService {
  constructor(private readonly prisma: PrismaService) {}

  /** 5.1 · Directorio: familias con paquete activo, nº de servicios y última atención. */
  async listar() {
    const familias = await this.prisma.familia.findMany({
      select: {
        id: true,
        nombreContacto: true,
        apellido: true,
        plaza: true,
        zona: true,
        estado: true,
        fechaAlta: true,
        _count: { select: { servicios: true } },
        servicios: { select: { fecha: true }, orderBy: { fecha: 'desc' }, take: 1 },
        paquetes: {
          where: { estado: 'ACTIVO' },
          select: {
            id: true,
            horasTotales: true,
            horasConsumidas: true,
            asignacionManual: true,
          },
          take: 1,
        },
      },
      orderBy: { nombreContacto: 'asc' },
    });

    const ahora = new Date();
    return familias.map(({ paquetes, servicios, _count, fechaAlta, ...f }) => {
      const referencia = servicios[0]?.fecha ?? fechaAlta;
      const diasSinServicio = diasEntre(referencia, ahora);
      return {
        ...f,
        nServicios: _count.servicios,
        ultimaAtencion: servicios[0]?.fecha.toISOString().slice(0, 10) ?? null,
        // Inactividad DERIVADA (M5 · Paula): ≥60 días sin servicio → "Inactiva",
        // solo separación visual. Se reactiva sola cuando se le agenda (la
        // actividad reciente cambia la referencia). SUSPENDIDA no aplica.
        inactiva: f.estado !== 'SUSPENDIDA' && diasSinServicio >= UMBRAL_INACTIVIDAD_DIAS,
        diasSinServicio,
        paqueteActivo: paquetes[0]
          ? {
              id: paquetes[0].id,
              horasTotales: paquetes[0].horasTotales,
              horasConsumidas: paquetes[0].horasConsumidas,
              horasRestantes: paquetes[0].horasTotales - paquetes[0].horasConsumidas,
              asignacionManual: paquetes[0].asignacionManual,
            }
          : null,
      };
    });
  }

  crear(dto: CrearFamiliaDto) {
    return this.prisma.familia.create({
      data: {
        nombreContacto: dto.nombreContacto,
        apellido: dto.apellido,
        plaza: dto.plaza,
        zona: dto.zona,
        telefono: dto.telefono,
        email: dto.email,
        numeroEmergencia: dto.numeroEmergencia,
        direccion: dto.direccion,
      },
      select: { id: true, nombreContacto: true, plaza: true, zona: true },
    });
  }

  /** Importación en lote de familias (M5 · Bloque 4). Cada familia trae su
   *  cardex + sus peques; se crea en una transacción. El cliente ya validó y
   *  mostró la vista previa, pero el DTO revalida cada fila. Devuelve el
   *  resultado por fila (para reportar cuáles se crearon). */
  async importar(dto: ImportarFamiliasDto) {
    const resultados: { nombreContacto: string; ok: boolean; id?: string; error?: string }[] = [];
    for (const f of dto.familias) {
      try {
        const { ninos, ...familia } = f;
        const creada = await this.prisma.$transaction(async (tx) => {
          const nueva = await tx.familia.create({ data: familia });
          if (ninos.length) {
            await tx.nino.createMany({ data: ninos.map((n) => ({ familiaId: nueva.id, ...n })) });
          }
          return nueva;
        });
        resultados.push({ nombreContacto: f.nombreContacto, ok: true, id: creada.id });
      } catch {
        resultados.push({ nombreContacto: f.nombreContacto, ok: false, error: 'No se pudo crear.' });
      }
    }
    return { creadas: resultados.filter((r) => r.ok).length, total: dto.familias.length, resultados };
  }

  /** Edita el cardex de la familia (M5). Solo actualiza lo que venga en el DTO. */
  async editar(familiaId: string, dto: EditarFamiliaDto) {
    const familia = await this.prisma.familia.findUnique({ where: { id: familiaId } });
    if (!familia) throw new NotFoundException('Familia no encontrada');
    await this.prisma.familia.update({ where: { id: familiaId }, data: { ...dto } });
    return { ok: true };
  }

  /**
   * Registra un paquete de horas para la familia. El precio sale del tabulador
   * (M2 no cobra: solo deja el saldo listo para consumir). Regla: una familia
   * puede tener un solo paquete ACTIVO a la vez.
   */
  async crearPaquete(familiaId: string, dto: CrearPaqueteDto) {
    const familia = await this.prisma.familia.findUnique({ where: { id: familiaId } });
    if (!familia) throw new NotFoundException('Familia no encontrada');

    // Precio del paquete: Querétaro por ZONA (solo 10/20/30); Toluca por tramo fijo.
    let horasTotales: number;
    let precioTotal: number;
    if (familia.plaza === 'QUERETARO') {
      const tz = tarifasZonaQro(familia.zona ?? '');
      if (!tz) {
        throw new BadRequestException(
          'La familia de Querétaro no tiene una zona válida asignada para tarifar el paquete.',
        );
      }
      if (dto.horas !== 10 && dto.horas !== 20 && dto.horas !== 30) {
        throw new BadRequestException('En Querétaro los paquetes son de 10, 20 o 30 horas.');
      }
      horasTotales = dto.horas;
      precioTotal = tz.cobroPaquete[dto.horas];
    } else {
      const tramo = tramoPorHoras(dto.horas);
      if (!tramo) {
        throw new BadRequestException('Paquete inválido: las opciones son 10, 20, 30, 40 o 50 horas.');
      }
      horasTotales = tramo.horas;
      precioTotal = tramo.precioTotal;
    }

    const yaTiene = await this.prisma.paquete.findFirst({
      where: { familiaId, estado: 'ACTIVO' },
    });
    if (yaTiene) {
      throw new BadRequestException(
        'La familia ya tiene un paquete activo. Debe consumirse antes de registrar otro.',
      );
    }

    const paquete = await this.prisma.paquete.create({
      data: {
        familiaId,
        horasTotales,
        precioTotal,
        asignacionManual: dto.asignacionManual ?? false,
        tokenPublico: nuevoTokenPublico(),
      },
      select: { id: true, horasTotales: true, horasConsumidas: true, asignacionManual: true },
    });
    return {
      ...paquete,
      horasRestantes: paquete.horasTotales - paquete.horasConsumidas,
    };
  }

  /** Proyección de horas de un paquete: sus sesiones programadas, para el PDF
   *  que se comparte con la familia (punto 12 de la reunión M2). */
  async proyeccion(paqueteId: string) {
    const paquete = await this.prisma.paquete.findUnique({
      where: { id: paqueteId },
      include: {
        familia: { select: { nombreContacto: true, plaza: true } },
        servicios: {
          include: { nannie: { select: { nombre: true } } },
          orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
        },
      },
    });
    if (!paquete) throw new NotFoundException('Paquete no encontrado');

    return {
      familia: paquete.familia.nombreContacto,
      plaza: paquete.familia.plaza,
      paquete: {
        horasTotales: paquete.horasTotales,
        horasConsumidas: paquete.horasConsumidas,
        horasRestantes: paquete.horasTotales - paquete.horasConsumidas,
      },
      sesiones: paquete.servicios
        .filter((s) => s.estado !== 'RECHAZADO' && s.estado !== 'CANCELADO')
        .map((s) => ({
          fecha: s.fecha.toISOString().slice(0, 10),
          horaInicio: s.horaInicio,
          horaFin: s.horaFin,
          tipoServicio: s.tipoServicio,
          nannie: s.nannie?.nombre ?? 'Por asignar',
          estado: s.estado,
        })),
    };
  }

  /** Asegura (crea si falta) el token del enlace de avance de un paquete y lo
   *  devuelve. Coordinación lo usa para copiar el enlace que comparte con la familia. */
  async enlaceAvance(paqueteId: string) {
    const paquete = await this.prisma.paquete.findUnique({
      where: { id: paqueteId },
      select: { id: true, tokenPublico: true },
    });
    if (!paquete) throw new NotFoundException('Paquete no encontrado');
    let token = paquete.tokenPublico;
    if (!token) {
      token = nuevoTokenPublico();
      await this.prisma.paquete.update({ where: { id: paqueteId }, data: { tokenPublico: token } });
    }
    return { token };
  }

  /** Avance PÚBLICO de un paquete (la familia lo ve sin login, por su token).
   *  Solo horas y fechas/estado; NO incluye el nombre de la nannie. */
  async avancePublico(token: string) {
    const paquete = await this.prisma.paquete.findUnique({
      where: { tokenPublico: token },
      include: {
        familia: { select: { nombreContacto: true, apellido: true } },
        servicios: { orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }] },
      },
    });
    if (!paquete) throw new NotFoundException('Enlace no válido.');

    const activas = paquete.servicios.filter((s) => s.estado !== 'RECHAZADO');
    return {
      familia: `${paquete.familia.nombreContacto} ${paquete.familia.apellido ?? ''}`.trim(),
      asignacionManual: paquete.asignacionManual,
      horasTotales: paquete.horasTotales,
      horasConsumidas: paquete.horasConsumidas,
      horasRestantes: paquete.horasTotales - paquete.horasConsumidas,
      estado: paquete.estado,
      sesiones: activas.map((s) => ({
        id: s.id,
        fecha: s.fecha.toISOString().slice(0, 10),
        horaInicio: s.horaInicio,
        horaFin: s.horaFin,
        duracionHoras: s.duracionHoras,
        tipoServicio: s.tipoServicio,
        estado: s.estado,
        // La familia solo cancela por su cuenta con ≥24h (política); con menos,
        // debe coordinarse directamente.
        cancelable: esCancelablePorFamilia(s.estado, s.fecha, s.horaInicio),
      })),
    };
  }

  /** La familia cancela una fecha desde el enlace público (sin login), por su
   *  token. Solo con ≥24h de anticipación; con menos, se coordina directamente.
   *  No cobra y devuelve la hora al saldo del paquete (misma regla que la
   *  cancelación de coordinación sin cobro). */
  async cancelarPublico(token: string, servicioId: string) {
    const paquete = await this.prisma.paquete.findUnique({
      where: { tokenPublico: token },
      select: { id: true },
    });
    if (!paquete) throw new NotFoundException('Enlace no válido.');

    const servicio = await this.prisma.servicio.findUnique({ where: { id: servicioId } });
    if (!servicio || servicio.paqueteId !== paquete.id) {
      throw new NotFoundException('La fecha no pertenece a este paquete.');
    }
    if (servicio.estado !== 'OFERTADO' && servicio.estado !== 'ACEPTADO') {
      throw new BadRequestException('Esta fecha ya no se puede cancelar.');
    }
    const faltanMs = inicioServicioMs(servicio.fecha, servicio.horaInicio) - Date.now();
    if (faltanMs < CANCELACION_AUTOSERVICIO_HORAS * 3_600_000) {
      throw new BadRequestException(
        'Por política, las cancelaciones con menos de 24 horas se coordinan directamente. Contáctanos y con gusto te ayudamos.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.servicio.update({
        where: { id: servicioId },
        data: {
          estado: 'CANCELADO',
          motivoCancelacion: 'Cancelada por la familia desde el enlace de avance.',
          canceladaCobrada: false,
        },
      });
      const p = await tx.paquete.findUnique({ where: { id: paquete.id } });
      if (p) {
        const consumidas = Math.max(0, p.horasConsumidas - servicio.duracionHoras);
        await tx.paquete.update({
          where: { id: p.id },
          data: { horasConsumidas: consumidas, estado: p.estado === 'CONSUMIDO' ? 'ACTIVO' : p.estado },
        });
      }
    });
    return { ok: true };
  }

  /**
   * 5.2 · Perfil completo de una familia: datos, niños (campos filtrados por
   * rol — SEGURIDAD §2/§3), historial de servicios, notas de bitácora y paquete.
   */
  async perfil(familiaId: string, user: UsuarioAutenticado) {
    const familia = await this.prisma.familia.findUnique({
      where: { id: familiaId },
      include: {
        ninos: { orderBy: { creadoEn: 'asc' } },
        servicios: {
          include: { nannie: { select: { nombre: true } } },
          orderBy: { fecha: 'desc' },
          take: 50,
        },
        notas: { orderBy: { creadoEn: 'desc' } },
        paquetes: { where: { estado: 'ACTIVO' }, take: 1 },
      },
    });
    if (!familia) throw new NotFoundException('Familia no encontrada');

    const p = familia.paquetes[0];
    const referencia = familia.servicios[0]?.fecha ?? familia.fechaAlta;
    const diasSinServicio = diasEntre(referencia, new Date());
    return {
      id: familia.id,
      inactiva: familia.estado !== 'SUSPENDIDA' && diasSinServicio >= UMBRAL_INACTIVIDAD_DIAS,
      diasSinServicio,
      nombreContacto: familia.nombreContacto,
      apellido: familia.apellido,
      telefono: familia.telefono,
      email: familia.email,
      numeroEmergencia: familia.numeroEmergencia,
      plaza: familia.plaza,
      zona: familia.zona,
      direccion: familia.direccion,
      estado: familia.estado,
      expectativas: familia.expectativas,
      reglasEspecificas: familia.reglasEspecificas,
      adultoResponsablePresente: familia.adultoResponsablePresente,
      mascotas: familia.mascotas,
      areasATrabajar: familia.areasATrabajar,
      autorizacionAudiovisual: familia.autorizacionAudiovisual,
      consentimientoReglamento: familia.consentimientoReglamento,
      consentimientoMedico: familia.consentimientoMedico,
      consentimientoPrivacidad: familia.consentimientoPrivacidad,
      consentimientoConfidencialidad: familia.consentimientoConfidencialidad,
      // Cada niño se filtra por rol: la nannie no recibe los campos identificables.
      ninos: familia.ninos.map((n) => filtrarCampos(user.rol, 'nino', n)),
      servicios: familia.servicios.map((s) => ({
        id: s.id,
        fecha: s.fecha.toISOString().slice(0, 10),
        horaInicio: s.horaInicio,
        horaFin: s.horaFin,
        tipoServicio: s.tipoServicio,
        nannie: s.nannie?.nombre ?? 'Por asignar',
        estado: s.estado,
      })),
      notas: familia.notas.map((n) => ({
        id: n.id,
        texto: n.texto,
        autor: n.autorNombre,
        fecha: n.creadoEn.toISOString().slice(0, 10),
      })),
      paqueteActivo: p
        ? {
            id: p.id,
            horasTotales: p.horasTotales,
            horasConsumidas: p.horasConsumidas,
            horasRestantes: p.horasTotales - p.horasConsumidas,
            asignacionManual: p.asignacionManual,
          }
        : null,
    };
  }

  /**
   * Ficha OPERATIVA de la familia para la nannie asignada (M5, Bloque 2 · Opción A).
   * Pertenencia: la nannie solo la ve si tiene un servicio COMPROMETIDO
   * (ACEPTADO/COMPLETADO) con esa familia — nunca por una oferta pendiente.
   * Los campos se filtran por rol: la nannie no recibe apellido/contactos de la
   * familia (FIELD_ACCESS.familia) ni los datos identificables del niño
   * (FIELD_ACCESS.nino). No incluye historial, bitácora ni paquete.
   */
  async fichaOperativa(familiaId: string, user: UsuarioAutenticado) {
    if (user.rol === 'NANNIE') {
      const comprometido = await this.prisma.servicio.findFirst({
        where: {
          familiaId,
          nannieId: user.nannieId ?? '__none__',
          estado: { in: ['ACEPTADO', 'COMPLETADO'] },
        },
        select: { id: true },
      });
      if (!comprometido) {
        throw new ForbiddenException('Solo ves la ficha de familias con un servicio tuyo confirmado.');
      }
    }

    const familia = await this.prisma.familia.findUnique({
      where: { id: familiaId },
      include: { ninos: { orderBy: { creadoEn: 'asc' } } },
    });
    if (!familia) throw new NotFoundException('Familia no encontrada');

    const campos = filtrarCampos(user.rol, 'familia', {
      nombreContacto: familia.nombreContacto,
      apellido: familia.apellido,
      telefono: familia.telefono,
      email: familia.email,
      numeroEmergencia: familia.numeroEmergencia,
      plaza: familia.plaza,
      zona: familia.zona,
      direccion: familia.direccion,
      estado: familia.estado,
      expectativas: familia.expectativas,
      reglasEspecificas: familia.reglasEspecificas,
      adultoResponsablePresente: familia.adultoResponsablePresente,
      mascotas: familia.mascotas,
      areasATrabajar: familia.areasATrabajar,
      autorizacionAudiovisual: familia.autorizacionAudiovisual,
    });

    return {
      id: familia.id,
      ...campos,
      ninos: familia.ninos.map((n) => filtrarCampos(user.rol, 'nino', n)),
    };
  }

  async crearNino(familiaId: string, dto: CrearNinoDto) {
    const familia = await this.prisma.familia.findUnique({ where: { id: familiaId } });
    if (!familia) throw new NotFoundException('Familia no encontrada');
    return this.prisma.nino.create({ data: { familiaId, ...dto } });
  }

  async editarNino(ninoId: string, dto: EditarNinoDto) {
    const nino = await this.prisma.nino.findUnique({ where: { id: ninoId } });
    if (!nino) throw new NotFoundException('Niño no encontrado');
    return this.prisma.nino.update({ where: { id: ninoId }, data: dto });
  }

  async eliminarNino(ninoId: string) {
    await this.prisma.nino.delete({ where: { id: ninoId } }).catch(() => undefined);
    return { ok: true };
  }

  /** 5.3 · Agrega una nota a la bitácora de la familia. */
  async crearNota(familiaId: string, dto: CrearNotaDto, user: UsuarioAutenticado) {
    const familia = await this.prisma.familia.findUnique({ where: { id: familiaId } });
    if (!familia) throw new NotFoundException('Familia no encontrada');
    return this.prisma.notaFamilia.create({
      data: { familiaId, texto: dto.texto, autorNombre: user.nombre },
    });
  }

  async eliminarNota(notaId: string) {
    await this.prisma.notaFamilia.delete({ where: { id: notaId } }).catch(() => undefined);
    return { ok: true };
  }
}
