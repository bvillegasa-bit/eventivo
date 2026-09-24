import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';

/**
 * DT-02 — Guard de red interna: exige `X-Service-Key` igual al valor de
 * entorno esperado. Los endpoints `/internal/*` solo se consumen entre
 * servicios (el gateway bloquea ese prefijo hacia el exterior).
 *
 * Comparación en tiempo constante (hash SHA-256 de ambas claves para
 * normalizar longitudes, luego `timingSafeEqual`).
 */
@Injectable()
export class XServiceKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const recibida = String(request.headers['x-service-key'] ?? '');
    const esperada = this.configService.get<string>('X_SERVICE_KEY', '');

    if (!esperada || !comparacionSegura(recibida, esperada)) {
      throw new ForbiddenException('Clave de servicio inválida');
    }
    return true;
  }
}

function comparacionSegura(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a, 'utf8').digest();
  const hashB = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(hashA, hashB);
}