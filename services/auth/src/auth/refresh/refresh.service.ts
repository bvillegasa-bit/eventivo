import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { randomUUID, createHash } from 'crypto';
import { Repository } from 'typeorm';
import { TokenSesion } from '../entities/token-sesion.entity';
import { Usuario } from '../entities/usuario.entity';
import { PayloadAcceso } from '../guards/jwt-auth.guard';

export const MENSAJE_SESION_INVALIDA =
  'La sesión no es válida o expiró. Vuelve a iniciar sesión';
export const MENSAJE_REUSO_DETECTADO =
  'La sesión fue invalidada por seguridad. Vuelve a iniciar sesión';

export interface ParRotados {
  usuario: Usuario;
  refreshToken: string;
}

/**
 * DT-05 — Gestión de refresh tokens con hash en BD y rotación.
 * - NUNCA se guarda el token en claro: solo SHA-256 (refresh_token_hash).
 * - Cada rotación abre una sesión NUEVA (nuevo jti) de la misma familia y
 *   revoca la anterior; el reuso de un token antiguo revoca TODA la familia.
 */
@Injectable()
export class RefreshService {
  constructor(
    @InjectRepository(TokenSesion)
    private readonly sesiones: Repository<TokenSesion>,
    @InjectRepository(Usuario)
    private readonly usuarios: Repository<Usuario>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private ttlRefreshMs(): number {
    const ttl = this.configService.get<string>('JWT_REFRESH_TTL', '7d');
    const ratio = ttl.endsWith('d') ? 86_400_000 : ttl.endsWith('h') ? 3_600_000 : 60_000;
    const numero = Number(ttl.slice(0, -1));
    return Number.isFinite(numero) ? numero * ratio : 7 * 86_400_000;
  }

  private async firmarRefresh(usuario: Usuario, jti: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: usuario.id, rol: usuario.rol, tipo: 'refresh' },
      {
        jwtid: jti,
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_TTL',
          '7d',
        ) as JwtSignOptions['expiresIn'],
        secret: this.configService.get<string>('JWT_SECRET'),
        issuer: this.configService.get<string>('JWT_ISSUER'),
        audience: this.configService.get<string>('JWT_AUDIENCE'),
        algorithm: 'HS256',
      },
    );
  }

  private async verificarToken(token: string): Promise<PayloadAcceso> {
    try {
      const payload = (await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
        issuer: this.configService.get<string>('JWT_ISSUER'),
        audience: this.configService.get<string>('JWT_AUDIENCE'),
        algorithms: ['HS256'],
      })) as PayloadAcceso;

      if (payload.tipo !== 'refresh' || !payload.sub || !payload.jti) {
        throw new UnauthorizedException(MENSAJE_SESION_INVALIDA);
      }
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(MENSAJE_SESION_INVALIDA);
    }
  }

  /** Crea una sesión nueva (primer refresh tras registro/login). */
  async iniciarSesion(usuario: Usuario): Promise<string> {
    const idSesion = randomUUID();
    const refreshToken = await this.firmarRefresh(usuario, idSesion);
    await this.sesiones.save(
      this.sesiones.create({
        id: idSesion,
        usuarioId: usuario.id,
        familiaId: idSesion,
        refreshTokenHash: this.hashToken(refreshToken),
        expiraEn: new Date(Date.now() + this.ttlRefreshMs()),
        revocado: false,
      }),
    );
    return refreshToken;
  }

  /**
   * RF-02 — Rotación defensiva (DT-05): valida el token recibido y emite uno
   * nuevo para una sesión NUEVA de la misma familia.
   * - Reuso (hash recibido ≠ vigente) → 401 + revocación de TODA la familia.
   * - Reuso de un token ya revocado (rotado/logout) → revoca la familia → 401.
   */
  async rotar(refreshToken: string): Promise<ParRotados> {
    const payload = await this.verificarToken(refreshToken);
    const sesion = await this.sesiones.findOneBy({ id: payload.jti });
    const ahora = new Date();

    if (!sesion) {
      throw new UnauthorizedException(MENSAJE_SESION_INVALIDA);
    }

    if (sesion.revocado) {
      // Un token ya rotado (o de una sesión cerrada) en uso = posible reuso:
      // se revoca la familia entera y se exige login (RF-02 escenario 4).
      await this.sesiones.update(
        { familiaId: sesion.familiaId },
        { revocado: true },
      );
      throw new UnauthorizedException(MENSAJE_SESION_INVALIDA);
    }

    if (sesion.expiraEn.getTime() <= ahora.getTime()) {
      await this.sesiones.update({ id: sesion.id }, { revocado: true });
      throw new UnauthorizedException(MENSAJE_SESION_INVALIDA);
    }

    // Seguridad: hash recibido (re-calculado) debe coincidir con el vigente.
    if (sesion.refreshTokenHash !== this.hashToken(refreshToken)) {
      await this.sesiones.update(
        { familiaId: sesion.familiaId },
        { revocado: true },
      );
      throw new UnauthorizedException(MENSAJE_REUSO_DETECTADO);
    }

    const usuario = await this.usuarios.findOneBy({ id: payload.sub });
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException(MENSAJE_SESION_INVALIDA);
    }

    // Rotación: la sesión actual queda revocada y se abre una nueva de la MISMA familia.
    await this.sesiones.update({ id: sesion.id }, { revocado: true });
    const idSesionNueva = randomUUID();
    const nuevoRefresh = await this.firmarRefresh(usuario, idSesionNueva);
    await this.sesiones.save(
      this.sesiones.create({
        id: idSesionNueva,
        usuarioId: usuario.id,
        familiaId: sesion.familiaId,
        refreshTokenHash: this.hashToken(nuevoRefresh),
        expiraEn: new Date(Date.now() + this.ttlRefreshMs()),
        revocado: false,
      }),
    );

    return { usuario, refreshToken: nuevoRefresh };
  }

  /**
   * RF-02 — Logout: revoca la sesión (y familia). Idempotente:
   * un token inválido/ya revocado no es un error para el usuario.
   */
  async revocar(refreshToken: string): Promise<void> {
    let payload: PayloadAcceso;
    try {
      payload = await this.verificarToken(refreshToken);
    } catch {
      return;
    }
    const sesion = await this.sesiones.findOneBy({ id: payload.jti });
    if (!sesion || sesion.revocado) {
      return;
    }
    await this.sesiones.update(
      { familiaId: sesion.familiaId },
      { revocado: true },
    );
  }
}