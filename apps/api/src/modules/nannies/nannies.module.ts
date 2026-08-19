import { Module } from '@nestjs/common';
import { NanniesController } from './nannies.controller';
import { NanniesService } from './nannies.service';
import { IncidenciasController } from './incidencias.controller';
import { IncidenciasService } from './incidencias.service';
import { EvaluacionesController } from './evaluaciones.controller';
import { EvaluacionesService } from './evaluaciones.service';

/** M4 · Expediente, alta, incidencias y evaluación de nannies. PrismaModule/MailModule globales. */
@Module({
  controllers: [NanniesController, IncidenciasController, EvaluacionesController],
  providers: [NanniesService, IncidenciasService, EvaluacionesService],
})
export class NanniesModule {}
