# Docker del entorno de desarrollo — EVENTIVO

Levanta las **5 bases PostgreSQL 16** (una por microservicio, DT-01) y los
**servicios NestJS** del monorepo en modo watch. Solo `auth` está activo en el
Sprint 1; los bloques de los demás servicios ya están documentados como plantilla.

## Comandos (desde la raíz del monorepo)

```bash
# 1. Bases de datos (auth_db, evento_db, asistencia_db, notificacion_db, reporte_db)
docker compose -f docker/docker-compose.dev.yml up -d auth-db

# 2. auth-service (compila la imagen la primera vez)
docker compose -f docker/docker-compose.dev.yml up auth
```

## Puertos

| Servicio      | Puerto | Base       | Puerto BD |
| ------------- | ------ | ---------- | --------- |
| auth          | 3001   | auth_db    | 5432      |
| *(evento)*    | 3002   | evento_db  | 5433      |
| *(asistencia)*| 3003   | asistencia_db | 5434    |
| *(notificacion)* | 3004 | notificacion_db | 5435 |
| *(reporte)*   | 3005   | reporte_db | 5436      |

> Los servicios en cursiva se activan en sprints posteriores; sus bases ya están listas.

## Credenciales del SÚPER USUARIO local (solo desarrollo)

- Usuario: `eventivo` · Contraseña: `eventivo_desarrollo_local`
- ⚠️ Son valores de desarrollo local **NO versionados en producción**; en producción
  (Supabase) las credenciales van en GitHub Secrets (ver README raíz).

## Verificación

```bash
# Migraciones (se aplican solas al arrancar el servicio) + seed idempotente de 2 admins:
npm --prefix services/auth run seed

# Healthcheck del servicio:
curl http://localhost:3001/health
```

Para correr los tests e2e del auth-service contra la base local:

```bash
docker compose -f docker/docker-compose.dev.yml up -d auth-db
npm --prefix services/auth run test:e2e
```