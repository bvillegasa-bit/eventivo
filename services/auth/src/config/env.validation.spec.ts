import { esquemaEnv } from './env.validation';

describe('config/env.validation (Joi, T-S1.05)', () => {
  const baseValido = {
    NODE_ENV: 'development',
    PORT: 3001,
    DB_HOST: 'localhost',
    DB_PORT: 5432,
    DB_USER: 'eventivo',
    DB_PASSWORD: 'clave',
    DB_NAME: 'auth_db',
    JWT_SECRET: 'x'.repeat(40),
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_TTL: '7d',
    JWT_ISSUER: 'https://api.eventivo.ucv.edu.pe',
    JWT_AUDIENCE: 'eventivo-app',
    X_SERVICE_KEY: 'clave-de-servicio-larga',
  };

  it('acepta un entorno válido (con valores por defecto donde corresponde)', () => {
    const { error, value } = esquemaEnv.validate(baseValido);
    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3001);
    expect(value.DB_HOST).toBe('localhost');
    expect(value.LOGIN_RATE_LIMIT_LIMIT).toBe(10);
  });

  it('rechaza JWT_SECRET faltante o demasiado corto (seguridad R-07)', () => {
    const sinSecreto: Record<string, unknown> = { ...baseValido };
    delete sinSecreto.JWT_SECRET;
    expect(esquemaEnv.validate(sinSecreto).error).toBeDefined();

    const secretoCorto = { ...baseValido, JWT_SECRET: 'abc' };
    expect(esquemaEnv.validate(secretoCorto).error).toBeDefined();
  });

  it('rechaza valores inválidos de puerto y issuer', () => {
    expect(esquemaEnv.validate({ ...baseValido, PORT: 99999 }).error).toBeDefined();
    expect(
      esquemaEnv.validate({ ...baseValido, JWT_ISSUER: 'no-es-una-url' }).error,
    ).toBeDefined();
  });

  it('permite DATABASE_URL opcional (producción) y valida su esquema', () => {
    const conUrl = { ...baseValido, DATABASE_URL: 'postgresql://app:clave@supabase:5432/auth' };
    expect(esquemaEnv.validate(conUrl).error).toBeUndefined();

    const urlMala = { ...baseValido, DATABASE_URL: 'mysql://x/y' };
    expect(esquemaEnv.validate(urlMala).error).toBeDefined();
  });
});