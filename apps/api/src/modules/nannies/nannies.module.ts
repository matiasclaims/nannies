import { Module } from '@nestjs/common';
import { NanniesController } from './nannies.controller';
import { NanniesService } from './nannies.service';
import { IncidenciasController } from './incidencias.controller';
import { IncidenciasService } from './incidencias.service';
import { EvaluacionesController } from './evaluaciones.controller';
import { EvaluacionesService } from './evaluaciones.service';
import { EvaluacionCoordController } from './evaluacion-coord.controller';
import { EvaluacionCoordService } from './evaluacion-coord.service';
import { MisDocumentosController } from './mis-documentos.controller';
import { DocumentosService } from './documentos.service';
import { MisColoniasController } from './mis-colonias.controller';
import { ColoniasService } from './colonias.service';
import { MiPanoramaController } from './mi-panorama.controller';
import { MiPanoramaService } from './mi-panorama.service';

/** M4/M5 · Expediente, alta, incidencias, evaluación, documentos y colonias. */
@Module({
  controllers: [
    NanniesController,
    IncidenciasController,
    EvaluacionesController,
    EvaluacionCoordController,
    MisDocumentosController,
    MisColoniasController,
    MiPanoramaController,
  ],
  providers: [
    NanniesService,
    IncidenciasService,
    EvaluacionesService,
    EvaluacionCoordService,
    DocumentosService,
    ColoniasService,
    MiPanoramaService,
  ],
})
export class NanniesModule {}
