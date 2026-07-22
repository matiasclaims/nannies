import { Module } from '@nestjs/common';
import { AsignacionController } from './asignacion.controller';
import { AsignacionService } from './asignacion.service';
import { CalendarioModule } from '../calendario/calendario.module';

/** M2 · Asignación. Usa CalendarioService (M1) para crear y ofertar. */
@Module({
  imports: [CalendarioModule],
  controllers: [AsignacionController],
  providers: [AsignacionService],
})
export class AsignacionModule {}
