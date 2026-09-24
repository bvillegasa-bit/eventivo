import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { RolUsuario, Usuario } from './entities/usuario.entity';
import { RefreshService } from './refresh/refresh.service';

function mockUsuario(sobre: Partial<Usuario> = {}): Usuario {
  return {
    id: 'usuario-1',
    email: 'alumno@eventivo.ucv.edu.pe',
    passwordHash: '$2a$12$abcdefghijklmnopqrstuv',
    rol: RolUsuario.ESTUDIANTE,
    nombres: 'Ana',
    apellidos: 'García',
    codigoUcv: '2024010101',
    telefono: null,
    activo: true,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    ...sobre,
  } as Usuario;
}

function crearServicio(sobre: {
  usuarioLogin?: Usuario | null;
  usuarioPorId?: Usuario | null;
  emailDuplicado?: boolean;
} = {}) {
  const usuarios = {
    create: jest.fn((entidad) => entidad),
    save: jest.fn(async (entidad: Usuario) => {
      if (sobre.emailDuplicado) {
        const error = new Error('duplicado') as Error & { code?: string };
        error.code = '23505';
        throw error;
      }
      return { ...entidad, id: 'usuario-nuevo' };
    }),
    findOneBy: jest.fn(async ({ id }: { id?: string }) => {
      if (id === 'usuario-1') return sobre.usuarioPorId ?? mockUsuario();
      return null;
    }),
    createQueryBuilder: jest.fn(() => {
      type QbMock = { addSelect: jest.Mock; where: jest.Mock; getOne: jest.Mock };
      const qb: QbMock = {
        addSelect: jest.fn(() => qb),
        where: jest.fn(() => qb),
        getOne: jest.fn(async () => sobre.usuarioLogin ?? null),
      };
      return qb;
    }),
  } as unknown as jest.Mocked<Repository<Usuario>>;

  const refreshService = {
    iniciarSesion: jest.fn().mockResolvedValue('refresh-1'),
    rotar: jest.fn().mockResolvedValue({ usuario: mockUsuario(), refreshToken: 'refresh-2' }),
    revocar: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<RefreshService>;

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('access-1'),
  } as unknown as jest.Mocked<JwtService>;

  const configService = {
    get: jest.fn((clave: string, defecto?: string) => {
      const valores: Record<string, string> = {
        JWT_ACCESS_TTL: '15m',
        JWT_SECRET: 'secreto-de-prueba-de-al-menos-32-caracteres',
        JWT_ISSUER: 'https://api.eventivo.ucv.edu.pe',
        JWT_AUDIENCE: 'eventivo-app',
      };
      return valores[clave] ?? defecto;
    }),
  } as unknown as jest.Mocked<ConfigService>;

  const servicio = new AuthService(usuarios, refreshService, jwtService, configService);
  return { servicio, usuarios, refreshService, jwtService };
}

const DTO_VALIDO = {
  email: 'NUEVO@eventivo.ucv.edu.pe',
  password: 'ClaveSegura123',
  rol: RolUsuario.DOCENTE,
  nombres: 'Carlos',
  apellidos: 'Ramírez',
};

describe('AuthService (RF-01, RF-02)', () => {
  describe('registro', () => {
    it('crea el usuario con hash bcrypt y devuelve tokens + perfil sin hash', async () => {
      const { servicio, usuarios, refreshService, jwtService } = crearServicio();

      const respuesta = await servicio.registro({ ...DTO_VALIDO });

      expect(usuarios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'nuevo@eventivo.ucv.edu.pe',
          rol: RolUsuario.DOCENTE,
          activo: true,
        }),
      );
      const creado = usuarios.create.mock.results[0].value as Usuario;
      expect(creado.passwordHash).toMatch(/^\$2[aby]\$12\$/);
      expect(jwtService.signAsync).toHaveBeenCalled();
      expect(refreshService.iniciarSesion).toHaveBeenCalled();
      expect(respuesta.accessToken).toBe('access-1');
      expect(respuesta.refreshToken).toBe('refresh-1');
      expect(respuesta.usuario.email).toBeDefined();
      expect(JSON.stringify(respuesta)).not.toContain('passwordHash');
    });

    it('rechaza rol administrativo con 403 (provisión solo por seed)', async () => {
      const { servicio } = crearServicio();
      await expect(
        servicio.registro({ ...DTO_VALIDO, rol: RolUsuario.ADMINISTRATIVO }),
      ).rejects.toThrowError(ForbiddenException);
    });

    it('responde 409 genérico si el email ya existe', async () => {
      const { servicio } = crearServicio({ emailDuplicado: true });
      await expect(servicio.registro(DTO_VALIDO)).rejects.toThrowError(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('verifica el hash y emite el par de tokens', async () => {
      // Hash real (cost bajo para rapidez del test) de la contraseña que se enviará.
      const hashReal = await hash('ClaveSegura123', 4);
      const { servicio, refreshService, jwtService } = crearServicio({
        usuarioLogin: mockUsuario({ passwordHash: hashReal }),
      });

      const respuesta = await servicio.login({
        email: 'ALUMNO@eventivo.ucv.edu.pe',
        password: 'ClaveSegura123',
      });

      expect(respuesta.accessToken).toBe('access-1');
      expect(respuesta.refreshToken).toBe('refresh-1');
      expect(refreshService.iniciarSesion).toHaveBeenCalled();
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ rol: RolUsuario.ESTUDIANTE, tipo: 'access' }),
        expect.objectContaining({ expiresIn: '15m', algorithm: 'HS256' }),
      );
    });

    it('responde 401 genérico si el usuario no existe', async () => {
      const { servicio } = crearServicio({ usuarioLogin: null });
      await expect(
        servicio.login({ email: 'nadie@eventivo.ucv.edu.pe', password: 'x' }),
      ).rejects.toThrowError(UnauthorizedException);
    });

    it('responde 401 genérico si el usuario está inactivo', async () => {
      const { servicio } = crearServicio({
        usuarioLogin: mockUsuario({ activo: false }),
      });
      await expect(
        servicio.login({ email: 'alumno@eventivo.ucv.edu.pe', password: 'x' }),
      ).rejects.toThrowError(UnauthorizedException);
    });
  });

  describe('refrescar / cerrarSesion', () => {
    it('rota el refresh y firma un access nuevo', async () => {
      const { servicio, refreshService, jwtService } = crearServicio();

      const par = await servicio.refrescar('refresh-vigente');

      expect(refreshService.rotar).toHaveBeenCalledWith('refresh-vigente');
      expect(par).toEqual({ accessToken: 'access-1', refreshToken: 'refresh-2' });
      expect(jwtService.signAsync).toHaveBeenCalledTimes(1);
    });

    it('cierra la sesión revocando el refresh', async () => {
      const { servicio, refreshService } = crearServicio();
      const respuesta = await servicio.cerrarSesion('refresh-vigente');

      expect(refreshService.revocar).toHaveBeenCalledWith('refresh-vigente');
      expect(respuesta.mensaje).toContain('Sesión cerrada');
    });
  });

  describe('miPerfil', () => {
    it('devuelve el perfil sin hash', async () => {
      const { servicio } = crearServicio({ usuarioPorId: mockUsuario() });
      const perfil = await servicio.miPerfil('usuario-1');
      expect(perfil.email).toBe('alumno@eventivo.ucv.edu.pe');
    });

    it('responde 401 si el usuario no existe o está inactivo', async () => {
      const { servicio } = crearServicio({
        usuarioPorId: mockUsuario({ activo: false }),
      });
      await expect(servicio.miPerfil('usuario-1')).rejects.toThrowError(
        UnauthorizedException,
      );
    });
  });
});