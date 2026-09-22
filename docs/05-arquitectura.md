# 05 · Arquitectura — EVENTIVO

**Backend de microservicios REST + app móvil Flutter (MVVM).** Documento derivado del diseño técnico del proyecto (decisiones DT-01..DT-11).

---

## 1. Vista de alto nivel

```
[App Flutter · MVVM (Android/iOS)]  ← FCM pushes → [Firebase Cloud Messaging]
        │ HTTPS + JWT (access + refresh)
        ▼
[Nginx API Gateway]  (routing, rate limiting, TLS/HTTPS, encabezados de seguridad)
   ├── /auth            → MS AUTH       (registro/login, JWT, RBAC, usuarios)
   ├── /eventos         → MS EVENTO     (CRUD, máquina de estados, QR, encuestas, feed)
   ├── /asistencia      → MS ASISTENCIA (preinscripción + aforo transaccional, check-in, "no asistió")
   ├── /notificaciones  → MS NOTIFICACION  (FCM, recordatorios T−24 h/T−30 min, centro in-app)
   └── /reportes        → MS REPORTE    (agregaciones bajo demanda)
        │
        ▼
[PostgreSQL — esquema por servicio: auth_db · evento_db · asistencia_db · notificacion_db · reporte_db]
```

### Decisiones clave de arquitectura (DT)

| ID | Decisión | Alternativas descartadas | Por qué |
|---|---|---|---|
| **DT-01** | Nginx API Gateway → 5 microservicios REST síncronos | Monolito, Kong, GraphQL | Fronteras de dominio limpias, aislamiento de datos, prepara la web (EC-08) |
| **DT-02** | Comunicación inter-servicios REST **síncrona** interna (`/internal/*` + `X-Service-Key`) | Cola asíncrona (Kafka/RabbitMQ) | Simplicidad MVP y consistencia inmediata; cola = evolución futura |
| **DT-03** | **Anti-sobrecupo**: fila-contador `cupos_evento` con UPDATE condicional en transacción | COUNT(*)+validación en app | Garantiza 0 sobrecupos bajo concurrencia (EC-03) |
| **DT-04** | **Check-in idempotente**: `UNIQUE(evento_id, usuario_id)` + `ON CONFLICT DO NOTHING` | Verificación previa sin constraint | El constraint es la última línea de defensa (EC-04) |
| **DT-05** | JWT access corto (15 min) + **refresh rotativo** (7 días) con hash en `token_sesiones` | Access largo sin revocación | Revocación de sesiones y rotación segura (OWASP) |
| **DT-06** | PK UUID v4 compartidas entre servicios (misma identidad, sin FK física) | IDs por servicio con mapping | Integridad por contrato; evita acoplamiento entre BBDD |
| **DT-07** | **Máquina de estados centralizada** en `evento` (validador de transiciones) | Transiciones libres por servicio | Consistencia del ciclo de vida |
| **DT-08** | Jobs **node-cron** dentro de `evento` (transiciones) y `notificacion` (recordatorios) | Infra de jobs externa | Cero coste free tier; arranque frío tolerable |
| **DT-09** | Despliegue demo: **1 contenedor** (Nginx + 5 procesos) en Render free | Despliegue independiente por servicio | Respeta la cuota 750 h/mes a $0 (EC-10); plan B documentado |
| **DT-10** | Fechas/agendamiento en `timestamptz` UTC; presentación y filtros en **UTC−5** | Almacenar local | Evita bugs de zona horaria en recordatorios (EC-05) |
| **DT-11** | Encuestas: configuración en `evento` (jsonb), respuestas en `asistencia` (jsonb, UNIQUE evento+usuario) | Tablas normalizadas por pregunta | Flexibilidad sin migraciones; atribución interna (PA-03) |

### Comunicación entre servicios
- REST síncrono vía API interna (red interna del contenedor, **no expuesta por el gateway**, prefijo reservado `/internal/*`, autenticación con `X-Service-Key`).
- `asistencia → evento`: contexto de evento (`GET /internal/eventos/:id/contexto`).
- `notificacion → evento/asistencia`: audiencia y preinscritos (`GET /internal/eventos/:id/audiencia`, `GET /internal/asistencia/eventos/:id/preinscritos`).
- `reporte → asistencia/evento/auth`: agregaciones bajo demanda.
- Transiciones y recordatorios: jobs node-cron dentro de cada servicio.

---

## 2. Microservicios

| Servicio | Responsabilidad | Puerto interno |
|---|---|---|
| **auth** | Registro (estudiante/docente), login, refresh/rotación, logout, RBAC, perfil. Admin provisionados por seed. | 3001 |
| **evento** | CRUD solo ADM, máquina de estados, publicación, QR por instancia, encuesta (config), feed/detalle, reprogramación/cancelación. | 3002 |
| **asistencia** | Preinscripción con aforo transaccional, check-in idempotente con elegibilidad, derivación "no asistió", encuestas (respuestas), trazabilidad. | 3003 |
| **notificacion** | Registro de dispositivos FCM, agendamiento T−24 h / T−30 min, envío FCM, centro in-app, log de notificaciones. | 3004 |
| **reporte** | Los 5 reportes del RF-15 (agregaciones bajo demanda + caché TTL 5 min). | 3005 |

## 3. Modelo de datos (ERD textual por servicio)

> PK en UUID v4; todo `timestamptz` en UTC; conversión a UTC−5 en presentación (DT-10). No hay FK físicas entre BBDD distintas: `usuario_id`/`evento_id` son la misma identidad UUID (integridad por contrato, DT-06).

### auth_db (esquema `auth`)
| Tabla | Columnas clave | Índices / constraints |
|---|---|---|
| `usuarios` | id uuid PK · email citext UNIQUE · password_hash text (bcrypt 12 / argon2id) · rol enum('estudiante','docente','administrativo') · nombres · apellidos · codigo_ucv text NULL · telefono text NULL · activo bool · creado_en | `UNIQUE(email)` · IDX(rol) |
| `token_sesiones` | id uuid PK · usuario_id FK · refresh_token_hash (nunca en claro) · expira_en · revocado · creado_en | IDX(usuario_id, revocado) · revocación por usuario |

### evento_db (esquema `evento`)
| Tabla | Columnas clave | Índices / constraints |
|---|---|---|
| `eventos` | id uuid PK · titulo · descripcion · modalidad enum('presencial','virtual','hibrida') · sede/ubicacion · fecha_inicio · fecha_fin · estado enum(BORRADOR|PUBLICADO|INSCRIPCIONES_ABIERTAS|EN_CURSO|COMPLETADO|CANCELADO|REPROGRAMADO) · publico_objetivo enum('TODOS','DOCENTES','ESTUDIANTES') · requiere_preinscripcion bool · aforo_max int NULL · recordatorios jsonb `{t24h, t30min}` · encuesta_habilitada bool · creado_por uuid · reprogramado_para NULL · creado_en | IDX(estado) · IDX(fecha_inicio) · IDX(publico_objetivo) · GIN(recordatorios) |
| `evento_ponentes` | id uuid PK · evento_id FK · nombre_ponente · es_docente bool · docente_id uuid NULL | IDX(evento_id) · soporta PA-01 y la dimensión ponente de PA-02 |
| `evento_estado_historial` | id uuid PK · evento_id FK · estado_anterior · estado_nuevo · actor_id NULL · motivo · creado_en | IDX(evento_id) · auditoría |
| `qrs_evento` | id uuid PK · evento_id FK · token_instancia text UNIQUE · generado_en · activo | `UNIQUE(token_instancia)` · `UNIQUE(evento_id)` vigente · ventana = `EN_CURSO` (DF-12) |
| `encuestas` | id uuid PK · evento_id FK UNIQUE · preguntas jsonb · creado_en | `UNIQUE(evento_id)` · config de encuesta |

### asistencia_db (esquema `asistencia`)
| Tabla | Columnas clave | Índices / constraints |
|---|---|---|
| `preinscripciones` | id uuid PK · evento_id · usuario_id · estado enum('ACTIVA','CANCELADA') · creado_en | **UNIQUE PARCIAL `(evento_id, usuario_id) WHERE estado='ACTIVA'`** (anti-duplicado) · IDX(evento_id) |
| `cupos_evento` | evento_id uuid PK · cupos_restantes int · version int | Fila-contador: **UPDATE condicional `SET cupos_restantes=cupos_restantes-1 WHERE… AND cupos_restantes>0 RETURNING *`** en transacción (ANTI-SOBRECUPO, EC-03) |
| `asistencias` | id uuid PK · evento_id · usuario_id · checkin_en · estado enum('CONFIRMADO','NO_ASISTIO') · fuente enum('CHECKIN','DERIVADO_CIERRE') | **UNIQUE(evento_id, usuario_id)** (ANTI-DUPLICADO, EC-04) + `INSERT … ON CONFLICT DO NOTHING` · IDX(evento_id) · IDX(usuario_id) |
| `encuesta_respuestas` | id uuid PK · evento_id · usuario_id · respuestas jsonb · creado_en | UNIQUE(evento_id, usuario_id) · atribuida internamente, presentada agregada (PA-03) |

### notificacion_db (esquema `notificacion`)
| Tabla | Columnas clave | Índices / constraints |
|---|---|---|
| `dispositivos` | id uuid PK · usuario_id · fcm_token text UNIQUE · plataforma enum('android','ios') · ultimo_visto | `UNIQUE(fcm_token)` · IDX(usuario_id) · limpieza de tokens obsoletos (RT-01) |
| `notificaciones_agendadas` | id uuid PK · evento_id · tipo enum('RECORDATORIO_24H','RECORDATORIO_30MIN') · programada_para · estado enum(PENDIENTE|ENVIADA|FALLIDA|CANCELADA) · enviada_en NULL | `UNIQUE(evento_id, tipo)` vigente · re-agendada al reprogramar (DF-15) |
| `notificaciones_log` | id uuid PK · evento_id · usuario_id NULL (broadcast) · tipo · titulo · cuerpo · fcm_resultado · creado_en | IDX(evento_id) · IDX(usuario_id) |
| `notificaciones_inapp` | id uuid PK · usuario_id · evento_id · tipo · leida · creado_en | IDX(usuario_id, leida) · centro in-app → respaldo de FCM (R-03) |

### reporte_db (esquema `reporte`)
| Tabla | Columnas clave | Índices / constraints |
|---|---|---|
| `reporte_cache` | id uuid PK · tipo enum(ASISTENCIA_EVENTO|PARTICIPACION|RANKING|POR_DOCENTE|METRICAS) · params jsonb · resultado jsonb · generado_en | IDX(tipo, generado_en) · caché opcional (TTL 5 min) · fuentes consultadas bajo demanda vía API interna |

---

## 4. Contratos API de alto nivel

> Convenciones: rutas detrás del gateway con prefijo de servicio. `▪` = autenticado (cualquier rol) · `ADM` = administrativo · `DOC` = docente · `EST` = estudiante · `Servicio` = red interna con `X-Service-Key`. Formato JSON; fechas en UTC−5 en I/O; errores tipados (NestJS `HttpException`).

### auth
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/registro` | Público | Registrar estudiante/docente (email+password, bcrypt) — rate limit |
| POST | `/auth/login` | Público | Login → access (15 min) + refresh (7 d) — rate limit 10/15 min/IP |
| POST | `/auth/refresh` | ▪ | Rotación de refresh (hash en BD, revoca el anterior) |
| POST | `/auth/logout` | ▪ | Cierra sesión: revoca refresh |
| GET | `/auth/me` | ▪ | Perfil propio (sin `password_hash`) |
| * | `/internal/auth/usuarios/:id` | Servicio | Usuario por id para otros servicios |

### evento
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/eventos` | ADM | Crear evento en BORRADOR (validación fechas/aforo) |
| GET | `/eventos` | ▪ | Feed/agenda con filtros (estado, fecha, público objetivo) |
| GET | `/eventos/:id` | ▪ | Detalle + mi estado |
| PATCH | `/eventos/:id` | ADM | Editar (solo BORRADOR / no estructural post-publicación) |
| POST | `/eventos/:id/publicar` | ADM | BORRADOR → PUBLICADO (+ difusión FCM) |
| POST | `/eventos/:id/abrir-inscripciones` | ADM | PUBLICADO → INSCRIPCIONES_ABIERTAS |
| POST | `/eventos/:id/cerrar-inscripciones` | ADM | Cierre anticipado |
| POST | `/eventos/:id/iniciar` | ADM | Override manual → EN_CURSO (PA-04) |
| POST | `/eventos/:id/cerrar` | ADM | Override manual → COMPLETADO |
| POST | `/eventos/:id/reprogramar` | ADM | → REPROGRAMADO (conserva preinscripciones, re-agenda, notifica) |
| POST | `/eventos/:id/cancelar` | ADM | → CANCELADO (libera cupos, notifica, bloquea) |
| GET | `/eventos/:id/qr` | ADM | QR único por instancia (pantalla + descargable/imprimible, PA-09) |
| PUT | `/eventos/:id/encuesta` | ADM | Definir preguntas de la encuesta post-evento |
| GET | `/eventos/:id/encuesta` | ▪ | Obtener encuesta (responder si asistió confirmado) |
| * | `/internal/eventos/:id/contexto` | Servicio | Contexto para preinscripción/check-in (estado, aforo, elegibilidad) |
| * | `/internal/eventos/:id/audiencia` | Servicio | Público objetivo + preinscritos (para FCM) |
| * | `/internal/eventos/:id/estado` | Servicio | Transición de estado (jobs horarios) |

### asistencia
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/asistencia/eventos/:id/preinscripcion` | DOC, EST | Preinscribirse (transacción anti-sobrecupo, EC-03) |
| DELETE | `/asistencia/eventos/:id/preinscripcion` | DOC, EST | Baja voluntaria (libera cupo) |
| GET | `/asistencia/eventos/:id/preinscripciones` | ADM | Monitorear preinscritos y cupos |
| GET | `/asistencia/mis-eventos` | ▪ | Trazabilidad por usuario (RF-16) |
| POST | `/asistencia/checkin` | DOC, EST | Check-in QR `{eventoId, qrToken}` — ventana, elegibilidad, idempotencia (EC-04), rate limit 10/min |
| GET | `/asistencia/eventos/:id` | ADM (+DOC ponente su evento, PA-01) | Lista de asistencia |
| POST | `/asistencia/eventos/:id/encuesta` | DOC, EST (asistente confirmado) | Responder encuesta |
| GET | `/asistencia/eventos/:id/encuesta/resultados` | ADM | Resultados agregados/anónimos (PA-03) |
| * | `/internal/asistencia/eventos/:id/preinscritos` | Servicio | Lista de preinscritos (FCM/reportes) |
| * | `/internal/asistencia/eventos/:id/asistentes` | Servicio | Lista de asistentes (reportes) |
| * | `/internal/asistencia/eventos/:id/derivar-no-asistencia` | Servicio | Al completar: marcar NO_ASISTIO |

### notificacion
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/notificaciones/dispositivos` | ▪ | Registrar/actualizar token FCM |
| DELETE | `/notificaciones/dispositivos/:token` | ▪ | Desregistrar dispositivo |
| GET | `/notificaciones` | ▪ | Centro de notificaciones in-app (respaldo R-03) |
| PUT | `/notificaciones/:id/leida` | ▪ | Marcar como leída |
| * | `/internal/notificaciones/enviar` | Servicio | Envío puntual/broadcast (difusión, cancelación, reprogramación) |
| * | `/internal/notificaciones/re-agendar` | Servicio | Re-agendar recordatorios (eventoId, nueva fecha) |

### reporte
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/reportes/asistencia-por-evento?eventoId=` | ADM (+DOC ponente propio, PA-01) | Confirmados / no-asistieron por evento |
| GET | `/reportes/participacion?eventoId=` | ADM | % participación |
| GET | `/reportes/ranking-eventos` | ADM | Ranking de eventos más concurridos |
| GET | `/reportes/asistencia-por-docente?dimension=asistente\|ponente` | ADM | Doble dimensión (PA-02) |
| GET | `/reportes/metricas-generales` | ADM | Totales, tasa promedio, eventos por estado |

---

## 5. Patrón MVVM en Flutter

Estructura de capas del monorepo (`app/`):

```
lib/
├── core/            # red (ApiClient dio, interceptor JWT+refresh), storage seguro
│                    # (flutter_secure_storage), tema, router (GoRouter), utilidades de fecha UTC−5
├── features/
│   ├── auth/        # views/ viewmodels/ models/ repositories/
│   ├── eventos/     # feed, detalle, QR
│   ├── asistencia/  # preinscripción, check-in, encuesta
│   ├── notificaciones/  # centro in-app, registro FCM
│   └── perfil/
```

- **View** = Widgets (`ConsumerWidget`): pantallas y componentes, `const`-optimizados, sin lógica de negocio.
- **ViewModel** = Notifiers de **Riverpod** (`StateNotifier`/`AsyncNotifier` por feature): estado de UI, flujos de preinscripción/check-in/encuesta, máquina de estados reflejada en badges.
- **Model** = Entidades Dart (`Evento`, `Preinscripcion`, `Asistencia`, `Notificacion`…).
- **Repository** = Capa de datos por dominio: consume los microservicios REST vía `ApiClient` (dio) y mapea DTO↔Model.
- **Estado/routing**: Riverpod + GoRouter.
- **FCM**: `firebase_messaging` (token → `POST /notificaciones/dispositivos`) + `flutter_local_notifications` para foreground; deep link al detalle.
- **Calendario**: plugin `device_calendar` (EventKit / CalendarProvider) — RF-14.
- **Seguridad**: tokens en `flutter_secure_storage`; interceptor refresca (rotación) y reencola 1 petición en 401; logout revoca refresh.

## 6. Despliegue (free tier · costo = $0 · DT-09)

```
[GitHub Actions: CI/CD]
  – build + lint + test por servicio (NestJS) y Flutter (analyze + test)
  – deploy a Render (auto) · secrets: DATABASE_URLs, JWT_SECRET, FCM_SERVICE_ACCOUNT, X_SERVICE_KEY
        │
        ▼
[Render — free tier (o Fly.io como plan B)]
  ┌─────────── Contenedor demo (DT-09) ──────────────────────┐
  │ Nginx :443 (TLS terminación)                             │
  │  ├─ auth (3001) · evento (3002) · asistencia (3003)      │
  │  ├─ notificacion (3004) · reporte (3005)                 │
  │  └─ healthchecks + arranque frío aceptable               │
  └──────────────────────────────────────────────────────────┘
        │  conexiones pool (PgBouncer de Neon)
        ▼
[Neon/Supabase — PostgreSQL gratuito]  ← 5 esquemas/BBDD: auth_db, evento_db,
                                          asistencia_db, notificacion_db, reporte_db
        │
[Firebase Cloud Messaging]  ← push Android/iOS (claves como secrets)
```

| Componente | Free tier | Notas |
|---|---|---|
| Web/Nginx + 5 servicios | **Render free** (1 contenedor, DT-09) | 750 h/mes; spin-down con arranque frío ~30–60 s (aceptable en demo); plan B: Fly.io |
| PostgreSQL | **Neon** (5 bases, pooling) o Supabase | 0.5 GB almacenamiento; backups automáticos; `timestamptz` UTC |
| Push | **FCM** | Gratuito; proyecto Firebase dedicado; service account solo como secret de CI/CD |
| CI/CD | **GitHub Actions** | Free para repo público |

## 7. Seguridad OWASP por capa

| Capa | Controles |
|---|---|
| **Gateway (Nginx)** | TLS/HTTPS · rate limiting (`limit_req`) por IP (login/registro 10 req/15 min; públicos 100 req/min) · body 1 MB · headers de seguridad (CSP, X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy) · bloqueo explícito de `/internal/*` hacia el exterior · CORS allowlist · ocultar versión de servidor |
| **Servicio (NestJS)** | JWT verify estricto (HS256 allowlist, issuer/audience, expiración corta) · `JwtAuthGuard` + `RolesGuard`/`@Roles()` en CADA endpoint (403; RBAC) · `ValidationPipe` global whitelist + DTO `class-validator` (anti inyección SQL/XSS) · queries parametrizadas/TypeORM · rate limiting por servicio (preinscripción y check-in 10 req/min/usuario) · excepciones tipadas sin leak de stack · protección IDOR (ponente solo su evento, PA-01) · logging de seguridad |
| **Datos (PostgreSQL)** | Cuenta de BD separada de menor privilegio por esquema · TLS · backups · `password_hash`/`refresh_token_hash` nunca en SELECT default · UNIQUE/parciales como red de seguridad · `FOR UPDATE`/UPDATE condicional para concurrencia |
| **App móvil (Flutter)** | Tokens en `flutter_secure_storage` (Keystore/Keychain) · sin credenciales en logs · interceptor Bearer + refresh rotativo · validación local (defensa en profundidad) · manejo seguro de deep links · build release ofuscado |
| **Secretos** | 100 % en variables de entorno · `.env.example` versionado SIN valores · `.env` en `.gitignore` · GitHub Actions Secrets (`DATABASE_URL_*`, `JWT_SECRET`, `FIREBASE_SERVICE_ACCOUNT`, `X_SERVICE_KEY`, `RENDER_API_KEY`) · revisión en verify (EC-09) |

---

*Siguiente documento: [06-backlog-scrum.md](06-backlog-scrum.md)*