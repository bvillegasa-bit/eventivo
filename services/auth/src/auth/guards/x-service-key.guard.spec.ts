import {
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { XServiceKeyGuard } from './x-service-key.guard';

function criarContexto(header: Record<string, string | undefined>): ExecutionContext {
  const request = { headers: header };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function crearGuard(claveEsperada: string): XServiceKeyGuard {
  const configService = {
    get: jest.fn((_clave: string, defecto?: string) => claveEsperada ?? defecto),
  } as unknown as ConfigService;
  return new XServiceKeyGuard(configService);
}

describe('XServiceKeyGuard (DT-02)', () => {
  const clave = 'clave-servicio-secreta-de-prueba';

  it('permite el acceso con la X-Service-Key correcta', () => {
    const guard = crearGuard(clave);
    const contexto = criarContexto({ 'x-service-key': clave });
    expect(guard.canActivate(contexto)).toBe(true);
  });

  it('rechaza con 403 una clave incorrecta', () => {
    const guard = crearGuard(clave);
    const contexto = criarContexto({ 'x-service-key': 'clave-equivocada' });
    expect(() => guard.canActivate(contexto)).toThrowError(HttpException);
    try {
      guard.canActivate(contexto);
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
    }
  });

  it('rechaza con 403 si falta el header', () => {
    const guard = crearGuard(clave);
    const contexto = criarContexto({});
    expect(() => guard.canActivate(contexto)).toThrowError(HttpException);
  });

  it('rechaza siempre si el entorno no tiene X_SERVICE_KEY configurada', () => {
    const guard = crearGuard('');
    const contexto = criarContexto({ 'x-service-key': clave });
    expect(() => guard.canActivate(contexto)).toThrowError(HttpException);
  });
});