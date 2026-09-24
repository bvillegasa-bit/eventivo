# EVENTIVO

**Sistema de seguimiento de eventos académicos — UCV, campus Callao**

EVENTIVO es una aplicación móvil + backend de microservicios que cierra el ciclo **"el evento se difunde → la comunidad se entera → asiste o no"**, aportando trazabilidad completa para administrativos, docentes y estudiantes de la Universidad César Vallejo (campus Callao).

---

## ¿Qué problema resuelve?

Hoy los eventos académicos se difunden de forma informal por redes sociales y canales oficiales. **No existe trazabilidad**: no se confirma el evento, no hay recordatorios, no se registra la asistencia ni se conoce el estado de participación de cada docente o estudiante.

**Caso real que motiva el sistema:** el docente **Juan Pérez** tiene un día ocupado. A las 11:00 a. m. le comparten por redes/canales oficiales el aviso de un evento académico de la UCV campus Callao, pero **se le olvida**. No existe ningún sistema que le confirme el evento, le recuerde (24 h y 30 min antes), registre si asistió ni le muestre el estado de su participación.

EVENTIVO resuelve ese vacío con: difusión push, recordatorios configurables por evento, estadísticas de eventos (estados), preinscripción con cupos, asistencia por **código QR con self check-in**, encuestas post-evento y reportes auditables.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| App móvil | Flutter (MVVM) con Riverpod + GoRouter — Android 8+ (base) e iOS 13+ |
| Backend | 5 microservicios REST **NestJS/TypeScript**: `auth`, `evento`, `asistencia`, `notificacion`, `reporte` |
| Base de datos | **PostgreSQL** con esquema por servicio (`auth_db`, `evento_db`, `asistencia_db`, `notificacion_db`, `reporte_db`) |
| Autenticación | JWT + RBAC (access 15 min + refresh rotativo 7 días) |
| Notificaciones push | Firebase Cloud Messaging (FCM) + centro de notificaciones in-app como respaldo |
| Gateway | Nginx API Gateway (routing, rate limiting, TLS, encabezados de seguridad) |
| CI/CD | GitHub Actions |
| Hosting | Free tier — **costo total de la demo = $0** |
| Calidad / Seguridad | ISO/IEC 25010 · OWASP Top 10 |

## Estado del proyecto

- **Fase**: Sprint 1 en curso — implementación del **Batch 2** (app Flutter + gateway + red interna + CI de la app).
- **Proceso**: SCRUM — 4 sprints de 2 semanas (~2 meses hasta la demo).
- **Entregado hasta ahora**:
  - Infraestructura de desarrollo local: Docker Compose con 5 PostgreSQL 16 por servicio ([`docker/docker-compose.dev.yml`](docker/docker-compose.dev.yml)).
  - **auth-service** (NestJS 11 + TypeORM): registro (RF-01), login con anti-enumeración, refresh rotativo 7 días con revocación por reuso (RF-02, DT-05), guards JWT + RBAC (T-S1.09) y seed de administradores (T-S1.10). Unit 48/48, lint y build limpios, cobertura global > 95 %.
  - **Red interna (DT-02, T-S1.15)**: endpoint `GET /internal/auth/usuarios/:id` protegido con `X-Service-Key` (guard con comparación en tiempo constante) + e2e (23 pruebas).
  - **Gateway Nginx (T-S1.14)**: [`gateway/nginx/`](gateway/nginx/README.md) — routing `/auth/*` → auth-service, rate limiting por IP (20 r/s global, 5 r/s en login), `/internal/*` bloqueado al exterior (403), encabezados de seguridad; validado con `nginx -t` en la imagen oficial.
  - **App Flutter (MVVM, T-S1.11..T-S1.17)**: [`app/`](app/README.md) — registro/login, restauración de sesión, refresh automático (interceptor), demo RBAC y logout; `flutter analyze` limpio y **31/31 tests**.
  - **CI verde** con job de la app (`gitleaks` + `auth` + `openapi` + `app`) y SAST (CodeQL + Semgrep); gitleaks en CI (TT-02).
  - Documentación: DT-09 (free tier $0), OpenAPI del auth-service (TT-05) y **manual de demo del Sprint 1** ([`docs/manual-demo-s1.md`](docs/manual-demo-s1.md)).
- **Pieza central del entregable**: [diagrama de actividades del sistema](docs/04-diagrama-de-actividades.md) con carriles Administrativo / Sistema / Docente / Estudiante.

## Estructura del repositorio

```text
eventivo/
├── app/                  # Flutter (MVVM + Riverpod + GoRouter) — Sprint 1 Batch 2 ✅
├── services/
│   └── auth/             # auth-service (NestJS 11, API de autenticación)
├── gateway/
│   └── nginx/            # API Gateway Nginx (routing, rate limit, red interna) ✅
├── docker/
│   └── docker-compose.dev.yml  # 5 PostgreSQL 16 + auth + gateway en dev
├── seeds/
│   └── run-all.mjs       # runner de seeds de todos los servicios
├── docs/                 # charter, PRD, casos de uso, arquitectura, manual de demo, OpenAPI
└── .github/workflows/    # ci.yml, service-ci.yml, sast.yml + dependabot.yml
```

## Inicio rápido (development)

El archivo de compose vive en `docker/` y **no es autodetectable**: no hay un
`compose.yaml` en la raíz, por lo que `-f` es **obligatorio** en todos los
comandos de Docker Compose.

```bash
# 1. Levantar el backend local (desde la raíz del monorepo)
docker compose -f docker/docker-compose.dev.yml up -d --build

# Solo los servicios activos del Sprint 1 (auth-db + auth + gateway):
docker compose -f docker/docker-compose.dev.yml up -d --build auth-db gateway auth
```

Health checks:

```bash
curl http://localhost:3001/health   # auth-service -> {"estado":"ok","servicio":"auth",...}
curl http://localhost:8080          # gateway -> 200
```

```bash
# 2. Correr la app Flutter — pubspec.yaml está en app/ (no en apps/)
cd app
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080
```

```bash
# 3. Manual de demo del Sprint 1
#    docs/manual-demo-s1.md  (guion paso a paso con evidencia y curl)
```

## Secretos de GitHub (solo nombres)

Definidos en **Settings → Secrets and variables → Actions → Repository secrets** de
<https://github.com/bvillegasa-bit/eventivo>. Los valores reales se cargan en el
despliegue (deploy de Render/Supabase) y **nunca** se versionan:

| Secreto | Uso |
|---|---|
| `DATABASE_URL_AUTH` | URL de conexión PostgreSQL de `auth_db` (demo/producción) |
| `DATABASE_URL_EVENTO` | URL de conexión PostgreSQL de `evento_db` |
| `DATABASE_URL_ASISTENCIA` | URL de conexión PostgreSQL de `asistencia_db` |
| `DATABASE_URL_NOTIFICACION` | URL de conexión PostgreSQL de `notificacion_db` |
| `DATABASE_URL_REPORTE` | URL de conexión PostgreSQL de `reporte_db` |
| `JWT_SECRET` | Secreto de firma HS256 (access 15 m + refresh 7 d) |
| `X_SERVICE_KEY` | Clave de invocación entre servicios (gateway interno) |
| `FIREBASE_SERVICE_ACCOUNT` | JSON de credenciales de Firebase Cloud Messaging |
| `RENDER_API_KEY` | Token de la API de Render para deploys automáticos |

## Índice de documentación

| Documento | Contenido |
|---|---|
| [docs/README.md](docs/README.md) | Índice completo de la documentación |
| [docs/01-charter.md](docs/01-charter.md) | Project Charter: problema, objetivos, alcance MVP, stakeholders, riesgos, cronograma, criterios de éxito |
| [docs/02-prd.md](docs/02-prd.md) | PRD: requisitos funcionales RF-01..RF-20, estados del evento, reglas de negocio BR-01..BR-08 |
| [docs/03-casos-de-uso.md](docs/03-casos-de-uso.md) | Casos de uso UC-01..UC-15 |
| [docs/04-diagrama-de-actividades.md](docs/04-diagrama-de-actividades.md) | **Diagrama de actividades (entregable central)** |
| [docs/05-arquitectura.md](docs/05-arquitectura.md) | Arquitectura, ERD, contratos API, MVVM Flutter, despliegue |
| [docs/06-backlog-scrum.md](docs/06-backlog-scrum.md) | Backlog SCRUM: 4 sprints, 77 tareas, Definición de Done, trazabilidad |
| [docs/07-calidad-y-seguridad.md](docs/07-calidad-y-seguridad.md) | Matriz ISO/IEC 25010, capa OWASP, criterios no funcionales |
| [docs/manual-demo-s1.md](docs/manual-demo-s1.md) | **Manual de demo del Sprint 1** (guion paso a paso con curl y evidencias) |
| [docs/decisiones/](docs/decisiones/) | Registro de decisiones de arquitectura (ADR): DT-09 free tier $0 |
| [docs/api/](docs/api/) | Especificaciones OpenAPI por servicio: auth |
| [docs/diagramas/](docs/diagramas/) | Diagramas renderizados (PNG) y fuentes (PlantUML/Mermaid) |

## Repositorio

- URL: <https://github.com/bvillegasa-bit/eventivo>
- Rama: `main`
- Documentación 100 % en español (requisito del Ingeniero).