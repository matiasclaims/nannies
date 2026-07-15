import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // Mensajes de error discretos: sin stack traces al cliente (SEGURIDAD §10)
    logger: ['error', 'warn', 'log'],
  });

  // Cabeceras de seguridad
  app.use(helmet());
  app.use(cookieParser(process.env.COOKIE_SECRET));

  // CORS restrictivo: solo el dominio del sistema (SEGURIDAD §10)
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? false,
    credentials: true,
  });

  // Validación y sanitización de TODA entrada (SEGURIDAD §5/§10).
  // whitelist elimina campos no declarados; forbidNonWhitelisted rechaza extras.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.setGlobalPrefix('api');

  // Render (y otros PaaS) inyectan PORT; en local usamos API_PORT o 3001.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  Logger.log(`API Nannies escuchando en el puerto ${port} (prefijo /api)`, 'Bootstrap');
}

void bootstrap();
