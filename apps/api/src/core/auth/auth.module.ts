import { Module } from '@nestjs/common';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AccionGuard } from './guards/accion.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '8h' } as JwtSignOptions,
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Orden importa: primero autentica (JwtAuthGuard), luego autoriza (AccionGuard).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: AccionGuard },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
