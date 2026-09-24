# Evidencia de cobertura de tests (TT-03)

**Servicio**: auth-service · **Sprint**: 1 · **Fecha**: 2026-09-24

Umbrales definidos en `services/auth/package.json` (`jest.coverageThreshold.global`):
statement ≥ 85 %, branch ≥ 80 %, function ≥ 85 %, line ≥ 85 %.

## Resultado `npm test` (jest --coverage)

| Métrica | Umbral | Obtenido | Estado |
|---|---|---|---|
| Statements | 85 % | 98.42 % | ✅ |
| Branches | 80 % | 88.77 % | ✅ |
| Functions | 85 % | 96.42 % | ✅ |
| Lines | 85 % | 98.42 % | ✅ |

**Suites**: 8 · **Tests**: 42/42 aprobados · **Snapshots**: 0.

## Cobertura por archivo (núcleo crítico S1: refresh + RBAC)

| Archivo | % Lines |
|---|---|
| `src/auth/auth.service.ts` | 97.74 |
| `src/auth/refresh/refresh.service.ts` (rotación/reuso DT-05) | 97.82 |
| `src/auth/guards/jwt-auth.guard.ts` | 96.92 |
| `src/auth/guards/roles.guard.ts` (RBAC) | 100 |
| `src/auth/guards/rate-limit.guard.ts` (429) | 100 |
| `src/common/fecha.ts` (UTC−5, TT-01) | 100 |
| `src/config/env.validation.ts` | 100 |

Núcleo crítico (refresh/RBAC) ≥ 85 % ✅ — cumple TT-03 y T-S1.17.

## E2E (`npm run test:e2e`, Postgres 16 real vía Docker Compose)

- **Tests**: 19/19 aprobados (RF-01 escenarios 1-4, RF-02 login/refresh rotativo/logout,
  RBAC T-S1.09, rate limit 429 con Retry-After, reuso de refresh revoca familia).

## Umbrales en CI

`service-ci.yml` ejecuta `npm test` (cubre `coverageThreshold`) y `test:e2e`; la suite
falla si la cobertura baja de los umbrales (fail if below, TT-03).