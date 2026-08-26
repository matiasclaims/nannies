import { Module } from '@nestjs/common';
import { EvaluacionFamiliaController } from './evaluacion-familia.controller';
import { EvaluacionFamiliaService } from './evaluacion-familia.service';

@Module({
  controllers: [EvaluacionFamiliaController],
  providers: [EvaluacionFamiliaService],
})
export class EvaluacionFamiliaModule {}
