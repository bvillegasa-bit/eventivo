import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolUsuario } from '../entities/usuario.entity';
import { RolesGuard } from './roles.guard';

function mockContexto(sobre: { user?: unknown } = {}): { contexto: ExecutionContext } {
  const request = { user: sobre.user };
  return {
    contexto: {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext,
  };
}

function crearGuard(rolesMetadata: RolUsuario[] | undefined) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(rolesMetadata),
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard (T-S1.09, RBAC)', () => {
  it('permite el acceso cuando la ruta no declara roles', () => {
    const guard = crearGuard(undefined);
    const { contexto } = mockContexto({ user: { rol: RolUsuario.ESTUDIANTE } });
    expect(guard.canActivate(contexto)).toBe(true);
  });

  it('permite el acceso cuando el rol está incluido', () => {
    const guard = crearGuard([RolUsuario.ADMINISTRATIVO]);
    const { contexto } = mockContexto({ user: { rol: RolUsuario.ADMINISTRATIVO } });
    expect(guard.canActivate(contexto)).toBe(true);
  });

  it('responde 403 cuando el rol no está incluido', () => {
    const guard = crearGuard([RolUsuario.ADMINISTRATIVO]);
    const { contexto } = mockContexto({ user: { rol: RolUsuario.DOCENTE } });
    expect(() => guard.canActivate(contexto)).toThrowError(ForbiddenException);
  });

  it('responde 403 cuando no hay usuario autenticado en el request', () => {
    const guard = crearGuard([RolUsuario.DOCENTE]);
    const { contexto } = mockContexto({ user: undefined });
    expect(() => guard.canActivate(contexto)).toThrowError(ForbiddenException);
  });
});