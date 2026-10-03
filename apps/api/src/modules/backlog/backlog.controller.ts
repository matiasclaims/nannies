import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { BacklogService } from './backlog.service';
import { RequiereAccion } from '../../core/auth/decorators/requiere-accion.decorator';
import { CrearBacklogDto } from './dto/crear-backlog.dto';
import { ActualizarBacklogDto } from './dto/actualizar-backlog.dto';

/** Backlog del PROGRAMADOR. Toda la ruta exige la acción backlog.gestionar. */
@RequiereAccion('backlog.gestionar')
@Controller('backlog')
export class BacklogController {
  constructor(private readonly backlog: BacklogService) {}

  @Get()
  listar(@Query('estado') estado?: string) {
    return this.backlog.listar(estado);
  }

  @Post()
  crear(@Body() dto: CrearBacklogDto) {
    return this.backlog.crear(dto);
  }

  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarBacklogDto) {
    return this.backlog.actualizar(id, dto);
  }

  @Delete(':id')
  borrar(@Param('id') id: string) {
    return this.backlog.borrar(id);
  }
}
