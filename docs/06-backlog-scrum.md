# 06 · Backlog SCRUM — EVENTIVO

**4 sprints de 2 semanas · ~2 meses · 77 tareas · 5 verticales de negocio**

Backlog derivado del desglose de tareas del proyecto. Cada sprint entrega una vertical demostrable de punta a punta contra la API real. SCRUM con revisión del Ingeniero en cada sprint (demo + retro).

---

## 1. Roadmap por sprint

| Sprint | Épocas | Nº de tareas | Vertical demostrable (demo) |
|---|---|---|---|
| **S1** · *"Autenticación + RBAC + esqueleto"* | E-S1.1 Fundación/repo · E-S1.2 auth-service · E-S1.3 Gateway + red interna · E-S1.4 App Flutter auth · E-S1.5 Calidad/CI | **18** (T-S1.01..T-S1.18) | Un usuario se registra (estudiante/docente), inicia sesión con JWT rotativo, la app restaura la sesión, el admin de seed se autentica y un endpoint protegido devuelve **403** al estudiante. CI/CD base verde. |
| **S2** · *"Eventos + Feed + Agenda"* | E-S2.1 evento-service CRUD · E-S2.2 Máquina de estados + jobs · E-S2.3 Publicación/feed/visibilidad · E-S2.4 Detalle + mi estado · E-S2.5 Reprogramación/cancelación · E-S2.6 App feed/detalle/admin · E-S2.7 Calidad/OpenAPI | **17** (T-S2.01..T-S2.17) | El admin crea un evento en borrador y lo publica (autoaprobación); estudiantes/docentes ven el feed filtrado por público objetivo y el detalle con su estado; reprogramar/cancelar refleja la incidencia. (FCM real llega en S4; en S2 se usa stub.) |
| **S3** · *"Preinscripción + QR + Check-in + Asistencia"* | E-S3.1 asistencia-service · E-S3.2 Preinscripción DT-03 · E-S3.3 QR (RF-09) · E-S3.4 Check-in DT-04 · E-S3.5 Derivación NO_ASISTIO + trazabilidad · E-S3.6 App · E-S3.7 Pruebas concurrencia/idempotencia | **17** (T-S3.01..T-S3.17) | **EC-03**: N≥10 usuarios compiten por el último cupo → 1 gana. El admin muestra/imprime el QR en `EN_CURSO` (PA-09); **self check-in** con cámara y doble escaneo NO duplica (EC-04); historial muestra PREINSCRITO/CONFIRMADO/NO_ASISTIO. |
| **S4** · *"Notificaciones + Encuestas + Reportes + Seeds + QA + Deploy"* | E-S4.1 notificacion-service · E-S4.2 Encuestas · E-S4.3 reporte-service · E-S4.4 App notif/encuesta/reportes · E-S4.5 Seeds · E-S4.6 Seguridad+QA+deploy+docs | **18** (T-S4.01..T-S4.18) | **Demo final (EC-01 caso Juan Pérez)**: publicación difunde FCM; recordatorios T−24 h/T−30 min según toggles (EC-05); encuesta con resultados anónimos (PA-03); 5 reportes con RBAC rol+evento (PA-01/PA-02); seeds completos (RF-19); **deploy 1 contenedor $0** (EC-10). |
| **Transversales** | Diseño limpio para doc, API, secretos, cobertura, SAST, español, diagrama vivo | **7** (TT-01..TT-07) | Aplican a todos los sprints (ver sección 4). |

**Total = 77 tareas** (7 transversales + 70 de sprint).

## 2. Detalle por sprint

### Sprint 1 — Autenticación + RBAC + esqueleto
| Épica | Tareas |
|---|---|
| E-S1.1 Fundación/repo | T-S1.01 (repo/setup), T-S1.02 (compose 5 BBDD + 5 servicios dev) |
| E-S1.2 auth-service | T-S1.05 (migración auth_db), T-S1.06 (registro), T-S1.08 (login/refresh/logout), T-S1.09 (RBAC base), T-S1.10 (seed usuarios) |
| E-S1.3 Gateway + red interna | T-S1.07 (free tier + DT-09), T-S1.14 (nginx.conf), T-S1.15 (red `/internal/*`) |
| E-S1.4 App Flutter auth | T-S1.11 (scaffold app), T-S1.12 (pantallas auth), T-S1.13 (ApiClient + interceptor refresh) |
| E-S1.5 Calidad/CI | T-S1.03 (ci.yml), T-S1.04 (SAST), T-S1.16 (OpenAPI auth), T-S1.17 (tests auth), T-S1.18 (demo S1) |

### Sprint 2 — Eventos + Feed + Agenda
| Épica | Tareas |
|---|---|
| E-S2.1 evento-service CRUD | T-S2.01 (migración evento_db), T-S2.02 (POST /eventos), T-S2.03 (PATCH/DELETE) |
| E-S2.2 Máquina de estados + jobs | T-S2.04 (validador), T-S2.08 (overrides), T-S2.09 (job automático) |
| E-S2.3 Publicación/feed/visibilidad | T-S2.05 (publicar + difusión stub), T-S2.06 (feed), T-S2.07 (detalle) |
| E-S2.4 Detalle + mi estado | (parte de T-S2.07) |
| E-S2.5 Reprogramación/cancelación | T-S2.10 (reprogramar), T-S2.11 (cancelar) |
| E-S2.6 App feed/detalle/admin | T-S2.12 (FeedView/DetalleView), T-S2.13 (FormAdminView), T-S2.14 (calendario nativo) |
| E-S2.7 Calidad/OpenAPI | T-S2.15 (OpenAPI evento), T-S2.16 (tests evento), T-S2.17 (demo S2) |

### Sprint 3 — Preinscripción + QR + Check-in + Asistencia
| Épica | Tareas |
|---|---|
| E-S3.1 asistencia-service | T-S3.01 (migración asistencia_db), T-S3.02 (endpoint `/internal/eventos/:id/contexto`) |
| E-S3.2 Preinscripción DT-03 | T-S3.03 (preinscripción transaccional), T-S3.04 (baja voluntaria), T-S3.05 (monitoreo) |
| E-S3.3 QR (RF-09) | T-S3.06 (QR por instancia) |
| E-S3.4 Check-in DT-04 | T-S3.07 (check-in idempotente) |
| E-S3.5 Derivación NO_ASISTIO + trazabilidad | T-S3.08 (derivar no-asistencia), T-S3.09 (mis-eventos) |
| E-S3.6 App | T-S3.10 (preinscripción UI), T-S3.11 (scanner QR), T-S3.12 (admin QR PA-09), T-S3.13 (historial) |
| E-S3.7 Pruebas concurrencia/idempotencia | T-S3.14 (EC-03/EC-04), T-S3.15 (OpenAPI asistencia), T-S3.16 (tests), T-S3.17 (demo S3) |

### Sprint 4 — Notificaciones + Encuestas + Reportes + Seeds + QA + Deploy
| Épica | Tareas |
|---|---|
| E-S4.1 notificacion-service | T-S4.01 (migración notificacion_db), T-S4.02 (dispositivos FCM), T-S4.03 (centro in-app) |
| E-S4.2 Encuestas | T-S4.07 (config + respuesta + resultados anónimos), T-S4.09 (app encuesta) |
| E-S4.3 reporte-service | T-S4.10 (migración reporte_db), T-S4.11 (5 reportes RF-15) |
| E-S4.4 App notif/encuesta/reportes | T-S4.08 (app notificaciones FCM), T-S4.12 (app reportes) |
| E-S4.5 Seeds | T-S4.13 (seeds completos RF-19) |
| E-S4.6 Seguridad+QA+deploy+docs | T-S4.04/T-S4.05/T-S4.06 (FCM real + recordatorios + conectar difusión), T-S4.14 (refuerzo OWASP), T-S4.15 (QA final EC-01/EC-02), T-S4.16 (deploy demo DT-09), T-S4.17 (docs finales), T-S4.18 (demo final con el Ing.) |

## 3. Definición de Done (por sprint — aplica a cada uno)

1. La vertical del sprint se demuestra **de punta a punta contra la API real** (sin mocks) en emulador + ≥ 1 dispositivo real por plataforma cuando aplique (RNF 4.3).
2. **CI verde en `main`** (build + lint + test + SAST + gitleaks); ninguna PR se mergea con CI rojo.
3. **Cobertura ≥ 70 %** por servicio y **≥ 85 %** en el núcleo crítico del sprint (TT-03).
4. **OpenAPI** de los servicios del sprint publicados y validados (TT-05).
5. **0 secretos** en el repo; `.env.example` sincronizado (TT-02).
6. **UI y docs 100 % en español** (TT-06).
7. **Mapa EC-02** actualizado con los nodos EA del sprint (TT-07).
8. **Revisión del Ingeniero**: demo ejecutada con `docs/manual-demo-sX.md` entregado y aceptado + retro de sprint registrada.

## 4. Tareas transversales (TT)

| ID | Tarea | Sprint en el que aplica |
|---|---|---|
| TT-01 | Convención de fechas UTC/UTC−5 (DT-10, BR-08) | Desde S1 |
| TT-02 | Secretos: gitleaks en CI + `.env.example` sincronizado | Desde S1 |
| TT-03 | Cobertura de tests (≥ 70 %; núcleo ≥ 85 %) | Desde S1 |
| TT-04 | SAST + dependencias (CodeQL, Semgrep, Dependabot) | Desde S1 |
| TT-05 | OpenAPI por servicio | S1(auth) → S4 (reporte) |
| TT-06 | Idioma español (UI y docs) | Todos |
| TT-07 | Diagrama de actividades vivo (mapa EC-02) | Todos (cierre de cada sprint) |

## 5. Trazabilidad RF → tareas (resumen)

| RF | Tarea(s) principal(es) | Sprint |
|---|---|---|
| RF-01 Registro | T-S1.06, T-S1.12 | S1 |
| RF-02 JWT/RBAC/logout | T-S1.08, T-S1.09, T-S1.13 | S1 |
| RF-03 CRUD eventos | T-S2.02, T-S2.03, T-S2.13 | S2 |
| RF-04 Publicación y difusión | T-S2.05, T-S4.06, T-S4.04 | S2→S4 |
| RF-05 Máquina de estados | T-S2.04, T-S2.08, T-S2.09 | S2 |
| RF-06 Feed/agenda | T-S2.06, T-S2.12 | S2 |
| RF-07 Detalle y trazabilidad | T-S2.07, T-S2.12 | S2 |
| RF-08 Preinscripción aforo | T-S3.03, T-S3.04, T-S3.10 | S3 |
| RF-09 QR por instancia | T-S3.06, T-S3.12 | S3 |
| RF-10 Check-in idempotente | T-S3.07, T-S3.11 | S3 |
| RF-11 Elegibilidad check-in | T-S3.07 | S3 |
| RF-12 Recordatorios | T-S4.05, T-S4.04 | S4 |
| RF-13 Encuesta | T-S4.07, T-S4.09 | S4 |
| RF-14 Calendario nativo | T-S2.14 | S2 |
| RF-15 Reportes | T-S4.11, T-S4.12 | S4 |
| RF-16 Trazabilidad usuario | T-S3.09, T-S3.13 | S3 |
| RF-17 Reprogramación | T-S2.10 (+T-S3.06 QR, T-S4.05 recordatorios) | S2→S4 |
| RF-18 Notif. cancelación/reprogramación | T-S2.11, T-S4.06, T-S4.04 | S2→S4 |
| RF-19 Seeds | T-S1.10, T-S4.13 | S1, S4 |
| RF-20 Idioma español | TT-06 + todas las tareas UI | Todos |

**Mapa EC → tareas**: EC-01 → T-S4.15/T-S4.18 · EC-02 → TT-07 · EC-03 → T-S3.03/T-S3.14 · EC-04 → T-S3.07/T-S3.14 · EC-05 → T-S4.04/T-S4.05 · EC-06 → T-S4.11 · EC-07 → T-S4.17 · EC-08 → T-S1.11/T-S4.16 · EC-09 → T-S1.08/T-S4.14/TT-02 · EC-10 → T-S1.07/T-S4.16.

## 6. Riesgos de ejecución

| ID | Riesgo | Mitigación |
|---|---|---|
| R-A | FCM en emulador requiere Google Play Services | Dispositivo real o emulador con APIs de Google (documentado en manual demo) |
| R-B | Flakiness de EC-03 en CI | Test de concurrencia en job dedicado con reintentos |
| R-C | Arranque frío Render en demo | Warm-up antes de la demo (RT-02) |
| R-D | 5 BBDD desincronizadas | Migraciones por servicio con script central y lock (RT-05) |
| R-E | S4 es el sprint más grande | Recortar por fuera de alcance (spec §9) priorizando EC-01/EC-07/EC-10 |
| R-F | Free tier cambia condiciones | Plan B multi-servicio documentado (T-S1.07) |

---

*Siguiente documento: [07-calidad-y-seguridad.md](07-calidad-y-seguridad.md)*