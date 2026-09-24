/* eslint-disable no-console -- script CLI: la consola es la salida natural del seed. */
import 'dotenv/config';
import dataSource from '../data-source';
import { sembrarAdministradores } from './auth.seed';

/**
 * Ejecución manual: `npm run seed` (requiere .env local, ver .env.example).
 * Aplica migraciones pendientes y siembra los administrativos demo de forma idempotente.
 */
async function main(): Promise<void> {
  const emails = (process.env.SEED_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
  const password = process.env.SEED_ADMIN_PASSWORD ?? '';

  if (emails.length === 0 || password.length === 0) {
    console.error(
      'Faltan SEED_ADMIN_EMAILS o SEED_ADMIN_PASSWORD.\n' +
        'Copia el archivo .env.example a .env y configura los valores de desarrollo local.',
    );
    process.exit(1);
  }

  await dataSource.initialize();
  await dataSource.runMigrations();

  const resultado = await sembrarAdministradores(dataSource, { emails, password });

  console.log(
    `Seed de auth completado: ${resultado.creados} administrativo(s) creado(s), ` +
      `${resultado.existentes} ya existían (idempotente).`,
  );

  await dataSource.destroy();
}

main().catch((error) => {
  console.error('Error ejecutando el seed de auth:', error);
  process.exit(1);
});