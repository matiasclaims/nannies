import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { filtrarCampos } from '../../core/rbac/permissions';
import { CrearFamiliaDto } from './dto/crear-familia.dto';
import { CrearPaqueteDto } from './dto/crear-paquete.dto';
import { CrearNinoDto, EditarNinoDto } from './dto/nino.dto';
import { CrearNotaDto } from './dto/crear-nota.dto';
import { tramoPorHoras } from './paquetes.tarifa';
import { tarifasZonaQro } from '../finanzas/queretaro-tarifas';

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
        plaza: true,
        zona: true,
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

    return familias.map(({ paquetes, servicios, _count, ...f }) => ({
      ...f,
      nServicios: _count.servicios,
      ultimaAtencion: servicios[0]?.fecha.toISOString().slice(0, 10) ?? null,
      paqueteActivo: paquetes[0]
        ? {
            id: paquetes[0].id,
            horasTotales: paquetes[0].horasTotales,
            horasConsumidas: paquetes[0].horasConsumidas,
            horasRestantes: paquetes[0].horasTotales - paquetes[0].horasConsumidas,
            asignacionManual: paquetes[0].asignacionManual,
          }
        : null,
    }));
  }

  crear(dto: CrearFamiliaDto) {
    return this.prisma.familia.create({
      data: {
        nombreContacto: dto.nombreContacto,
        plaza: dto.plaza,
        zona: dto.zona,
        telefono: dto.telefono,
      },
      select: { id: true, nombreContacto: true, plaza: true, zona: true },
    });
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
    return {
      id: familia.id,
      nombreContacto: familia.nombreContacto,
      telefono: familia.telefono,
      email: familia.email,
      plaza: familia.plaza,
      zona: familia.zona,
      estado: familia.estado,
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
