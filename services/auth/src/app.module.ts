import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './common/health.controller';
import { esquemaEnv } from './config/env.validation';
import { crearOpcionesTypeOrm } from './config/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // allowUnknown: el entorno trae más variables (PATH, etc.) que no controlamos.
      validationSchema: esquemaEnv,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => crearOpcionesTypeOrm(config),
    }),
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}