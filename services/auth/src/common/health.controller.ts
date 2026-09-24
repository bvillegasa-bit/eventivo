import { Controller, Get } from '@nestjs/common';

/** Healthcheck del servicio (usa docker-compose healthcheck vía GET /health). */
@Controller('health')
export class HealthController {
  @Get()
  salud() {
    return {
      estado: 'ok',
      servicio: 'auth',
      hora: new Date().toISOString(),
    };
  }
}