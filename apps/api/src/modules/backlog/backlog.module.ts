import { Module } from '@nestjs/common';
import { BacklogController } from './backlog.controller';
import { BacklogService } from './backlog.service';

@Module({
  controllers: [BacklogController],
  providers: [BacklogService],
})
export class BacklogModule {}
