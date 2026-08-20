import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './core/mail/mail.module';
import { StorageModule } from './core/storage/storage.module';
import { AuthModule } from './core/auth/auth.module';
import { CalendarioModule } from './modules/calendario/calendario.module';
import { AsignacionModule } from './modules/asignacion/asignacion.module';
import { FamiliasModule } from './modules/familias/familias.module';
import { FinanzasModule } from './modules/finanzas/finanzas.module';
import { NanniesModule } from './modules/nannies/nannies.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting global: frena fuerza bruta y protege el vCPU único
    // (SEGURIDAD §4/§8). Login añade un límite más estricto propio.
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.RATE_LIMIT_TTL ?? 60) * 1000,
        limit: Number(process.env.RATE_LIMIT_MAX ?? 100),
      },
    ]),
    PrismaModule,
    MailModule,
    StorageModule,
    AuthModule,
    CalendarioModule,
    AsignacionModule,
    FamiliasModule,
    FinanzasModule,
    NanniesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
