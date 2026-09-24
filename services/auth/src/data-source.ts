import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Usuario } from './auth/entities/usuario.entity';
import { TokenSesion } from './auth/entities/token-sesion.entity';
import { MigracionInicial1710000000000 } from './auth/migrations/1710000000000-migracion-inicial';

/**
 * DataSource para la CLI de TypeORM (migration:run, migration:generate)
 * y para los scripts de seeds. NO se usa en la aplicación en ejecución
 * (esa usa TypeOrmModule.forRootAsync con migrationsRun: true).
 */
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || undefined,
  host: process.env.DATABASE_URL ? undefined : process.env.DB_HOST || 'localhost',
  port: process.env.DATABASE_URL ? undefined : Number(process.env.DB_PORT || 5432),
  username: process.env.DATABASE_URL ? undefined : process.env.DB_USER || 'eventivo',
  password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD || '',
  database: process.env.DATABASE_URL ? undefined : process.env.DB_NAME || 'auth_db',
  entities: [Usuario, TokenSesion],
  migrations: [MigracionInicial1710000000000],
  migrationsRun: false,
  synchronize: false,
});