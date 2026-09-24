import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthService, PerfilPublico } from '../auth.service';
import { XServiceKeyGuard } from '../guards/x-service-key.guard';

/**
 * DT-02 — API interna del servicio auth (red entre servicios).
 *
 * Prefijo reservado `/internal/*`: el gateway Nginx lo BLOQUEA hacia el
 * exterior; solo se consume con `X-Service-Key` (guard [XServiceKeyGuard]).
 * Estos endpoints no emiten JWT para usuarios: el consumidor es otro servicio.
 */
@Controller('internal/auth')
@UseGuards(XServiceKeyGuard)
export class InternalAuthController {
  constructor(private readonly authService: AuthService) {}

  /** Perfil público de un usuario por id (para reportes/FCM, etc.). */
  @Get('usuarios/:id')
  obtenerUsuario(@Param('id') id: string): Promise<PerfilPublico> {
    return this.authService.perfilPorId(id);
  }
}