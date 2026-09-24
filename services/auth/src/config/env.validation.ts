import * as Joi from 'joi';

/**
 * Esquema de validación de variables de entorno (ConfigModule + Joi).
 * Los valores por defecto corresponden SOLO al entorno de desarrollo local
 * (docker/docker-compose.dev.yml). En producción todo se inyecta vía env/secretos.
 */
export const esquemaEnv = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),

  PORT: Joi.number().port().default(3001),

  // PostgreSQL — si DATABASE_URL está presente, tiene prioridad sobre DB_*
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).optional(),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().port().default(5432),
  DB_USER: Joi.string().default('eventivo'),
  DB_PASSWORD: Joi.string().allow('').default(''),
  DB_NAME: Joi.string().default('auth_db'),

  // JWT (DT-05) — secretos en producción vía GitHub Secrets
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('7d'),
  JWT_ISSUER: Joi.string().uri().required(),
  JWT_AUDIENCE: Joi.string().required(),

  // Red interna (DT-02)
  X_SERVICE_KEY: Joi.string().min(16).required(),

  // Seeds de demo (RF-19)
  SEED_ADMIN_EMAILS: Joi.string().allow('').default(''),
  SEED_ADMIN_PASSWORD: Joi.string().allow('').default(''),

  // Rate limiting de login/registro (RF-02)
  LOGIN_RATE_LIMIT_LIMIT: Joi.number().integer().min(1).default(10),
  LOGIN_RATE_LIMIT_TTL_MS: Joi.number().integer().min(1000).default(900000),
});