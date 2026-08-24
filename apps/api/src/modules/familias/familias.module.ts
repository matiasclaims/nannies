import { Module } from '@nestjs/common';
import { FamiliasController } from './familias.controller';
import { FamiliasService } from './familias.service';
import { SyncFormularioService } from './sync-formulario.service';

@Module({
  controllers: [FamiliasController],
  providers: [FamiliasService, SyncFormularioService],
})
export class FamiliasModule {}
