import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimitGuard } from './rate-limit.guard';

function mockContexto(sobre: { ip?: string; email?: string } = {}): {
  contexto: ExecutionContext;
  response: { setHeader: jest.Mock };
} {
  const response = { setHeader: jest.fn() };
  const request = {
    ip: sobre.ip ?? '127.0.0.1',
    body: sobre.email ? { email: sobre.email } : undefined,
  };
  return {
    response,
    contexto: {
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    } as unknown as ExecutionContext,
  };
}

function crearGuard(limite = 3, ttlMs = 60_000) {
  const configService = {
    get: jest.fn((clave: string, defecto?: string | number) => {
      const valores: Record<string, number> = {
        LOGIN_RATE_LIMIT_LIMIT: limite,
        LOGIN_RATE_LIMIT_TTL_MS: ttlMs,
      };
      return valores[clave] ?? defecto;
    }),
  } as unknown as ConfigService;
  return new RateLimitGuard(configService);
}

describe('RateLimitGuard (RF-02, R-02)', () => {
  it('permite el primer intento', () => {
    const guard = crearGuard(3, 60_000);
    const { contexto } = mockContexto({ email: 'a@b.com' });
    expect(guard.canActivate(contexto)).toBe(true);
  });

  it('permite intentos hasta el límite inclusive', () => {
    const guard = crearGuard(3, 60_000);
    const { contexto } = mockContexto({ email: 'a@b.com' });
    expect(guard.canActivate(contexto)).toBe(true);
    expect(guard.canActivate(contexto)).toBe(true);
    expect(guard.canActivate(contexto)).toBe(true);
  });

  it('responde 429 con Retry-After al superar el límite y es independiente por IP+email', () => {
    const guard = crearGuard(2, 60_000);
    const contextoA = mockContexto({ ip: '10.0.0.1', email: 'a@b.com' });
    const contextoB = mockContexto({ ip: '10.0.0.2', email: 'a@b.com' });

    expect(() => {
      guard.canActivate(contextoA.contexto);
      guard.canActivate(contextoA.contexto);
      guard.canActivate(contextoA.contexto);
    }).toThrowError(HttpException);

    try {
      guard.canActivate(contextoA.contexto);
    } catch (error) {
      const ex = error as HttpException;
      expect(ex.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(contextoA.response.setHeader).toHaveBeenCalledWith(
        'Retry-After',
        expect.stringMatching(/^\d+$/),
      );
    }

    // Otra IP con el mismo email no está bloqueada.
    expect(guard.canActivate(contextoB.contexto)).toBe(true);
  });

  it('reinicia el contador cuando expira la ventana (fake timers)', () => {
    jest.useFakeTimers();
    try {
      const guard = crearGuard(1, 5_000);
      const { contexto } = mockContexto({ email: 'a@b.com' });
      expect(guard.canActivate(contexto)).toBe(true);
      expect(() => guard.canActivate(contexto)).toThrowError(HttpException);

      jest.advanceTimersByTime(5_001);
      expect(guard.canActivate(contexto)).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});