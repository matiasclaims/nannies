import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/** Correo transversal (Resend). Global para reusar en cualquier módulo. */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
