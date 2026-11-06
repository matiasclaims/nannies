import { Body, Controller, Get, Param, Put, Res } from '@nestjs/common';
import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import { PlaneacionService } from './planeacion.service';
import { RequiereAccion } from '../../core/auth/decorators/requiere-accion.decorator';
import { UsuarioActual } from '../../core/auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { GuardarPlaneacionDto } from './dto/guardar-planeacion.dto';
import { construirPdfPlaneacion, nombreArchivoPlaneacion, type DatosHoja } from './planeacion.pdf';

@Controller('planeacion')
export class PlaneacionController {
  constructor(private readonly planeacion: PlaneacionService) {}

  // Guardar/actualizar la planeación de un servicio. Coordinación o la nannie
  // asignada (la pertenencia se valida en el servicio).
  @RequiereAccion('planeacion.gestionar')
  @Put('servicio/:servicioId')
  guardar(
    @Param('servicioId') servicioId: string,
    @Body() dto: GuardarPlaneacionDto,
    @UsuarioActual() user: UsuarioAutenticado,
  ) {
    return this.planeacion.guardar(servicioId, dto, user);
  }

  // Leer la planeación de un servicio (null si no existe).
  @RequiereAccion('planeacion.gestionar')
  @Get('servicio/:servicioId')
  deServicio(@Param('servicioId') servicioId: string, @UsuarioActual() user: UsuarioAutenticado) {
    return this.planeacion.deServicio(servicioId, user);
  }

  // Hoja imprimible (datos para la vista HTML) de la planeación de un servicio.
  @RequiereAccion('planeacion.gestionar')
  @Get('servicio/:servicioId/hoja')
  hoja(@Param('servicioId') servicioId: string, @UsuarioActual() user: UsuarioAutenticado) {
    return this.planeacion.hoja(servicioId, user);
  }

  // PDF real descargable (archivo) de la planeación, con marca Nannies. Funciona
  // en cualquier navegador/celular sin depender de window.print().
  @RequiereAccion('planeacion.gestionar')
  @Get('servicio/:servicioId/pdf')
  async pdf(
    @Param('servicioId') servicioId: string,
    @UsuarioActual() user: UsuarioAutenticado,
    @Res() res: Response,
  ) {
    const data = (await this.planeacion.hoja(servicioId, user)) as DatosHoja;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivoPlaneacion(data)}"`);
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);
    construirPdfPlaneacion(doc, data);
  }
}
