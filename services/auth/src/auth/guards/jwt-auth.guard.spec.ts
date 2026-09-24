import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

function mockContexto(sobre: { headers?: Record<string, unknown>; body?: unknown } = {}): {
  contexto: ExecutionContext;
  request: { headers: Record<string, unknown>; body?: unknown; user?: unknown };
} {
  const request = { headers: sobre.headers ?? {}, body: sobre.body };
  return {
    request,
    contexto: {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext,
  };
}

function crearGuard(comportamientoVerificacion: (token: string) => Promise<unknown>) {
  const jwtService = {
    verifyAsync: jest.fn(comportamientoVerificacion),
  } as unknown as jest.Mocked<JwtService>;
  const configService = {
    get: jest.fn((clave: string) =>
      clave === 'JWT_SECRET' ? 'secreto-de-prueba-de-al-menos-32-caracteres' : 'valor',
    ),
  } as unknown as jest.Mocked<ConfigService>;
  const guard = new JwtAuthGuard(jwtService, configService);
  return { guard, jwtService };
}

describe('JwtAuthGuard (DT-05, T-S1.09)', () => {
  it('rechaza sin cabecera Authorization con 401', async () => {
    const { guard } = crearGuard(jest.fn());
    const { contexto } = mockContexto();
    await expect(guard.canActivate(contexto)).rejects.toThrowError(
      UnauthorizedException,
    );
  });

  it('rechaza cabeceras que no son Bearer', async () => {
    const { guard } = crearGuard(jest.fn());
    const { contexto } = mockContexto({ headers: { authorization: 'Basic abc' } });
    await expect(guard.canActivate(contexto)).rejects.toThrowError(
      UnauthorizedException,
    );
  });

  it('acepta un access token válido y adjunta el payload al request', async () => {
    const payload = { sub: 'u1', rol: 'docente', tipo: 'access' };
    const { guard, jwtService } = crearGuard(async () => payload);
    const { contexto, request } = mockContexto({
      headers: { authorization: 'Bearer token-valido' },
    });

    await expect(guard.canActivate(contexto)).resolves.toBe(true);
    expect(request.user).toEqual(payload);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith(
      'token-valido',
      expect.objectContaining({ algorithms: ['HS256'] }),
    );
  });

  it('rechaza un refresh token presentado como Bearer', async () => {
    const { guard } = crearGuard(async () => ({
      sub: 'u1',
      rol: 'docente',
      tipo: 'refresh',
      jti: 'sesion-1',
    }));
    const { contexto } = mockContexto({ headers: { authorization: 'Bearer rt' } });
    await expect(guard.canActivate(contexto)).rejects.toThrowError(
      UnauthorizedException,
    );
  });

  it('rechaza token con firma o payload inválido', async () => {
    const { guard } = crearGuard(async () => {
      throw new Error('firma inválida');
    });
    const { contexto } = mockContexto({ headers: { authorization: 'Bearer malo' } });
    await expect(guard.canActivate(contexto)).rejects.toThrowError(
      UnauthorizedException,
    );
  });
});