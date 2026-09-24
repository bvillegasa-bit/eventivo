import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { RolUsuario, Usuario } from '../entities/usuario.entity';
import { TokenSesion } from '../entities/token-sesion.entity';
import {
  MENSAJE_REUSO_DETECTADO,
  MENSAJE_SESION_INVALIDA,
  RefreshService,
} from './refresh.service';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function mockSesion(sobre: Partial<TokenSesion> = {}): TokenSesion {
  const id = randomUUID();
  const expiraEn = new Date(Date.now() + 7 * 86_400_000);
  return {
    id,
    usuarioId: randomUUID(),
    familiaId: id,
    refreshTokenHash: '',
    expiraEn,
    revocado: false,
    creadoEn: new Date(),
    ...sobre,
  } as TokenSesion;
}

function mockUsuario(): Usuario {
  return {
    id: randomUUID(),
    email: 'alumno@eventivo.ucv.edu.pe',
    passwordHash: 'hash-no-usado-en-refresh',
    rol: RolUsuario.ESTUDIANTE,
    nombres: 'Ana',
    apellidos: 'García',
    codigoUcv: '2024010101',
    telefono: null,
    activo: true,
    creadoEn: new Date(),
  } as Usuario;
}

function crearServicio(sobre: {
  sesion?: TokenSesion | null;
  usuario?: Usuario | null;
  tokenFirmado?: string;
} = {}) {
  const sesiones = {
    findOneBy: jest.fn().mockResolvedValue(sobre.sesion ?? null),
    save: jest.fn(async (entidad) => entidad),
    create: jest.fn((entidad) => entidad),
    update: jest.fn(async () => ({ affected: 1, raw: [], generatedMaps: [] })),
  } as unknown as jest.Mocked<Repository<TokenSesion>>;

  const usuarios = {
    findOneBy: jest.fn().mockResolvedValue(sobre.usuario ?? mockUsuario()),
  } as unknown as jest.Mocked<Repository<Usuario>>;

  const configService = {
    get: jest.fn((clave: string, defecto?: string) => {
      const valores: Record<string, string> = {
        JWT_SECRET: 'secreto-de-prueba-de-al-menos-32-caracteres',
        JWT_ISSUER: 'https://api.eventivo.ucv.edu.pe',
        JWT_AUDIENCE: 'eventivo-app',
        JWT_REFRESH_TTL: '7d',
      };
      return valores[clave] ?? defecto;
    }),
  } as unknown as jest.Mocked<ConfigService>;

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue(sobre.tokenFirmado ?? 'refresh-firmado'),
    verifyAsync: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;

  const servicio = new RefreshService(sesiones, usuarios, jwtService, configService);
  return { servicio, sesiones, usuarios, jwtService };
}

describe('RefreshService (DT-05, RF-02)', () => {
  describe('iniciarSesion', () => {
    it('guarda la sesión con hash y expiración de 7 días, y devuelve el refresh', async () => {
      const { servicio, sesiones, jwtService } = crearServicio({ tokenFirmado: 'rt-1' });
      const usuario = mockUsuario();

      const resultado = await servicio.iniciarSesion(usuario);

      expect(resultado).toBe('rt-1');
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: usuario.id, rol: usuario.rol, tipo: 'refresh' },
        expect.objectContaining({
          expiresIn: '7d',
          algorithm: 'HS256',
          jwtid: expect.any(String),
        }),
      );
      const guardado = sesiones.save.mock.calls[0][0] as TokenSesion;
      expect(guardado.refreshTokenHash).toBe(hashToken('rt-1'));
      expect(guardado.familiaId).toBe(guardado.id);
      expect(guardado.revocado).toBe(false);
      expect(guardado.expiraEn.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('rotar', () => {
    it('rota a una sesión NUEVA de la misma familia y revoca la anterior', async () => {
      const tokenVigente = 'rt-vigente';
      const sesion = mockSesion({ refreshTokenHash: hashToken(tokenVigente) });
      const { servicio, sesiones, jwtService } = crearServidoConValidacion({
        sesion,
        tokenFirmado: 'rt-nuevo',
      });

      const resultado = await servicio.rotar(tokenVigente);

      expect(resultado.refreshToken).toBe('rt-nuevo');
      expect(resultado.usuario.id).toBeDefined();
      // La sesión anterior queda revocada.
      expect(sesiones.update).toHaveBeenCalledWith(
        { id: sesion.id },
        { revocado: true },
      );
      // La sesión nueva pertenece a la MISMA familia y firma con jti propio.
      const nueva = sesiones.save.mock.calls[0][0] as TokenSesion;
      expect(nueva.id).not.toBe(sesion.id);
      expect(nueva.familiaId).toBe(sesion.familiaId);
      expect(nueva.refreshTokenHash).toBe(hashToken('rt-nuevo'));
      expect(nueva.revocado).toBe(false);
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        {
          sub: resultado.usuario.id,
          rol: resultado.usuario.rol,
          tipo: 'refresh',
        },
        expect.objectContaining({ jwtid: nueva.id }),
      );
    });

    it('detecta REUSO (hash distinto al vigente) → 401 y revoca TODA la familia', async () => {
      const tokenVigente = 'rt-vigente';
      const sesion = mockSesion({ refreshTokenHash: hashToken(tokenVigente) });
      const { servicio, sesiones } = crearServidoConValidacion({ sesion });

      await expect(servicio.rotar('rt-robado')).rejects.toThrow(
        MENSAJE_REUSO_DETECTADO,
      );
      expect(sesiones.update).toHaveBeenCalledWith(
        { familiaId: sesion.familiaId },
        { revocado: true },
      );
    });

    it('rechaza sesiones ya revocadas con 401 y revoca la familia (posible reuso)', async () => {
      const sesion = mockSesion({ refreshTokenHash: hashToken('rt'), revocado: true });
      const { servicio, sesiones } = crearServidoConValidacion({ sesion });

      await expect(servicio.rotar('rt')).rejects.toThrow(MENSAJE_SESION_INVALIDA);
      expect(sesiones.update).toHaveBeenCalledWith(
        { familiaId: sesion.familiaId },
        { revocado: true },
      );
    });

    it('revoca la sesión si el token expiró y responde 401', async () => {
      const sesion = mockSesion({
        refreshTokenHash: hashToken('rt-largo'),
        expiraEn: new Date(Date.now() - 60_000),
      });
      const { servicio, sesiones } = crearServidoConValidacion({ sesion });

      await expect(servicio.rotar('rt-largo')).rejects.toThrow(
        MENSAJE_SESION_INVALIDA,
      );
      expect(sesiones.update).toHaveBeenCalledWith(
        { id: sesion.id },
        { revocado: true },
      );
    });

    it('rechaza tokens con tipo != refresh (p. ej. un access)', async () => {
      const { servicio } = crearServidoConValidacion({ payload: { tipo: 'access' } });

      await expect(servicio.rotar('token')).rejects.toThrow(MENSAJE_SESION_INVALIDA);
    });
  });

  describe('revocar', () => {
    it('revoca la familia completa y es idempotente', async () => {
      const token = 'rt-sesion';
      const sesion = mockSesion({ refreshTokenHash: hashToken(token) });
      const { servicio, sesiones } = crearServidoConValidacion({ sesion });

      await servicio.revocar(token);
      expect(sesiones.update).toHaveBeenCalledWith(
        { familiaId: sesion.familiaId },
        { revocado: true },
      );

      // Idempotente: si la sesión ya no existe, no lanza.
      sesiones.findOneBy.mockResolvedValueOnce(null);
      await expect(servicio.revocar(token)).resolves.toBeUndefined();
    });

    it('no lanza si el token es inválido (logout silencioso)', async () => {
      const { servicio } = crearServidoConValidacion({ tokenInvalido: true });
      await expect(servicio.revocar('token-basura')).resolves.toBeUndefined();
    });
  });
});

/** Helper con verifyAsync configurable y payload por defecto de refresh. */
function crearServidoConValidacion(opciones: {
  sesion?: TokenSesion | null;
  payload?: Partial<Record<string, unknown>>;
  tokenFirmado?: string;
  tokenInvalido?: boolean;
}) {
  const base = crearServicio({
    sesion: opciones.sesion ?? null,
    tokenFirmado: opciones.tokenFirmado ?? 'rt-nuevo',
  });
  base.jwtService.verifyAsync.mockImplementation(
    async (): Promise<Record<string, unknown>> => {
      if (opciones.tokenInvalido) throw new Error('firma inválida');
      return {
        sub: 'usuario-1',
        rol: RolUsuario.ESTUDIANTE,
        tipo: 'refresh',
        jti: opciones.sesion?.id ?? 'sesion-1',
        ...opciones.payload,
      };
    },
  );
  return base;
}