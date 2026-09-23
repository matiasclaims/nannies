import { Module } from '@nestjs/common';
import { RecordatoriosController } from './recordatorios.controller';
import { RecordatoriosService } from './recordatorios.service';

/** Recordatorios automáticos (disparados por el cron del servidor). */
@Module({
  controllers: [RecordatoriosController],
  providers: [RecordatoriosService],
})
export class RecordatoriosModule {}
