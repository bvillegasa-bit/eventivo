import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface Contador {
  intentos: number;
  reseteaEn: number;
}

/**
 * Rate limiting en memoria para login/registro (RF-02, R-02):
 * máximo `LOGIN_RATE_LIMIT_LIMIT` intentos por 15 min por (IP + email).
 * Se aplica ANTES de validar credenciales (cuenta intentos fallidos y válidos).
 * En producción el gateway realiza el rate limiting por IP global (DT-02);
 * este guard cubre el abuso por credencial en el propio servicio.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly intentos = new Map<string, Contador>();

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const ip = (request.ip as string | undefined) ?? 'desconocida';
    const email = String(request.body && request.body.email ? request.body.email : '').toLowerCase();
    const clave = `${ip}:${email}`;

    const limite = Number(this.configService.get('LOGIN_RATE_LIMIT_LIMIT', 10));
    const ttlMs = Number(this.configService.get('LOGIN_RATE_LIMIT_TTL_MS', 900_000));
    const ahora = Date.now();

    const actual = this.intentos.get(clave);
    if (!actual || actual.reseteaEn <= ahora) {
      this.intentos.set(clave, { intentos: 1, reseteaEn: ahora + ttlMs });
      return true;
    }

    actual.intentos += 1;
    if (actual.intentos > limite) {
      const segundosRestantes = Math.max(
        1,
        Math.ceil((actual.reseteaEn - ahora) / 1000),
      );
      response.setHeader('Retry-After', String(segundosRestantes));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Demasiados intentos. Intenta de nuevo en ${segundosRestantes} segundos`,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}