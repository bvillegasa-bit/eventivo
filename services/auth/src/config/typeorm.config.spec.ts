import { ConfigService } from '@nestjs/config';
import { crearOpcionesTypeOrm } from './typeorm.config';

function configMock(valores: Record<string, unknown>): ConfigService {
  return {
    get: jest.fn((clave: string) => valores[clave]),
  } as unknown as ConfigService;
}

describe('config/typeorm.config (DT-01, T-S1.05)', () => {
  it('construye opciones con host/puerto cuando NO hay DATABASE_URL (dev local)', () => {
    const config = configMock({
      DATABASE_URL: undefined,
      DB_HOST: 'localhost',
      DB_PORT: 5432,
      DB_USER: 'eventivo',
      DB_PASSWORD: 'clave',
      DB_NAME: 'auth_db',
    });

    const opciones = crearOpcionesTypeOrm(config) as Record<string, unknown>;

    expect(opciones.type).toBe('postgres');
    expect(opciones.host).toBe('localhost');
    expect(opciones.port).toBe(5432);
    expect(opciones.database).toBe('auth_db');
    expect(opciones.synchronize).toBe(false);
    expect(opciones.migrationsRun).toBe(true);
  });

  it('usa DATABASE_URL única (producción: Supabase) y omite host/puerto sueltos', () => {
    const config = configMock({
      DATABASE_URL: 'postgresql://app:clave@supabase:5432/auth_db',
      DB_HOST: 'localhost',
    });

    const opciones = crearOpcionesTypeOrm(config) as Record<string, unknown>;

    expect(opciones.url).toBe('postgresql://app:clave@supabase:5432/auth_db');
    expect(opciones.host).toBeUndefined();
    expect(opciones.port).toBeUndefined();
  });

  it('nunca activa synchronize (las migraciones son la única vía de esquema)', () => {
    const config = configMock({});
    const opciones = crearOpcionesTypeOrm(config);
    expect(opciones.synchronize).toBe(false);
  });
});