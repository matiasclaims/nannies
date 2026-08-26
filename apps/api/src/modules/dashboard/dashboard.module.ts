import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { FinanzasModule } from '../finanzas/finanzas.module';

@Module({
  imports: [FinanzasModule], // reutiliza FinanzasService.margen
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
