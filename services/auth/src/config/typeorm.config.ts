import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { MigracionInicial1710000000000 } from '../auth/migrations/1710000000000-migracion-inicial';

/**
 * Opciones compartidas de TypeORM (AppModule y tests e2e).
 * Esquema por servicio (database-per-service): auth_db, DT-01.
 * Fechas siempre timestamptz UTC (DT-10, BR-08).
 */
export function crearOpcionesTypeOrm(config: ConfigService): TypeOrmModuleOptions {
  const url = config.get<string>('DATABASE_URL');
  return {
    type: 'postgres',
    url: url || undefined,
    host: url ? undefined : config.get<string>('DB_HOST'),
    port: url ? undefined : config.get<number>('DB_PORT'),
    username: url ? undefined : config.get<string>('DB_USER'),
    password: url ? undefined : config.get<string>('DB_PASSWORD'),
    database: url ? undefined : config.get<string>('DB_NAME'),
    autoLoadEntities: true,
    // Las migraciones se aplican automáticamente al arrancar (T-S1.05).
    migrations: [MigracionInicial1710000000000],
    migrationsRun: true,
    synchronize: false,
  };
}