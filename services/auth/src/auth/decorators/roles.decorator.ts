import { SetMetadata } from '@nestjs/common';
import { RolUsuario } from '../entities/usuario.entity';

export const METADATA_ROLES = 'roles';

/** Declara los roles permitidos para un endpoint (se consume en RolesGuard). */
export const Roles = (...roles: RolUsuario[]) => SetMetadata(METADATA_ROLES, roles);