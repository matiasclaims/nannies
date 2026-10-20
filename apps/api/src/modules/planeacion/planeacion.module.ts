import { Module } from '@nestjs/common';
import { PlaneacionController } from './planeacion.controller';
import { PlaneacionService } from './planeacion.service';

@Module({
  controllers: [PlaneacionController],
  providers: [PlaneacionService],
})
export class PlaneacionModule {}
