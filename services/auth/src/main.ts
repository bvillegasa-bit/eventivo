import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

/**
 * auth-service — arranque (T-S1.05).
 * Pipes globales: whitelist + forbidNonWhitelisted (rechaza campos extra, R-07)
 * y transform (los DTO se instancian tipados).
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS habilitado para el cliente web (EC-08); en producción el gateway lo restringe.
  app.enableCors();

  const puerto = Number(process.env.PORT) || 3001;
  await app.listen(puerto);
  logger.log(`auth-service escuchando en http://localhost:${puerto}`);
}

void bootstrap();