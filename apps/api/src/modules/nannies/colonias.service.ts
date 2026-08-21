import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GuardarColoniasDto } from './dto/guardar-colonias.dto';

/** M5 · Colonias de trabajo por día (Toluca). La nannie las define al inicio;
 *  luego quedan bloqueadas para ella (coordinación puede editarlas y desbloquear). */
@Injectable()
export class ColoniasService {
  constructor(private readonly prisma: PrismaService) {}

  /** Catálogo de colonias (para el selector). Ligero: sin coordenadas. */
  catalogo() {
    return this.prisma.coloniaToluca.findMany({
      select: { id: true, municipio: true, colonia: true },
      orderBy: [{ municipio: 'asc' }, { colonia: 'asc' }],
    });
  }

  /** Colonias de una nannie + si están bloqueadas. */
  async deNannie(nannieId: string) {
    const nannie = await this.prisma.nannie.findUnique({
      where: { id: nannieId },
      select: { coloniasBloqueadas: true },
    });
    if (!nannie) throw new NotFoundException('Nannie no encontrada');
    const filas = await this.prisma.nannieColonia.findMany({
      where: { nannieId },
      include: { colonia: { select: { municipio: true, colonia: true } } },
      orderBy: { colonia: { colonia: 'asc' } },
    });
    return {
      bloqueadas: nannie.coloniasBloqueadas,
      colonias: filas.map((f) => ({
        coloniaId: f.coloniaId,
        municipio: f.colonia.municipio,
        colonia: f.colonia.colonia,
        dias: f.dias,
      })),
    };
  }

  /** Reemplaza el conjunto de colonias de la nannie (colonias con ≥1 día). */
  private async reemplazar(nannieId: string, dto: GuardarColoniasDto) {
    const validas = dto.colonias.filter((c) => c.dias.length > 0);
    await this.prisma.$transaction(async (tx) => {
      await tx.nannieColonia.deleteMany({ where: { nannieId } });
      if (validas.length) {
        await tx.nannieColonia.createMany({
          data: validas.map((c) => ({ nannieId, coloniaId: c.coloniaId, dias: [...new Set(c.dias)] })),
          skipDuplicates: true,
        });
      }
    });
  }

  /** La nannie guarda las suyas (solo si NO están bloqueadas). `confirmar` las bloquea. */
  async guardarPropias(nannieId: string, dto: GuardarColoniasDto) {
    const nannie = await this.prisma.nannie.findUnique({
      where: { id: nannieId },
      select: { coloniasBloqueadas: true },
    });
    if (!nannie) throw new NotFoundException('Nannie no encontrada');
    if (nannie.coloniasBloqueadas) {
      throw new ForbiddenException('Tus colonias ya están confirmadas. Un cambio lo autoriza coordinación.');
    }
    await this.reemplazar(nannieId, dto);
    if (dto.confirmar) {
      await this.prisma.nannie.update({ where: { id: nannieId }, data: { coloniasBloqueadas: true } });
    }
    return { ok: true, bloqueadas: Boolean(dto.confirmar) };
  }

  /** Coordinación guarda/edita las de una nannie y puede fijar/levantar el candado. */
  async guardarCoordinacion(nannieId: string, dto: GuardarColoniasDto) {
    const nannie = await this.prisma.nannie.findUnique({ where: { id: nannieId }, select: { id: true } });
    if (!nannie) throw new NotFoundException('Nannie no encontrada');
    await this.reemplazar(nannieId, dto);
    if (dto.bloqueadas !== undefined) {
      await this.prisma.nannie.update({ where: { id: nannieId }, data: { coloniasBloqueadas: dto.bloqueadas } });
    }
    return { ok: true };
  }
}
