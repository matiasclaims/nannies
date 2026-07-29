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
import { EditarDisponibilidadDto } from './dto/editar-disponibilidad.dto';
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

    // Repetición semanal: crea el mismo bloque cada 7 días, `semanas` veces.
    const semanas = Math.min(Math.max(dto.semanas ?? 1, 1), 52);
    const base = fecha(dto.fecha)!;
    const bloques = Array.from({ length: semanas }, (_, i) => {
      const f = new Date(base);
      f.setUTCDate(base.getUTCDate() + i * 7);
      return {
        nannieId,
        fecha: f,
        horaInicio: dto.horaInicio,
        horaFin: dto.horaFin,
        estado: dto.estado ?? 'DISPONIBLE',
        fechaReintegro: fecha(dto.fechaReintegro),
      };
    });

    await this.prisma.$transaction(bloques.map((data) => this.prisma.disponibilidad.create({ data })));
    return { creados: bloques.length };
  }

  /** Editar un bloque de disponibilidad propio (corregir un error de captura). */
  async editarDisponibilidad(
    user: UsuarioAutenticado,
    id: string,
    dto: EditarDisponibilidadDto,
  ) {
    const bloque = await this.exigirBloquePropio(user, id);
    const horaInicio = dto.horaInicio ?? bloque.horaInicio;
    const horaFin = dto.horaFin ?? bloque.horaFin;
    if (horaFin <= horaInicio) {
      throw new BadRequestException('horaFin debe ser posterior a horaInicio');
    }
    return this.prisma.disponibilidad.update({
      where: { id },
      data: { horaInicio, horaFin, ...(dto.estado ? { estado: dto.estado } : {}) },
    });
  }

  /** Eliminar un bloque de disponibilidad propio. */
  async eliminarDisponibilidad(user: UsuarioAutenticado, id: string) {
    await this.exigirBloquePropio(user, id);
    await this.prisma.disponibilidad.delete({ where: { id } });
    return { ok: true };
  }

  /** Verifica que el bloque exista y sea de la propia nannie (pertenencia §4). */
  private async exigirBloquePropio(user: UsuarioAutenticado, id: string) {
    const bloque = await this.prisma.disponibilidad.findUnique({ where: { id } });
    if (!bloque) throw new NotFoundException('Bloque de disponibilidad no encontrado');
    if (bloque.nannieId !== user.nannieId) {
      throw new ForbiddenException('Solo puedes editar tu propia disponibilidad.');
    }
    return bloque;
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
    // M3: el cobro individual se captura al CREAR. cobroIndividual es la tarifa
    // POR HORA (menú $95–$160); cobroTotal es un total ya calculado (Ludoteca:
    // suma de estaciones). Se requiere uno de los dos para servicios individuales.
    const cobroSuelto =
      dto.cobroTotal != null && dto.cobroTotal > 0
        ? dto.cobroTotal
        : dto.cobroIndividual != null && dto.cobroIndividual > 0
          ? redondea2(dto.cobroIndividual * dto.duracionHoras)
          : null;
    if (dto.formato === 'INDIVIDUAL' && cobroSuelto == null) {
      throw new BadRequestException(
        'Un servicio individual requiere su cobro a la familia (tarifa por hora o total de estaciones).',
      );
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

    // Servicio suelto: crea el servicio y su finanza con el cobro calculado.
    if (dto.formato !== 'PAQUETE') {
      return this.prisma.$transaction(async (tx) => {
        const servicio = await tx.servicio.create({ data });
        await tx.finanzaServicio.create({
          data: { servicioId: servicio.id, cobroFamilia: cobroSuelto! },
        });
        return servicio;
      });
    }

    // Servicio contra paquete (M2): valida saldo y descuenta horas; el cobro de
    // la familia se PRORRATEA (precio/hora del paquete × horas del servicio).
    return this.prisma.$transaction(async (tx) => {
      const paquete = await tx.paquete.findUnique({ where: { id: dto.paqueteId } });
      if (!paquete || paquete.estado !== 'ACTIVO') {
        throw new BadRequestException('El paquete no existe o no está activo.');
      }
      if (paquete.familiaId !== dto.familiaId) {
        throw new BadRequestException('El paquete no pertenece a esta familia.');
      }
      const restantes = paquete.horasTotales - paquete.horasConsumidas;
      if (dto.duracionHoras > restantes) {
        throw new BadRequestException(
          `El paquete tiene ${restantes} h disponibles y el servicio pide ${dto.duracionHoras} h. ` +
            'Renueva el paquete o cóbralo como horas sueltas (se habilita en Finanzas · M3).',
        );
      }
      const consumidas = paquete.horasConsumidas + dto.duracionHoras;
      await tx.paquete.update({
        where: { id: paquete.id },
        data: {
          horasConsumidas: consumidas,
          estado: consumidas >= paquete.horasTotales ? 'CONSUMIDO' : 'ACTIVO',
        },
      });
      const servicio = await tx.servicio.create({ data });
      const cobroProrrateado = redondea2(
        (Number(paquete.precioTotal) / paquete.horasTotales) * dto.duracionHoras,
      );
      await tx.finanzaServicio.create({
        data: { servicioId: servicio.id, cobroFamilia: cobroProrrateado },
      });
      return servicio;
    });
  }

  /** Marca un servicio ACEPTADO como COMPLETADO. Solo la nannie asignada
   *  (cierra su propio servicio al concluirlo). El pago/nivel se estampa en la
   *  nómina (Paso 3). */
  async completarServicio(user: UsuarioAutenticado, servicioId: string) {
    const servicio = await this.prisma.servicio.findUnique({ where: { id: servicioId } });
    if (!servicio) throw new NotFoundException('Servicio no encontrado');
    if (servicio.nannieId !== user.nannieId) {
      throw new ForbiddenException('Solo la nannie asignada puede marcar el servicio como terminado.');
    }
    if (servicio.estado !== 'ACEPTADO') {
      throw new BadRequestException('Solo un servicio aceptado se puede marcar como terminado.');
    }
    return this.prisma.servicio.update({
      where: { id: servicioId },
      data: { estado: 'COMPLETADO' },
    });
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

    return this.prisma.$transaction(async (tx) => {
      const oferta = await tx.ofertaRespuesta.create({
        data: { servicioId, nannieId, respuesta: dto.respuesta },
      });
      await tx.servicio.update({ where: { id: servicioId }, data: { estado: nuevoEstado } });

      // Al ACEPTAR, el servicio consume las horas de disponibilidad de la nannie;
      // los sobrantes menores a 3 h (inservibles) se descartan (petición de Paula).
      if (dto.respuesta === 'ACEPTO') {
        await this.consumirDisponibilidad(
          tx,
          nannieId,
          servicio.fecha,
          servicio.horaInicio,
          servicio.horaFin,
        );
      }

      // Si se rechaza un servicio de paquete, se devuelven sus horas al saldo
      // (el consumo ocurrió al asignar; un rechazo no debe costarle a la familia).
      if (dto.respuesta === 'RECHAZO' && servicio.formato === 'PAQUETE' && servicio.paqueteId) {
        const paquete = await tx.paquete.findUnique({ where: { id: servicio.paqueteId } });
        if (paquete) {
          const consumidas = Math.max(0, paquete.horasConsumidas - servicio.duracionHoras);
          await tx.paquete.update({
            where: { id: paquete.id },
            data: {
              horasConsumidas: consumidas,
              estado: paquete.estado === 'CONSUMIDO' ? 'ACTIVO' : paquete.estado,
            },
          });
        }
      }
      return oferta;
    });
  }

  /**
   * Descuenta de la disponibilidad DISPONIBLE de la nannie el rango que ocupa un
   * servicio aceptado. El bloque original se parte: cada sobrante (antes/después
   * del servicio) sobrevive solo si mide 3 h o más; los menores se descartan
   * porque no alcanzan para otro servicio (mínimo 3 h).
   */
  private async consumirDisponibilidad(
    tx: Prisma.TransactionClient,
    nannieId: string,
    fechaServicio: Date,
    servIni: string,
    servFin: string,
  ) {
    const MIN_SERVICIO = 180; // 3 h en minutos
    const bloques = await tx.disponibilidad.findMany({
      where: { nannieId, fecha: fechaServicio, estado: 'DISPONIBLE' },
    });
    for (const b of bloques) {
      const traslapa = b.horaInicio < servFin && servIni < b.horaFin;
      if (!traslapa) continue;
      await tx.disponibilidad.delete({ where: { id: b.id } });
      // Sobrante antes del servicio.
      if (servIni > b.horaInicio && aMinCal(servIni) - aMinCal(b.horaInicio) >= MIN_SERVICIO) {
        await tx.disponibilidad.create({
          data: { nannieId, fecha: fechaServicio, horaInicio: b.horaInicio, horaFin: servIni, estado: 'DISPONIBLE' },
        });
      }
      // Sobrante después del servicio.
      if (servFin < b.horaFin && aMinCal(b.horaFin) - aMinCal(servFin) >= MIN_SERVICIO) {
        await tx.disponibilidad.create({
          data: { nannieId, fecha: fechaServicio, horaInicio: servFin, horaFin: b.horaFin, estado: 'DISPONIBLE' },
        });
      }
    }
  }
}

function aMinCal(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function esEstadoServicio(v?: string): v is EstadoServicio {
  return !!v && (Object.values(EstadoServicio) as string[]).includes(v);
}

/** Convierte "YYYY-MM-DD" a Date (medianoche UTC) o undefined. */
function fecha(valor?: string): Date | undefined {
  return valor ? new Date(`${valor}T00:00:00.000Z`) : undefined;
}

/** Redondea a 2 decimales (centavos). */
function redondea2(n: number): number {
  return Math.round(n * 100) / 100;
}
