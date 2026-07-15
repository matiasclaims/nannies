import { Module } from '@nestjs/common';
import { CalendarioController } from './calendario.controller';
import { CalendarioService } from './calendario.service';

/** M1 · Disponibilidad y Calendario — dueño de `servicios` y `disponibilidad`. */
@Module({
  controllers: [CalendarioController],
  providers: [CalendarioService],
  exports: [CalendarioService],
})
export class CalendarioModule {}
