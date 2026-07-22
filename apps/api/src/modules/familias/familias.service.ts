import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CrearFamiliaDto } from './dto/crear-familia.dto';
import { CrearPaqueteDto } from './dto/crear-paquete.dto';
import { tramoPorHoras } from './paquetes.tarifa';

/** M5 (mínimo para M2): listado y alta rápida de familias + alta de paquete. */
@Injectable()
export class FamiliasService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista familias con su paquete ACTIVO (saldo de horas) si lo tienen. */
  async listar() {
    const familias = await this.prisma.familia.findMany({
      select: {
        id: true,
        nombreContacto: true,
        plaza: true,
        zona: true,
        paquetes: {
          where: { estado: 'ACTIVO' },
          select: { id: true, horasTotales: true, horasConsumidas: true },
          take: 1,
        },
      },
      orderBy: { nombreContacto: 'asc' },
    });

    return familias.map(({ paquetes, ...f }) => ({
      ...f,
      paqueteActivo: paquetes[0]
        ? {
            id: paquetes[0].id,
            horasTotales: paquetes[0].horasTotales,
            horasConsumidas: paquetes[0].horasConsumidas,
            horasRestantes: paquetes[0].horasTotales - paquetes[0].horasConsumidas,
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
    const tramo = tramoPorHoras(dto.horas);
    if (!tramo) {
      throw new BadRequestException('Paquete inválido: las opciones son 10, 20, 30, 40 o 50 horas.');
    }

    const familia = await this.prisma.familia.findUnique({ where: { id: familiaId } });
    if (!familia) throw new NotFoundException('Familia no encontrada');

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
        horasTotales: tramo.horas,
        precioTotal: tramo.precioTotal,
      },
      select: { id: true, horasTotales: true, horasConsumidas: true },
    });
    return {
      ...paquete,
      horasRestantes: paquete.horasTotales - paquete.horasConsumidas,
    };
  }
}
