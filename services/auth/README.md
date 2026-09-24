# auth-service — EVENTIVO

Microservicio de **autenticación y RBAC** de EVENTIVO (NestJS + TypeORM + PostgreSQL).

## Endpoints (S1)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/registro` | Público | Registro de `estudiante`/`docente` (email + contraseña, bcrypt cost 12) → emite access + refresh |
| POST | `/auth/login` | Público | Login → access (15 min) + refresh rotativo (7 d) — rate limit 10/15 min por IP+email |
| POST | `/auth/refresh` | ▪ | Rotación de refresh token (hash en BD, revocación del anterior, detección de reuso) |
| POST | `/auth/logout` | ▪ | Cierra sesión y revoca la familia de refresh tokens |
| GET | `/auth/me` | ▪ | Perfil propio (nunca expone `password_hash`) |
| GET | `/auth/admin-ping` | ADM | Fixture de RBAC: 403 si el rol no es `administrativo` |
| GET | `/health` | Público | Healthcheck (200) |

## Desarrollo local

```bash
# 1. Levantar PostgreSQL de desarrollo (raíz del monorepo)
docker compose -f docker/docker-compose.dev.yml up -d auth-db

# 2. Configurar entorno local
cp .env.example .env

# 3. Instalar, migrar y arrancar
npm ci
npm run migration:run
npm run start:dev
```

## Calidad

```bash
npm run lint     # ESLint (0 warnings permitidos)
npm run test     # Jest unitario + cobertura (núcleo auth ≥ 85 %, TT-03)
npm run test:e2e # Supertest contra PostgreSQL real (RF-01/RF-02)
npm run seed     # Seed idempotente de 2 administrativos (RF-19 parcial, T-S1.10)
```

> Detalle técnico: el hash de contraseñas usa **bcryptjs** (cost 12), implementación
> pura de bcrypt en JS — mismo formato y costes que `bcrypt`, sin dependencias nativas.