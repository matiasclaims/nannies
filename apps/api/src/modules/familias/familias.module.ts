import { Module } from '@nestjs/common';
import { FamiliasController } from './familias.controller';
import { FamiliasService } from './familias.service';

@Module({
  controllers: [FamiliasController],
  providers: [FamiliasService],
})
export class FamiliasModule {}
