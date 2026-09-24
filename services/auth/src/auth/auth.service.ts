import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import { RolUsuario, Usuario } from './entities/usuario.entity';
import { RefreshService } from './refresh/refresh.service';

export interface PerfilPublico {
  id: string;
  email: string;
  rol: RolUsuario;
  nombres: string;
  apellidos: string;
  codigoUcv: string | null;
  telefono: string | null;
  activo: boolean;
  creadoEn: Date;
}

export interface ParTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RespuestaAutenticacion extends ParTokens {
  usuario: PerfilPublico;
}

const COSTO_BCRYPT = 12;

/**
 * RF-01 / RF-02 — Registro, login y perfil.
 * Hash de contraseñas: bcryptjs (cost 12) — misma API/formatos que bcrypt.
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarios: Repository<Usuario>,
    private readonly refreshService: RefreshService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ---------- público ----------

  /** RF-01 - escenarios 1-4. 403 para administrativo, 409 anónimo si el email existe. */
  async registro(dto: RegistroDto): Promise<RespuestaAutenticacion> {
    if (dto.rol === RolUsuario.ADMINISTRATIVO) {
      throw new ForbiddenException(
        'El rol administrativo no puede registrarse por cuenta propia',
      );
    }

    const passwordHash = await hash(dto.password, COSTO_BCRYPT);
    const usuario = this.usuarios.create({
      email: dto.email.trim().toLowerCase(),
      passwordHash,
      rol: dto.rol,
      nombres: dto.nombres.trim(),
      apellidos: dto.apellidos.trim(),
      codigoUcv: dto.codigoUcv?.trim() ?? null,
      telefono: dto.telefono?.trim() ?? null,
      activo: true,
    });

    let guardado: Usuario;
    try {
      guardado = await this.usuarios.save(usuario);
    } catch (error) {
      // 23505 = unique_violation (email duplicado) → 409 GENÉRICO (anti-enumeración, R-07)
      if (error && typeof error === 'object' && ((error as { code?: string }).code === '23505')) {
        throw new ConflictException(
          'No se pudo completar el registro. Intenta nuevamente',
        );
      }
      throw error;
    }

    const tokens = await this.emitirTokens(guardado);
    return { ...tokens, usuario: this.serializar(guardado) };
  }

  /** RF-02 — login con mensajes genéricos (anti-enumeración). */
  async login(dto: LoginDto): Promise<RespuestaAutenticacion> {
    const usuario = await this.usuarios
      .createQueryBuilder('usuario')
      .addSelect('usuario.passwordHash')
      .where('usuario.email = :email', { email: dto.email.trim().toLowerCase() })
      .getOne();

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const coincide = await compare(dto.password, usuario.passwordHash);
    if (!coincide) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.emitirTokens(usuario);
    return { ...tokens, usuario: this.serializar(usuario) };
  }

  /** RF-02 — rotación de refresh (validación y emisión en RefreshService). */
  async refrescar(refreshToken: string): Promise<ParTokens> {
    const { usuario, refreshToken: nuevoRefresh } =
      await this.refreshService.rotar(refreshToken);
    return { accessToken: await this.firmarAccess(usuario), refreshToken: nuevoRefresh };
  }

  /** RF-02 — logout idempotente. */
  async cerrarSesion(refreshToken: string): Promise<{ mensaje: string }> {
    await this.refreshService.revocar(refreshToken);
    return { mensaje: 'Sesión cerrada correctamente' };
  }

  // ---------- autenticado ----------

  /** Perfil propio (nunca expone hash). */
  async miPerfil(usuarioId: string): Promise<PerfilPublico> {
    const usuario = await this.usuarios.findOneBy({ id: usuarioId });
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException(
        'Tu sesión expiró o no es válida. Inicia sesión de nuevo',
      );
    }
    return this.serializar(usuario);
  }

  // ---------- interno ----------

  /** DT-02 — red interna: perfil de un usuario por id (404 si no existe/oculto). */
  async perfilPorId(usuarioId: string): Promise<PerfilPublico> {
    const usuario = await this.usuarios.findOneBy({ id: usuarioId });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.serializar(usuario);
  }

  async firmarAccess(usuario: Usuario): Promise<string> {
    return this.jwtService.signAsync(
      { sub: usuario.id, rol: usuario.rol, tipo: 'access' },
      {
        expiresIn: this.configService.get<string>(
          'JWT_ACCESS_TTL',
          '15m',
        ) as JwtSignOptions['expiresIn'],
        secret: this.configService.get<string>('JWT_SECRET'),
        issuer: this.configService.get<string>('JWT_ISSUER'),
        audience: this.configService.get<string>('JWT_AUDIENCE'),
        algorithm: 'HS256',
      },
    );
  }

  private async emitirTokens(usuario: Usuario): Promise<ParTokens> {
    const accessToken = await this.firmarAccess(usuario);
    const refreshToken = await this.refreshService.iniciarSesion(usuario);
    return { accessToken, refreshToken };
  }

  serializar(usuario: Usuario): PerfilPublico {
    return {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      codigoUcv: usuario.codigoUcv,
      telefono: usuario.telefono,
      activo: usuario.activo,
      creadoEn: usuario.creadoEn,
    };
  }
}