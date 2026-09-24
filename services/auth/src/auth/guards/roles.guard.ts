import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { METADATA_ROLES } from '../decorators/roles.decorator';
import { RolUsuario } from '../entities/usuario.entity';
import { PayloadAcceso } from './jwt-auth.guard';

/**
 * RBAC por endpoint (T-S1.09): si la ruta declara @Roles(...) y el rol del
 * usuario autenticado no está incluido → 403. Sin @Roles → acceso libre
 * (siempre detrás de JwtAuthGuard en las rutas protegidas).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<RolUsuario[]>(METADATA_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles || roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const usuario = request.user as PayloadAcceso | undefined;

    if (!usuario || !usuario.rol) {
      throw new ForbiddenException('No tienes permisos para realizar esta acción');
    }

    if (!roles.includes(usuario.rol as RolUsuario)) {
      throw new ForbiddenException('No tienes permisos para realizar esta acción');
    }

    return true;
  }
}