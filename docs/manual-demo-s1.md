# Manual de demo — Sprint 1 (T-S1.18)

Guion de demostración del **Sprint 1** de EVENTIVO ante el Ingeniero: qué
mostrar, en qué orden, qué evidencias respaldan cada paso y qué comandos usamos
para reproducirlo. Todo el material se demuestra **en vivo o con el repo a la
vista** (no se preparan capturas editadas).

Duración sugerida: **10–12 minutos**.

---

## 0. Contexto previo (1 min)

| Pieza | Estado en demo |
|---|---|
| Repositorio | `https://github.com/bvillegasa-bit/eventivo` (rama `main`, CI verde) |
| Entorno local (raíz del monorepo) | `docker compose -f docker/docker-compose.dev.yml up -d --build auth-db gateway auth` |
| auth-service | arranca con el comando anterior (`:3001`) |
| Gateway Nginx | arranca con el comando anterior (`:8080`) |
| App Flutter | `cd app` + `flutter pub get` + `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080` |

> Comandos ejecutados desde la **raíz del monorepo**; los de la app Flutter,
> dentro de `app/`. La app apunta al **gateway** (`:8080`) para demostrar el
> punto único de entrada; el valor por defecto `http://10.0.2.2:3001` (servicio
> directo) queda como fallback de desarrollo.

## 1. Salud del sistema (1 min)

```bash
curl http://localhost:3001/health     # {"estado":"ok","servicio":"auth",...}
curl http://localhost:8080/healthz    # "ok" (el propio gateway Nginx)
curl http://localhost:8080/auth/health # auth via gateway -> 200
```

**Qué se demuestra**: el gateway enruta `/auth/*` al auth-service (DT-02) y
expone su propio healthcheck.

## 2. Registro (RF-01) — 2 min

En la app: **Crear cuenta** → rol **Estudiante** → datos → **Crear cuenta**.
Respuesta: `201` con par de tokens y redirección a `/inicio`.

Evidencia con API (mismo contrato que usa la app, `docs/api/auth.openapi.yaml`):

```bash
curl -s -X POST http://localhost:8080/auth/registro \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@eventivo.ucv.edu.pe","password":"ClaveDemo2026!","rol":"estudiante","nombres":"Ana","apellidos":"García"}' | jq '.usuario'
```

**Extras opcionales que se pueden mostrar**:
- Email duplicado → `409` con mensaje genérico (sin revelar detalles).
- Contraseña débil → `400` con detalle por campo.
- Intento de `rol: "administrativo"` → `403` (los administrativos solo se crean
  por seed, T-S1.10).

## 3. Login + restauración de sesión (RF-02) — 2 min

1. **Cerrar la app** (kill) tras iniciar sesión y **reabrirla** → el splash
   restaura la sesión desde el almacenamiento seguro (no pide credenciales).
2. Con la app abierta: reiniciar el auth-service
   (`docker compose -f docker/docker-compose.dev.yml restart auth`)
   → el interceptor detecta `401` en una petición protegida, **rota el refresh
   token** y reintenta la petición automáticamente (sin cerrar sesión).

**Qué demuestra**: refresh rotativo 7 días (DT-05) + interceptor JWT del lado
Flutter.

## 4. RBAC — demo de acceso administrativo (T-S1.09) — 1 min

En **Perfil → "Demostración de permisos"**:

| Rol | Resultado |
|---|---|
| Estudiante / Docente | `403` — "No tienes permisos de administración" |
| Administrativo (seed) | `200` — "Acceso administrativo verificado" |

Seed de administrativos (idempotente):

```bash
cp services/auth/.env.example services/auth/.env
npm --prefix services/auth run seed
```

## 5. Rate limiting (TT-06) — 1 min

El gateway limita `POST /auth/login` a **5 r/s por IP** (además del rate-limit
del servicio: 10 intentos malos → `429` con `Retry-After`):

```bash
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"demo@eventivo.ucv.edu.pe","password":"incorrecta"}'
done
# 401 ... (hasta agotar) ... 429
```

## 6. Red interna protegida (DT-02) — 1 min

`/internal/*` **nunca** se expone por el gateway; y fuera de él exige
`X-Service-Key`:

```bash
curl -i http://localhost:8080/internal/auth/usuarios/abc   # 403 (gateway)
curl -i http://localhost:3001/internal/auth/usuarios/abc   # 403 (sin clave)
curl -i -H 'X-Service-Key: x-service-key-local-desarrollo-eventivo' \
  http://localhost:3001/internal/auth/usuarios/<id>        # 200 (perfil público)
```

**Qué demuestra**: la comunicación servicio↔servicio usa el contrato interno y
nunca pasa por la entrada pública.

## 7. Calidad (1 min) + cierre (1 min)

| Herramienta | Comando local | CI |
|---|---|---|
| Estático Flutter | `flutter analyze` | job `app` |
| Unit/widget Flutter | `flutter test` | job `app` |
| Unit auth-service | `npm --prefix services/auth test` | job `auth` (service-ci) |
| Lint auth-service | `npm --prefix services/auth run lint` | job `auth` |
| E2E auth (Postgres) | `npm --prefix services/auth run test:e2e` | job `auth` |
| Secretos (gitleaks) | — | job `gitleaks` |
| OpenAPI | `npx @redocly/cli lint docs/api/auth.openapi.yaml` | job `openapi` |

Cierre: `gh run list` en el repo mostrando el último run **verde** y recordar
que el **costo de la demo es $0** (DT-09).

---

## Checklist previo a la demo

- [ ] `docker compose -f docker/docker-compose.dev.yml up -d --build auth-db gateway auth` sin errores
- [ ] `gh run list --limit 3` → último run verde (jobs: gitleaks, auth, openapi, app)
- [ ] Emulador Android con la app instalada y apuntando a `API_BASE_URL=http://10.0.2.2:8080`
      (lanzar con `cd app && flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080`)
- [ ] Terminal preparada con los `curl` de las secciones 1, 5 y 6 (historial listo)
- [ ] Marco el caso Juan Pérez: "difusión → se entera → asiste" pero **confirmado y con recordatorio** (valor de negocio)

## Evidencia adicional

- Trazabilidad Sprint 1: [`docs/06-backlog-scrum.md`](06-backlog-scrum.md)
- Evidencias de cobertura: [`docs/evidencias/cobertura.md`](evidencias/cobertura.md)
- Decisión free tier: [`docs/decisiones/dt-09.md`](decisiones/dt-09.md)