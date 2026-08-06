import { Module } from '@nestjs/common';
import { NanniesController } from './nannies.controller';
import { NanniesService } from './nannies.service';
import { IncidenciasController } from './incidencias.controller';
import { IncidenciasService } from './incidencias.service';

/** M4 · Expediente, alta e incidencias de nannies. PrismaModule/MailModule globales. */
@Module({
  controllers: [NanniesController, IncidenciasController],
  providers: [NanniesService, IncidenciasService],
})
export class NanniesModule {}
