import { Module } from '@nestjs/common';
import { ReporteProblemaController } from './reporte-problema.controller';
import { ReporteProblemaService } from './reporte-problema.service';
import { MailModule } from '../../core/mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [ReporteProblemaController],
  providers: [ReporteProblemaService],
})
export class ReporteProblemaModule {}
