import { Module } from '@nestjs/common';
import { NanniesController } from './nannies.controller';
import { NanniesService } from './nannies.service';
import { IncidenciasController } from './incidencias.controller';
import { IncidenciasService } from './incidencias.service';
import { EvaluacionesController } from './evaluaciones.controller';
import { EvaluacionesService } from './evaluaciones.service';
import { MisDocumentosController } from './mis-documentos.controller';
import { DocumentosService } from './documentos.service';

/** M4 · Expediente, alta, incidencias, evaluación y documentos de nannies. */
@Module({
  controllers: [NanniesController, IncidenciasController, EvaluacionesController, MisDocumentosController],
  providers: [NanniesService, IncidenciasService, EvaluacionesService, DocumentosService],
})
export class NanniesModule {}
