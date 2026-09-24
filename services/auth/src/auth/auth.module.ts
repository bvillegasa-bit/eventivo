import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenSesion } from './entities/token-sesion.entity';
import { Usuario } from './entities/usuario.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RolesGuard } from './guards/roles.guard';
import { RefreshService } from './refresh/refresh.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, TokenSesion]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>(
            'JWT_ACCESS_TTL',
            '15m',
          ) as JwtSignOptions['expiresIn'],
          issuer: config.get<string>('JWT_ISSUER'),
          audience: config.get<string>('JWT_AUDIENCE'),
          algorithm: 'HS256',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshService, JwtAuthGuard, RolesGuard, RateLimitGuard],
})
export class AuthModule {}