import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoServicio, EstadoServicio } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { CrearDisponibilidadDto } from './dto/crear-disponibilidad.dto';
import { CrearServicioDto } from './dto/crear-servicio.dto';
import { OfertarDto } from './dto/ofertar.dto';
import { ResponderOfertaDto } from './dto/responder-oferta.dto';

// Estados desde los que un servicio ya no puede ofertarse.
const ESTADOS_CERRADOS: EstadoServicio[] = ['ACEPTADO', 'COMPLETADO', 'CANCELADO'];

// Tipos que atienden grupos (4-8 niños); el resto es 1-3 (Reglamento PF).
const TIPOS_GRUPO: TipoServicio[] = ['NANNIE_FIESTA_PLAYDATE', 'LUDOTECA_MOVIL'];

interface RangoFechas {
  desde?: string;
  hasta?: string;
  nannieId?: string;
}

@Injectable()
export class CalendarioService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- Disponibilidad ----------------

  async listarDisponibilidad(user: UsuarioAutenticado, filtro: RangoFechas) {
    // Pertenencia: una nannie solo ve la suya (SEGURIDAD §4).
    const nannieId = user.rol === 'NANNIE' ? user.nannieId ?? '__none__' : filtro.nannieId;

    return this.prisma.disponibilidad.findMany({
      where: {
        ...(nannieId ? { nannieId } : {}),
        ...(filtro.desde || filtro.hasta
          ? { fecha: { gte: fecha(filtro.desde), lte: fecha(filtro.hasta) } }
          : {}),
      },
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
    });
  }

  async crearDisponibilidad(user: UsuarioAutenticado, dto: CrearDisponibilidadDto) {
    // Autoservicio: cada quien marca SOLO su propia disponibilidad. Nadie
    // define la de otra persona (evita horarios forzados). Requiere ficha de
    // nannie — una coordinadora que también opera como nannie la tiene.
    if (!user.nannieId) {
      throw new ForbiddenException(
        'Solo puedes registrar tu propia disponibilidad (tu cuenta no está ligada a una ficha de nannie).',
      );
    }
    const nannieId = user.nannieId;

    if (dto.estado === 'TEMPORAL' && !dto.fechaReintegro) {
      throw new BadRequestException('Un bloqueo TEMPORAL requiere fechaReintegro');
    }
    if (dto.horaFin <= dto.horaInicio) {
      throw new BadRequestException('horaFin debe ser posterior a horaInicio');
    }

    return this.prisma.disponibilidad.create({
      data: {
        nannieId,
        fecha: fecha(dto.fecha)!,
        horaInicio: dto.horaInicio,
        horaFin: dto.horaFin,
        estado: dto.estado ?? 'DISPONIBLE',
        fechaReintegro: fecha(dto.fechaReintegro),
      },
    });
  }

  // ---------------- Servicios (tabla maestra M1) ----------------

  async listarServicios(user: UsuarioAutenticado, filtro: RangoFechas & { estado?: string }) {
    // Pertenencia: la nannie solo ve sus servicios.
    const nannieId = user.rol === 'NANNIE' ? user.nannieId ?? '__none__' : filtro.nannieId;

    return this.prisma.servicio.findMany({
      where: {
        ...(nannieId ? { nannieId } : {}),
        ...(esEstadoServicio(filtro.estado) ? { estado: filtro.estado } : {}),
        ...(filtro.desde || filtro.hasta
          ? { fecha: { gte: fecha(filtro.desde), lte: fecha(filtro.hasta) } }
          : {}),
      },
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
    });
  }

  async crearServicio(dto: CrearServicioDto) {
    // Regla de nº de niños por tipo (Reglamento PF).
    const esGrupo = TIPOS_GRUPO.includes(dto.tipoServicio);
    if (esGrupo && (dto.numNinos < 4 || dto.numNinos > 8)) {
      throw new BadRequestException('Este tipo de servicio admite de 4 a 8 niños');
    }
    if (!esGrupo && (dto.numNinos < 1 || dto.numNinos > 3)) {
      throw new BadRequestException('Este tipo de servicio admite de 1 a 3 niños');
    }
    if (dto.formato === 'PAQUETE' && !dto.paqueteId) {
      throw new BadRequestException('Un servicio de paquete requiere paqueteId');
    }

    const data: Prisma.ServicioCreateInput = {
      familia: { connect: { id: dto.familiaId } },
      plaza: dto.plaza,
      zona: dto.zona,
      tipoServicio: dto.tipoServicio,
      formato: dto.formato,
      numNinos: dto.numNinos,
      fecha: fecha(dto.fecha)!,
      horaInicio: dto.horaInicio,
      horaFin: dto.horaFin,
      duracionHoras: dto.duracionHoras,
      ...(dto.paqueteId ? { paquete: { connect: { id: dto.paqueteId } } } : {}),
    };
    return this.prisma.servicio.create({ data });
  }

  // ---------------- Ofertas y respuestas (1.3) ----------------

  /** Lista ligera de nannies para el selector de oferta (coordinación). */
  async listarNannies() {
    return this.prisma.nannie.findMany({
      select: { id: true, nombre: true, zonas: true, plaza: true, estado: true },
      orderBy: { nombre: 'asc' },
    });
  }

  /** Ofertar un servicio a una nannie: fija nannie + estado OFERTADO. */
  async ofertarServicio(dto: OfertarDto) {
    const servicio = await this.prisma.servicio.findUnique({ where: { id: dto.servicioId } });
    if (!servicio) throw new NotFoundException('Servicio no encontrado');
    if (ESTADOS_CERRADOS.includes(servicio.estado)) {
      throw new BadRequestException('Este servicio ya no se puede ofertar');
    }
    const nannie = await this.prisma.nannie.findUnique({ where: { id: dto.nannieId } });
    if (!nannie) throw new BadRequestException('Nannie no encontrada');

    return this.prisma.servicio.update({
      where: { id: dto.servicioId },
      data: { nannieId: dto.nannieId, estado: 'OFERTADO' },
    });
  }

  /**
   * Registrar la respuesta a una oferta (aceptó/rechazó).
   * Deja registro en `ofertas_respuesta` (alimenta estadística de rechazo, M6)
   * y actualiza el estado del servicio. Ambas cosas en una transacción.
   */
  async responderOferta(user: UsuarioAutenticado, servicioId: string, dto: ResponderOfertaDto) {
    const servicio = await this.prisma.servicio.findUnique({ where: { id: servicioId } });
    if (!servicio) throw new NotFoundException('Servicio no encontrado');
    if (servicio.estado !== 'OFERTADO' || !servicio.nannieId) {
      throw new BadRequestException('El servicio no está ofertado');
    }
    // Solo la nannie a quien se ofertó puede responder — nunca coordinación
    // (la decisión de aceptar un servicio es de la propia nannie). Una
    // coordinadora que también es nannie responde a las SUYAS por este mismo
    // camino (su nannieId coincide). SEGURIDAD §4.
    if (servicio.nannieId !== user.nannieId) {
      throw new ForbiddenException('Solo la nannie a quien se ofertó puede aceptar o rechazar.');
    }

    const nuevoEstado: EstadoServicio = dto.respuesta === 'ACEPTO' ? 'ACEPTADO' : 'RECHAZADO';
    const nannieId = servicio.nannieId;

    const [oferta] = await this.prisma.$transaction([
      this.prisma.ofertaRespuesta.create({
        data: { servicioId, nannieId, respuesta: dto.respuesta },
      }),
      this.prisma.servicio.update({ where: { id: servicioId }, data: { estado: nuevoEstado } }),
    ]);
    return oferta;
  }
}

function esEstadoServicio(v?: string): v is EstadoServicio {
  return !!v && (Object.values(EstadoServicio) as string[]).includes(v);
}

/** Convierte "YYYY-MM-DD" a Date (medianoche UTC) o undefined. */
function fecha(valor?: string): Date | undefined {
  return valor ? new Date(`${valor}T00:00:00.000Z`) : undefined;
}
