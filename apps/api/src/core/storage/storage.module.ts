import { Global, Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';
import { ArchivosController } from './archivos.controller';

@Global()
@Module({
  controllers: [ArchivosController],
  providers: [LocalStorageService],
  exports: [LocalStorageService],
})
export class StorageModule {}
