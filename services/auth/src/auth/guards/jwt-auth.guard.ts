import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export interface PayloadAcceso {
  sub: string;
  rol: string;
  /** 'access' | 'refresh' — los refresh jamás sirven como Bearer. */
  tipo: string;
  iat?: number;
  exp?: number;
  jti?: string;
}

/**
 * Guard de autenticación JWT (Bearer, HS256 estricto + issuer + audience).
 * DT-05 — solo firmas con nuestro secreto/emisor/audiencia son válidas;
 * los refresh tokens (tipo 'refresh') NUNCA pasan por aquí.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const autorizacion = request.headers.authorization as string | undefined;

    if (!autorizacion || !autorizacion.startsWith('Bearer ')) {
      throw new UnauthorizedException('No has iniciado sesión');
    }

    const token = autorizacion.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException('No has iniciado sesión');
    }

    try {
      const payload = (await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
        issuer: this.configService.get<string>('JWT_ISSUER'),
        audience: this.configService.get<string>('JWT_AUDIENCE'),
        algorithms: ['HS256'],
      })) as PayloadAcceso;

      if (payload.tipo !== 'access' || !payload.sub || !payload.rol) {
        throw new UnauthorizedException('Tu sesión expiró o no es válida. Inicia sesión de nuevo');
      }

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException(
        'Tu sesión expiró o no es válida. Inicia sesión de nuevo',
      );
    }
  }
}