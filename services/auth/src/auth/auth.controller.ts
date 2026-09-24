import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService, RespuestaAutenticacion, ParTokens } from './auth.service';
import { Roles } from './decorators/roles.decorator';
import { LoginDto } from './dto/login.dto';
import { LogoutDto, RefreshDto } from './dto/refresh.dto';
import { RegistroDto } from './dto/registro.dto';
import { RolUsuario } from './entities/usuario.entity';
import { JwtAuthGuard, PayloadAcceso } from './guards/jwt-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RolesGuard } from './guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('registro')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimitGuard)
  registro(@Body() dto: RegistroDto): Promise<RespuestaAutenticacion> {
    return this.authService.registro(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  login(@Body() dto: LoginDto): Promise<RespuestaAutenticacion> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto): Promise<ParTokens> {
    return this.authService.refrescar(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: LogoutDto): Promise<{ mensaje: string }> {
    return this.authService.cerrarSesion(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: Request): Promise<RespuestaAutenticacion['usuario']> {
    const usuario = request.user as PayloadAcceso;
    return this.authService.miPerfil(usuario.sub);
  }

  /** Fixture de RBAC (T-S1.09): solo rol administrativo. */
  @Get('admin-ping')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMINISTRATIVO)
  adminPing(): { mensaje: string } {
    return { mensaje: 'Acceso administrativo correcto' };
  }
}