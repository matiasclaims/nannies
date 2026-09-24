import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoServicio, EstadoServicio, Plaza } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { tramoPorHoras } from '../familias/paquetes.tarifa';
import { CrearDisponibilidadDto } from './dto/crear-disponibilidad.dto';
import { EditarDisponibilidadDto } from './dto/editar-disponibilidad.dto';
import { CrearServicioDto } from './dto/crear-servicio.dto';
import { OfertarDto } from './dto/ofertar.dto';
import { ResponderOfertaDto } from './dto/responder-oferta.dto';
import { EditarHorarioDto } from './dto/editar-horario.dto';
import { ResolverDesbordeDto } from './dto/resolver-desborde.dto';
import { dividirDiaNoche, TARIFA_NOCHE_MIN } from '../finanzas/dividir-dia-noche';
import { tarifasZonaQro } from '../finanzas/queretaro-tarifas';

// Estados desde los que un servicio ya no puede ofertarse.
const ESTADOS_CERRADOS: EstadoServicio[] = ['ACEPTADO', 'COMPLETADO', 'CANCELADO'];

// Tipos que atienden grupos (4-8 niños); el resto es 1-3 (Reglamento PF).
const TIPOS_GRUPO: TipoServicio[] = ['NANNIE_FIESTA_PLAYDATE', 'LUDOTECA_MOVIL'];

// Nannie de fiesta (PE/PEqro 2026, Mario 2026-09-21):
//  - COBRO a la familia: Toluca $250/h fijo; Querétaro por zona (cobroFiestaHora).
//  - PAGO a la nannie: Toluca por tabulador Fiesta 3-6 h (fuera de eso, pago
//    pendiente/manual en Finanzas); Querétaro por zona (pagoFiestaHora × horas).
//  - DURACIÓN permitida: Toluca 2-10 h; Querétaro 3-5 h.
const COBRO_FIESTA_HORA = 250; // solo Toluca
function rangoFiesta(plaza: Plaza): { min: number; max: number } {
  return plaza === 'QUERETARO' ? { min: 3, max: 5 } : { min: 2, max: 10 };
}

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
    // horaFin 00:00 = medianoche (fin de día), permitido; el resto debe ser posterior.
    if ((dto.horaFin === '00:00' ? 24 * 60 : aMin(dto.horaFin)) <= aMin(dto.horaInicio)) {
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

    // No permitir traslapar ni repetir horarios con lo que la nannie ya tiene
    // ese día (aplica a disponibles y bloqueos por igual).
    const fechas = bloques.map((b) => b.fecha);
    const existentes = await this.prisma.disponibilidad.findMany({
      where: { nannieId, fecha: { in: fechas } },
    });
    for (const b of bloques) {
      const choque = existentes.find(
        (e) => mismoDiaUTC(e.fecha, b.fecha) && seTraslapan(b.horaInicio, b.horaFin, e.horaInicio, e.horaFin),
      );
      if (choque) {
        const dia = b.fecha.toISOString().slice(0, 10);
        throw new BadRequestException(
          `Ese horario se encima con otro bloque que ya tienes el ${dia} (${choque.horaInicio}–${choque.horaFin}). Ajusta la hora o elimina el bloque anterior.`,
        );
      }
    }

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
    if ((horaFin === '00:00' ? 24 * 60 : aMin(horaFin)) <= aMin(horaInicio)) {
      throw new BadRequestException('horaFin debe ser posterior a horaInicio');
    }
    // No permitir que el nuevo horario se encime con otro bloque del mismo día.
    const otros = await this.prisma.disponibilidad.findMany({
      where: { nannieId: bloque.nannieId, fecha: bloque.fecha, id: { not: id } },
    });
    const choque = otros.find((e) => seTraslapan(horaInicio, horaFin, e.horaInicio, e.horaFin));
    if (choque) {
      throw new BadRequestException(
        `Ese horario se encima con otro bloque tuyo ese día (${choque.horaInicio}–${choque.horaFin}). Ajusta la hora.`,
      );
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

    const rows = await this.prisma.servicio.findMany({
      where: {
        ...(nannieId ? { nannieId } : {}),
        ...(esEstadoServicio(filtro.estado) ? { estado: filtro.estado } : {}),
        ...(filtro.desde || filtro.hasta
          ? { fecha: { gte: fecha(filtro.desde), lte: fecha(filtro.hasta) } }
          : {}),
      },
      include: {
        familia: { select: { nombreContacto: true, ninos: { select: { nombre: true }, orderBy: { creadoEn: 'asc' } } } },
      },
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
    });

    // La familia/niños solo se exponen a COORDINACIÓN (en su calendario de equipo).
    // A la nannie NO (Opción A · privacidad): su ficha operativa va por otra ruta.
    const esCoord = user.rol !== 'NANNIE';
    return rows.map(({ familia, ...s }) => ({
      ...s,
      familia: esCoord ? familia.nombreContacto : null,
      ninos: esCoord ? familia.ninos.map((n) => n.nombre).filter(Boolean) : [],
    }));
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
    // Mínimo de 3 h solo para servicios sueltos/individuales (piso de cobro). Un
    // servicio de PAQUETE puede ser de 1-2 h (horas ya pagadas, Opción B); la
    // LUDOTECA admite desde 1 h y la FIESTA tiene su propio rango por plaza (abajo).
    if (
      dto.formato !== 'PAQUETE' &&
      dto.tipoServicio !== 'LUDOTECA_MOVIL' &&
      dto.tipoServicio !== 'NANNIE_FIESTA_PLAYDATE' &&
      dto.duracionHoras < 3
    ) {
      throw new BadRequestException('El mínimo de horas por servicio es 3');
    }
    // Fiesta: rango por plaza (Toluca 2-10 h, Qro 3-5 h). PE/PEqro 2026.
    if (dto.tipoServicio === 'NANNIE_FIESTA_PLAYDATE') {
      const { min, max } = rangoFiesta(dto.plaza);
      if (dto.duracionHoras < min || dto.duracionHoras > max) {
        const p = dto.plaza === 'QUERETARO' ? 'Querétaro' : 'Toluca';
        throw new BadRequestException(`Una nannie de fiesta en ${p} es de ${min} a ${max} horas.`);
      }
    }
    // M3 · cobro individual al CREAR. Querétaro: esquema por zona (sin Ludoteca);
    // fiesta por hora, individuales con bandas por NIVEL (día: Básico/Interm/Premium;
    // noche: solo Interm/Premium). Toluca: Ludoteca por `cobroTotal`; los demás por
    // bandas de MONTO ($95–$160, noche ≥ $125). cobro = tarifaDía×hDía + tarifaNoche×hNoche.
    let tarifaDia: number | null = null;
    let tarifaNoche: number | null = null;
    let cobroSuelto: number | null = null;

    if (dto.formato !== 'PAQUETE') {
      const { horasDia, horasNoche } = dividirDiaNoche(dto.horaInicio, dto.duracionHoras);

      if (dto.tipoServicio === 'NANNIE_FIESTA_PLAYDATE') {
        // Cobro: Toluca $250/h fijo; Querétaro por zona (PEqro). El PAGO en Qro
        // también va por zona (pagoFiestaHora), por eso se valida la zona.
        if (dto.plaza === 'QUERETARO') {
          const tz = tarifasZonaQro(dto.zona);
          if (!tz) throw new BadRequestException(`Zona de Querétaro no reconocida: "${dto.zona}".`);
          cobroSuelto = redondea2(tz.cobroFiestaHora * dto.duracionHoras);
        } else {
          cobroSuelto = redondea2(COBRO_FIESTA_HORA * dto.duracionHoras);
        }
      } else if (dto.plaza === 'QUERETARO') {
        if (dto.tipoServicio === 'LUDOTECA_MOVIL') {
          throw new BadRequestException('Querétaro no ofrece servicio de Ludoteca.');
        }
        const tz = tarifasZonaQro(dto.zona);
        if (!tz) throw new BadRequestException(`Zona de Querétaro no reconocida: "${dto.zona}".`);
        if (horasDia > 0) {
          if (!dto.nivelDia)
            throw new BadRequestException('Falta el nivel de día (Básico, Intermedio o Premium).');
          tarifaDia = tz.cobroIndividualHora[dto.nivelDia];
        }
        if (horasNoche > 0) {
          if (!dto.nivelNoche)
            throw new BadRequestException('Falta el nivel de noche (Intermedio o Premium).');
          if (dto.nivelNoche === 'BASICO')
            throw new BadRequestException(
              'De noche (desde 19:00) el nivel Básico no está disponible en Querétaro.',
            );
          tarifaNoche = tz.cobroIndividualHora[dto.nivelNoche];
        }
        cobroSuelto = redondea2((tarifaDia ?? 0) * horasDia + (tarifaNoche ?? 0) * horasNoche);
      } else if (dto.cobroTotal != null && dto.cobroTotal > 0) {
        cobroSuelto = dto.cobroTotal; // Ludoteca (Toluca): total de estaciones
      } else {
        if (horasDia > 0) {
          if (!dto.tarifaDia || dto.tarifaDia <= 0)
            throw new BadRequestException('Falta la tarifa de día para este servicio.');
          tarifaDia = dto.tarifaDia;
        }
        if (horasNoche > 0) {
          if (!dto.tarifaNoche || dto.tarifaNoche <= 0)
            throw new BadRequestException('Falta la tarifa de noche para este servicio.');
          if (dto.tarifaNoche < TARIFA_NOCHE_MIN)
            throw new BadRequestException(`La tarifa de noche mínima es $${TARIFA_NOCHE_MIN}.`);
          tarifaNoche = dto.tarifaNoche;
        }
        if (tarifaDia != null || tarifaNoche != null) {
          cobroSuelto = redondea2((tarifaDia ?? 0) * horasDia + (tarifaNoche ?? 0) * horasNoche);
        }
      }
    }
    if (dto.formato === 'INDIVIDUAL' && cobroSuelto == null) {
      throw new BadRequestException('Un servicio individual requiere su cobro a la familia.');
    }

    const data: Prisma.ServicioCreateInput = {
      familia: { connect: { id: dto.familiaId } },
      plaza: dto.plaza,
      zona: dto.zona,
      ...(dto.direccion?.trim() ? { direccion: dto.direccion.trim() } : {}),
      ...(dto.coloniaId ? { coloniaToluca: { connect: { id: dto.coloniaId } } } : {}),
      tipoServicio: dto.tipoServicio,
      formato: dto.formato,
      numNinos: dto.numNinos,
      requierePlaneacion: dto.requierePlaneacion ?? false,
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
          data: { servicioId: servicio.id, cobroFamilia: cobroSuelto!, tarifaDia, tarifaNoche },
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
      // DESBORDE: si el servicio pide más horas de las que quedan, el paquete
      // cubre las que puede y el resto se maneja aparte (ya no se bloquea).
      // Sin mínimo de 3 h para la parte de PAQUETE (Paula/Mario 2026-09-15): son
      // horas ya pagadas. El mínimo de 3 h solo aplica a sueltas/individuales.
      const horasPaquete = Math.min(dto.duracionHoras, restantes);
      const horasDesborde = dto.duracionHoras - horasPaquete;
      const horaFinPaquete = horasDesborde > 0 ? sumarHoras(dto.horaInicio, horasPaquete) : dto.horaFin;

      const consumidas = paquete.horasConsumidas + horasPaquete;
      await tx.paquete.update({
        where: { id: paquete.id },
        data: {
          horasConsumidas: consumidas,
          estado: consumidas >= paquete.horasTotales ? 'CONSUMIDO' : 'ACTIVO',
        },
      });
      const servicio = await tx.servicio.create({
        data: { ...data, horaFin: horaFinPaquete, duracionHoras: horasPaquete },
      });
      const cobroProrrateado = redondea2(
        (Number(paquete.precioTotal) / paquete.horasTotales) * horasPaquete,
      );
      await tx.finanzaServicio.create({
        data: { servicioId: servicio.id, cobroFamilia: cobroProrrateado },
      });

      if (horasDesborde > 0) {
        await this.crearServicioDesborde(
          tx,
          {
            familiaId: dto.familiaId,
            nannieId: null, // el servicio base aún no tiene nannie (la fija ofertar)
            plaza: dto.plaza,
            zona: dto.zona,
            direccion: dto.direccion?.trim() || null,
            coloniaId: dto.coloniaId ?? null,
            tipoServicio: dto.tipoServicio,
            numNinos: dto.numNinos,
            fecha: fecha(dto.fecha)!,
            estado: 'OFERTADO',
            requierePlaneacion: dto.requierePlaneacion ?? false,
          },
          horaFinPaquete,
          dto.horaFin,
          horasDesborde,
          dto,
        );
      }
      return servicio;
    });
  }

  /**
   * Edita la hora fin de un servicio (M3 · "merodeo": la familia se queda más
   * tiempo). Recalcula duración y cobro y hace cascada a finanzas. Solo
   * coordinación. El pago a la nannie se recalcula solo (nómina/margen lo
   * derivan de la duración). Reglas por formato:
   *  - Individual (bandas): cobro = tarifaDía×hDía + tarifaNoche×hNoche con la
   *    nueva duración. Si la extensión entra a noche y no había tarifa de noche,
   *    se toma la que venga en el DTO (piso $125).
   *  - Paquete: reprorratea el cobro y ajusta las horas consumidas del paquete
   *    (con verificación de saldo).
   *  - Ludoteca (cobro por estaciones): el cobro no cambia; solo la duración.
   */
  async editarHorario(servicioId: string, dto: EditarHorarioDto) {
    const servicio = await this.prisma.servicio.findUnique({
      where: { id: servicioId },
      include: { finanza: true, paquete: true },
    });
    if (!servicio) throw new NotFoundException('Servicio no encontrado');
    if (servicio.estado === 'CANCELADO' || servicio.estado === 'RECHAZADO') {
      throw new BadRequestException('No se puede editar un servicio cancelado o rechazado.');
    }

    const nuevaDur = horasEntre(servicio.horaInicio, dto.horaFin);
    if (nuevaDur == null) {
      throw new BadRequestException('El nuevo horario debe dar horas completas.');
    }
    // Mínimo 3 h, salvo LUDOTECA (desde 1 h) y FIESTA (rango propio por plaza).
    if (
      nuevaDur < 3 &&
      servicio.tipoServicio !== 'LUDOTECA_MOVIL' &&
      servicio.tipoServicio !== 'NANNIE_FIESTA_PLAYDATE'
    ) {
      throw new BadRequestException('El nuevo horario debe dar horas completas y mínimo 3 h.');
    }
    if (servicio.tipoServicio === 'NANNIE_FIESTA_PLAYDATE') {
      const { min, max } = rangoFiesta(servicio.plaza);
      if (nuevaDur < min || nuevaDur > max) {
        const p = servicio.plaza === 'QUERETARO' ? 'Querétaro' : 'Toluca';
        throw new BadRequestException(`Una nannie de fiesta en ${p} es de ${min} a ${max} horas.`);
      }
    }
    if (nuevaDur === servicio.duracionHoras) return servicio; // sin cambio

    return this.prisma.$transaction(async (tx) => {
      // Por defecto la duración/fin nuevos son los pedidos. En PAQUETE con
      // DESBORDE, la parte del paquete se limita al saldo y el resto se crea
      // aparte (ya no se bloquea la extensión).
      let durBase = nuevaDur;
      let finBase = dto.horaFin;
      let horasDesborde = 0;

      if (servicio.formato === 'PAQUETE' && servicio.paquete) {
        const delta = nuevaDur - servicio.duracionHoras;
        const restantes = servicio.paquete.horasTotales - servicio.paquete.horasConsumidas;
        const deltaPaquete = Math.min(delta, restantes); // lo que el saldo puede absorber
        horasDesborde = delta - deltaPaquete;
        durBase = servicio.duracionHoras + deltaPaquete;
        finBase = horasDesborde > 0 ? sumarHoras(servicio.horaInicio, durBase) : dto.horaFin;
        const consumidas = servicio.paquete.horasConsumidas + deltaPaquete;
        await tx.paquete.update({
          where: { id: servicio.paquete.id },
          data: {
            horasConsumidas: consumidas,
            estado: consumidas >= servicio.paquete.horasTotales ? 'CONSUMIDO' : 'ACTIVO',
          },
        });
      }

      // Recalcula el cobro de la parte base según el formato.
      let nuevoCobro: number;
      let nuevaTarifaNoche = servicio.finanza?.tarifaNoche ? Number(servicio.finanza.tarifaNoche) : null;
      if (servicio.formato === 'PAQUETE' && servicio.paquete) {
        nuevoCobro = redondea2(
          (Number(servicio.paquete.precioTotal) / servicio.paquete.horasTotales) * durBase,
        );
      } else if (servicio.tipoServicio === 'NANNIE_FIESTA_PLAYDATE') {
        // Fiesta: Toluca $250/h; Querétaro por zona.
        const tzF = servicio.plaza === 'QUERETARO' ? tarifasZonaQro(servicio.zona) : null;
        nuevoCobro = redondea2((tzF ? tzF.cobroFiestaHora : COBRO_FIESTA_HORA) * durBase);
      } else if (servicio.finanza?.tarifaDia != null || servicio.finanza?.tarifaNoche != null) {
        const { horasDia, horasNoche } = dividirDiaNoche(servicio.horaInicio, durBase);
        const td = servicio.finanza.tarifaDia ? Number(servicio.finanza.tarifaDia) : 0;
        let tn = nuevaTarifaNoche ?? 0;
        if (horasNoche > 0 && tn <= 0) {
          // La extensión entró a horario de noche y no había tarifa de noche.
          if (!dto.tarifaNoche) {
            throw new BadRequestException(
              'La extensión entra a horario de noche: falta la tarifa de noche.',
            );
          }
          tn = dto.tarifaNoche;
          nuevaTarifaNoche = tn;
        }
        if (horasNoche > 0 && tn < TARIFA_NOCHE_MIN) {
          throw new BadRequestException(`La tarifa de noche mínima es $${TARIFA_NOCHE_MIN}.`);
        }
        if (horasDia > 0 && td <= 0) {
          throw new BadRequestException('Falta la tarifa de día de este servicio.');
        }
        nuevoCobro = redondea2(td * horasDia + tn * horasNoche);
      } else {
        // Ludoteca u otro cobro total por estaciones: no depende de las horas.
        nuevoCobro = servicio.finanza ? Number(servicio.finanza.cobroFamilia) : 0;
      }

      const actualizado = await tx.servicio.update({
        where: { id: servicioId },
        data: { horaFin: finBase, duracionHoras: durBase },
      });
      if (servicio.finanza) {
        await tx.finanzaServicio.update({
          where: { servicioId },
          data: { cobroFamilia: nuevoCobro, tarifaNoche: nuevaTarifaNoche },
        });
      }

      // Desborde de la extensión: las horas que no cupieron en el saldo del
      // paquete se crean como servicio contiguo (misma nannie), según la decisión.
      if (horasDesborde > 0) {
        await this.crearServicioDesborde(
          tx,
          {
            familiaId: servicio.familiaId,
            nannieId: servicio.nannieId,
            plaza: servicio.plaza,
            zona: servicio.zona,
            direccion: servicio.direccion,
            coloniaId: servicio.coloniaId,
            tipoServicio: servicio.tipoServicio,
            numNinos: servicio.numNinos,
            fecha: servicio.fecha,
            estado: servicio.estado,
            requierePlaneacion: servicio.requierePlaneacion,
          },
          finBase,
          dto.horaFin,
          horasDesborde,
          dto,
        );
      }
      return actualizado;
    });
  }

  /**
   * Crea el servicio de DESBORDE: las horas que un servicio de paquete pidió de
   * más y que el saldo no cubrió. Es un servicio contiguo (misma nannie/fecha,
   * arranca donde acaba la parte cubierta). Según la decisión de coordinación:
   *  - INDIVIDUAL: se cobra al tabulador de sueltas (monto que captura coordinación).
   *  - PAQUETE_NUEVO: crea un paquete nuevo y consume el desborde de él (prorrateo).
   *  - POR_DEFINIR: queda como ADEUDO (estadoCobro POR_DEFINIR, sin cobro) para
   *    resolverse después. En los tres casos la nannie SÍ cobra sus horas (nómina
   *    paga por duración del servicio COMPLETADO). Sin mínimo de 3 h (son sobrantes).
   */
  private async crearServicioDesborde(
    tx: Prisma.TransactionClient,
    origen: {
      familiaId: string;
      nannieId: string | null;
      plaza: Plaza;
      zona: string;
      direccion: string | null;
      coloniaId: string | null;
      tipoServicio: TipoServicio;
      numNinos: number;
      fecha: Date;
      estado: EstadoServicio;
      requierePlaneacion: boolean;
    },
    horaInicio: string,
    horaFin: string,
    horas: number,
    decision: {
      desbordeModo?: 'INDIVIDUAL' | 'PAQUETE_NUEVO' | 'POR_DEFINIR';
      desbordeCobro?: number;
      desbordePaqueteHoras?: number;
    },
  ): Promise<void> {
    if (!decision.desbordeModo) {
      throw new BadRequestException(
        `El servicio pide ${horas} h más de las que le quedan al paquete. Indica qué hacer con ese ` +
          'desborde: cobrarlo individual, pasarlo a un paquete nuevo, o dejarlo por definir (adeudo).',
      );
    }

    const base: Prisma.ServicioCreateInput = {
      familia: { connect: { id: origen.familiaId } },
      ...(origen.nannieId ? { nannie: { connect: { id: origen.nannieId } } } : {}),
      plaza: origen.plaza,
      zona: origen.zona,
      ...(origen.direccion ? { direccion: origen.direccion } : {}),
      ...(origen.coloniaId ? { coloniaToluca: { connect: { id: origen.coloniaId } } } : {}),
      tipoServicio: origen.tipoServicio,
      numNinos: origen.numNinos,
      requierePlaneacion: origen.requierePlaneacion,
      fecha: origen.fecha,
      horaInicio,
      horaFin,
      duracionHoras: horas,
      estado: origen.estado,
      esDesborde: true,
      formato: 'INDIVIDUAL',
    };

    if (decision.desbordeModo === 'POR_DEFINIR') {
      const s = await tx.servicio.create({ data: { ...base, estadoCobro: 'POR_DEFINIR' } });
      await tx.finanzaServicio.create({ data: { servicioId: s.id, cobroFamilia: 0 } });
      return;
    }

    if (decision.desbordeModo === 'INDIVIDUAL') {
      if (!decision.desbordeCobro) {
        throw new BadRequestException('Falta el cobro de las horas de desborde individuales.');
      }
      const s = await tx.servicio.create({ data: { ...base, estadoCobro: 'DEFINIDO' } });
      await tx.finanzaServicio.create({
        data: { servicioId: s.id, cobroFamilia: redondea2(decision.desbordeCobro) },
      });
      return;
    }

    // PAQUETE_NUEVO: crea un paquete nuevo del tabulador y consume el desborde.
    const tramo = tramoPorHoras(decision.desbordePaqueteHoras ?? 0);
    if (!tramo) {
      throw new BadRequestException('Elige un tamaño de paquete válido (10, 20, 30, 40 o 50 h) para el desborde.');
    }
    if (horas > tramo.horas) {
      throw new BadRequestException(`El desborde de ${horas} h no cabe en un paquete de ${tramo.horas} h.`);
    }
    const nuevo = await tx.paquete.create({
      data: {
        familia: { connect: { id: origen.familiaId } },
        horasTotales: tramo.horas,
        horasConsumidas: horas,
        precioTotal: tramo.precioTotal,
        estado: horas >= tramo.horas ? 'CONSUMIDO' : 'ACTIVO',
        fechaContratacion: origen.fecha,
      },
    });
    const cobro = redondea2((tramo.precioTotal / tramo.horas) * horas);
    const s = await tx.servicio.create({
      data: { ...base, formato: 'PAQUETE', estadoCobro: 'DEFINIDO', paquete: { connect: { id: nuevo.id } } },
    });
    await tx.finanzaServicio.create({ data: { servicioId: s.id, cobroFamilia: cobro } });
  }

  /**
   * Resuelve un ADEUDO por definir (servicio de desborde POR_DEFINIR). Coordinación
   * decide cómo se factura: INDIVIDUAL (fija el cobro) o PAQUETE_NUEVO (crea un
   * paquete nuevo y consume de él las horas). Al resolverse, el servicio pasa a
   * estadoCobro DEFINIDO y su ingreso ya cuenta en Finanzas (Mario 2026-09-18).
   */
  async resolverDesborde(servicioId: string, dto: ResolverDesbordeDto) {
    const servicio = await this.prisma.servicio.findUnique({ where: { id: servicioId } });
    if (!servicio) throw new NotFoundException('Servicio no encontrado');
    if (!servicio.esDesborde || servicio.estadoCobro !== 'POR_DEFINIR') {
      throw new BadRequestException('Este servicio no es un adeudo por definir.');
    }

    if (dto.modo === 'INDIVIDUAL') {
      if (!dto.cobro) throw new BadRequestException('Falta el cobro de las horas.');
      await this.prisma.$transaction(async (tx) => {
        await tx.finanzaServicio.update({
          where: { servicioId },
          data: { cobroFamilia: redondea2(dto.cobro!) },
        });
        await tx.servicio.update({ where: { id: servicioId }, data: { estadoCobro: 'DEFINIDO' } });
      });
      return { ok: true as const, modo: 'INDIVIDUAL' as const };
    }

    // PAQUETE_NUEVO: crea el paquete nuevo y liga el desborde para consumirlo.
    const tramo = tramoPorHoras(dto.paqueteHoras ?? 0);
    if (!tramo) {
      throw new BadRequestException('Elige un tamaño de paquete válido (10, 20, 30, 40 o 50 h).');
    }
    if (servicio.duracionHoras > tramo.horas) {
      throw new BadRequestException(
        `El desborde de ${servicio.duracionHoras} h no cabe en un paquete de ${tramo.horas} h.`,
      );
    }
    const nuevoId = await this.prisma.$transaction(async (tx) => {
      const nuevo = await tx.paquete.create({
        data: {
          familia: { connect: { id: servicio.familiaId } },
          horasTotales: tramo.horas,
          horasConsumidas: servicio.duracionHoras,
          precioTotal: tramo.precioTotal,
          estado: servicio.duracionHoras >= tramo.horas ? 'CONSUMIDO' : 'ACTIVO',
          fechaContratacion: servicio.fecha,
        },
      });
      const cobro = redondea2((tramo.precioTotal / tramo.horas) * servicio.duracionHoras);
      await tx.finanzaServicio.update({ where: { servicioId }, data: { cobroFamilia: cobro } });
      await tx.servicio.update({
        where: { id: servicioId },
        data: { estadoCobro: 'DEFINIDO', formato: 'PAQUETE', paquete: { connect: { id: nuevo.id } } },
      });
      return nuevo.id;
    });
    return { ok: true as const, modo: 'PAQUETE_NUEVO' as const, paqueteId: nuevoId };
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
    // Candado (Mario 2026-09-21): una NANNIE no puede completar un servicio a
    // futuro (evita cobrar algo aún no dado). Coordinación sí puede (override).
    if (user.rol === 'NANNIE') {
      const ahora = new Date();
      const hoyMin = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate());
      if (servicio.fecha.getTime() > hoyMin) {
        throw new BadRequestException('Aún no puedes marcar terminado un servicio que no ha llegado: se habilita el día del servicio.');
      }
    }
    // Al completar, cuenta un servicio de por vida (base del ascenso de rango,
    // que se evalúa en el cierre de mes). Transición ACEPTADO→COMPLETADO única.
    // Conteo para niveles (Paula, Opción A): un servicio INDIVIDUAL cuenta 1;
    // un PAQUETE cuenta 1 por nannie — solo su PRIMERA sesión completada de ese
    // paquete —, sin importar cuántas sesiones haga (para no acelerar el rango).
    return this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.servicio.update({
        where: { id: servicioId },
        data: { estado: 'COMPLETADO', completadoEn: new Date() },
      });
      if (servicio.nannieId) {
        let cuentaParaNivel = true;
        if (servicio.formato === 'PAQUETE' && servicio.paqueteId) {
          const yaContado = await tx.servicio.count({
            where: {
              paqueteId: servicio.paqueteId,
              nannieId: servicio.nannieId,
              estado: 'COMPLETADO',
              id: { not: servicioId }, // excluye el que se acaba de completar
            },
          });
          cuentaParaNivel = yaContado === 0;
        }
        if (cuentaParaNivel) {
          await tx.nannie.update({
            where: { id: servicio.nannieId },
            data: { serviciosAcumulados: { increment: 1 } },
          });
        }
      }
      return actualizado;
    });
  }

  /**
   * Reasignar un servicio a otra nannie (una nannie cubre a otra). Coordinación.
   * Queda directamente ASIGNADO (no se re-oferta). Sirve para suelto y paquete.
   */
  async reasignarServicio(servicioId: string, nannieId: string) {
    const servicio = await this.prisma.servicio.findUnique({ where: { id: servicioId } });
    if (!servicio) throw new NotFoundException('Servicio no encontrado');
    if (servicio.estado !== 'OFERTADO' && servicio.estado !== 'ACEPTADO') {
      throw new BadRequestException('Solo se puede reasignar un servicio ofertado o aceptado.');
    }
    const nannie = await this.prisma.nannie.findUnique({ where: { id: nannieId }, select: { id: true } });
    if (!nannie) throw new BadRequestException('Nannie no encontrada.');
    // Candado anti-duplicidad: la nueva nannie no debe tener otro servicio que se
    // traslape ese día (excluyendo este mismo).
    await this.verificarSinChoque(nannieId, servicio.fecha, servicio.horaInicio, servicio.horaFin, servicio.id);
    await this.prisma.servicio.update({
      where: { id: servicioId },
      data: { nannieId, estado: 'ACEPTADO' },
    });
    return { ok: true };
  }

  /**
   * Cancelar un servicio (la familia canceló). Coordinación. La regla de 24h
   * decide por defecto si se cobra, pero coordinación tiene la última palabra
   * (`cobrar`). En paquete, si NO se cobra se devuelve la hora al saldo.
   */
  async cancelarServicio(servicioId: string, motivo: string | undefined, cobrar: boolean) {
    const servicio = await this.prisma.servicio.findUnique({ where: { id: servicioId } });
    if (!servicio) throw new NotFoundException('Servicio no encontrado');
    if (servicio.estado === 'CANCELADO' || servicio.estado === 'COMPLETADO') {
      throw new BadRequestException('Este servicio ya no se puede cancelar.');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.servicio.update({
        where: { id: servicioId },
        data: { estado: 'CANCELADO', motivoCancelacion: motivo?.trim() || null, canceladaCobrada: cobrar },
      });
      if (!cobrar && servicio.formato === 'PAQUETE' && servicio.paqueteId) {
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
      return { ok: true };
    });
  }

  /**
   * Reprogramar un servicio a otra fecha (la familia pide otro día). Coordinación.
   * Conserva nannie, duración y cobro; solo cambia la fecha (y opcionalmente la
   * hora de inicio, corriendo la de fin la misma duración). Política 16c: un
   * servicio individual pagado solo puede reprogramarse dentro de 7 días. El
   * umbral de 24h queda a criterio de coordinación (no se bloquea aquí).
   */
  async reprogramarServicio(servicioId: string, nuevaFecha: string, horaInicio?: string) {
    const servicio = await this.prisma.servicio.findUnique({ where: { id: servicioId } });
    if (!servicio) throw new NotFoundException('Servicio no encontrado');
    if (servicio.estado !== 'OFERTADO' && servicio.estado !== 'ACEPTADO') {
      throw new BadRequestException('Solo se puede reprogramar un servicio ofertado o aceptado.');
    }
    const nueva = fecha(nuevaFecha);
    if (!nueva) throw new BadRequestException('Fecha no válida.');

    const dias = Math.round((nueva.getTime() - servicio.fecha.getTime()) / 86_400_000);
    if (dias === 0 && (!horaInicio || horaInicio === servicio.horaInicio)) {
      throw new BadRequestException('Elige una fecha u hora distinta a la actual.');
    }
    if (servicio.formato === 'INDIVIDUAL' && Math.abs(dias) > 7) {
      throw new BadRequestException(
        'Un servicio individual pagado solo puede reprogramarse dentro de 7 días.',
      );
    }

    let horaIni = servicio.horaInicio;
    let horaFin = servicio.horaFin;
    if (horaInicio && horaInicio !== servicio.horaInicio) {
      horaIni = horaInicio;
      horaFin = sumarHoras(horaInicio, servicio.duracionHoras);
    }

    await this.prisma.servicio.update({
      where: { id: servicioId },
      data: { fecha: nueva, horaInicio: horaIni, horaFin },
    });
    return { ok: true };
  }

  // ---------------- Ofertas y respuestas (1.3) ----------------

  /** Lista ligera de nannies para el selector de oferta (coordinación). */
  async listarNannies() {
    return this.prisma.nannie.findMany({
      select: { id: true, nombre: true, foto: true, color: true, zonas: true, plaza: true, estado: true },
      orderBy: { nombre: 'asc' },
    });
  }

  /**
   * Lanza si `nannieId` ya tiene OTRO servicio OFERTADO/ACEPTADO ese día cuyo
   * horario se traslapa (candado anti-duplicidad; Mario 2026-09-17). El estado
   * OFERTADO ya cuenta como ocupada, aunque la nannie no haya aceptado todavía.
   */
  async verificarSinChoque(
    nannieId: string,
    dia: Date | string,
    horaInicio: string,
    horaFin: string,
    excluirServicioId?: string,
  ): Promise<void> {
    const f = typeof dia === 'string' ? fecha(dia)! : dia;
    const otros = await this.prisma.servicio.findMany({
      where: {
        nannieId,
        fecha: f,
        estado: { in: ['OFERTADO', 'ACEPTADO'] },
        ...(excluirServicioId ? { id: { not: excluirServicioId } } : {}),
      },
      select: { horaInicio: true, horaFin: true },
    });
    const choca = otros.find(
      (s) => aMin(s.horaInicio) < finMin(horaInicio, horaFin) && aMin(horaInicio) < finMin(s.horaInicio, s.horaFin),
    );
    if (choca) {
      throw new BadRequestException(
        `Esta nannie ya tiene un servicio de ${choca.horaInicio} a ${choca.horaFin} ese día. ` +
          `Para evitar duplicidad, no se le puede asignar otro que se traslape.`,
      );
    }
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
    // No permitir doble-asignación: la nannie no debe tener otro servicio que se
    // traslape ese día (excluyendo este mismo, por si se re-oferta).
    await this.verificarSinChoque(
      dto.nannieId,
      servicio.fecha,
      servicio.horaInicio,
      servicio.horaFin,
      servicio.id,
    );

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

/** Suma horas enteras a un HH:mm y devuelve HH:mm (envuelve en 24 h). */
function sumarHoras(hhmm: string, horas: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = (h * 60 + m + horas * 60) % (24 * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Horas completas entre dos HH:mm (maneja cruce de medianoche). null si no da
 *  horas exactas. */
function horasEntre(inicio: string, fin: string): number | null {
  const toMin = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  let diff = toMin(fin) - toMin(inicio);
  if (diff <= 0) diff += 24 * 60; // cruza medianoche
  if (diff % 60 !== 0) return null;
  return diff / 60;
}

/** "HH:mm" → minutos desde medianoche. */
function aMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Minutos del FIN de un bloque; un fin ≤ inicio se interpreta como cruce de
 *  medianoche (ej. 21:00–00:00; 00:00 como fin = 1440). */
function finMin(inicio: string, fin: string): number {
  const i = aMin(inicio);
  const f = aMin(fin);
  return f > i ? f : f + 1440;
}

/** ¿Dos rangos de horario se traslapan? (maneja el cruce de medianoche). */
function seTraslapan(aIni: string, aFin: string, bIni: string, bFin: string): boolean {
  return aMin(aIni) < finMin(bIni, bFin) && aMin(bIni) < finMin(aIni, aFin);
}

/** ¿Dos fechas caen el mismo día? (comparación por YYYY-MM-DD en UTC). */
function mismoDiaUTC(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}
