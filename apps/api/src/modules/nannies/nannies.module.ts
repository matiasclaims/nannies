import { Module } from '@nestjs/common';
import { NanniesController } from './nannies.controller';
import { NanniesService } from './nannies.service';
import { IncidenciasController } from './incidencias.controller';
import { IncidenciasService } from './incidencias.service';
import { EvaluacionesController } from './evaluaciones.controller';
import { EvaluacionesService } from './evaluaciones.service';
import { MisDocumentosController } from './mis-documentos.controller';
import { DocumentosService } from './documentos.service';
import { MisColoniasController } from './mis-colonias.controller';
import { ColoniasService } from './colonias.service';

/** M4/M5 · Expediente, alta, incidencias, evaluación, documentos y colonias. */
@Module({
  controllers: [
    NanniesController,
    IncidenciasController,
    EvaluacionesController,
    MisDocumentosController,
    MisColoniasController,
  ],
  providers: [
    NanniesService,
    IncidenciasService,
    EvaluacionesService,
    DocumentosService,
    ColoniasService,
  ],
})
export class NanniesModule {}
