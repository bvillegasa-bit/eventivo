# Índice de documentación — EVENTIVO

Documentación formal de **EVENTIVO**, sistema de seguimiento de eventos académicos para la comunidad UCV campus Callao. Todo el contenido está en español, como exige el Ingeniero para su revisión y aprobación.

## Documentos

| # | Documento | Descripción |
|---|-----------|-------------|
| 01 | [01-charter.md](01-charter.md) | **Project Charter** — problema, objetivos, alcance MVP (IN/OUT), stakeholders, riesgos principales, cronograma (4 sprints SCRUM ≈ 2 meses) y criterios de éxito. |
| 02 | [02-prd.md](02-prd.md) | **Product Requirements Document (PRD)** — requisitos funcionales RF-01..RF-20 con criterios de aceptación Given/When/Then, estados del evento y reglas de negocio BR-01..BR-08. |
| 03 | [03-casos-de-uso.md](03-casos-de-uso.md) | **Casos de uso** UC-01..UC-15 con actores y flujos alternativos. |
| 04 | [04-diagrama-de-actividades.md](04-diagrama-de-actividades.md) | **Diagrama de actividades del sistema (entregable central)** — 4 carriles, fases F1–F6, 7 puntos de decisión y máquina de estados. |
| 05 | [05-arquitectura.md](05-arquitectura.md) | **Arquitectura** — Nginx gateway, 5 microservicios NestJS, PostgreSQL esquema-por-servicio, ERD, contratos API, MVVM Flutter, despliegue free tier y seguridad. |
| 06 | [06-backlog-scrum.md](06-backlog-scrum.md) | **Backlog SCRUM** — 4 sprints por verticales, 77 tareas, definición de Done por sprint, roadmap y trazabilidad RF→tareas. |
| 07 | [07-calidad-y-seguridad.md](07-calidad-y-seguridad.md) | **Calidad y seguridad** — matriz ISO/IEC 25010, capa OWASP Top 10 y criterios de aceptación no funcionales. |

## Decisiones de arquitectura

| Documento | Descripción |
|---|---|
| [decisiones/dt-09.md](decisiones/dt-09.md) | **Infraestructura de demo con costo $0** — free tiers (Supabase, Render, FCM, GitHub) y cómo encajan las 5 bases de datos. |

## Especificaciones API (OpenAPI)

| Documento | Descripción |
|---|---|
| [api/auth.openapi.yaml](api/auth.openapi.yaml) | **auth-service** — registro (RF-01), login/refresh rotativo/logout (RF-02), RBAC (T-S1.09) y healthcheck. |

## Diagramas

| Archivo | Contenido |
|---|---|
| [diagramas/eventivo-diagrama-actividades.png](diagramas/eventivo-diagrama-actividades.png) | **Diagrama de actividades del sistema** (renderizado, pieza central) |
| [diagramas/eventivo-maquina-estados.png](diagramas/eventivo-maquina-estados.png) | Máquina de estados del evento y de asistencia (renderizado) |
| [diagramas/eventivo-diagrama-actividades.puml](diagramas/eventivo-diagrama-actividades.puml) | Fuente PlantUML del diagrama de actividades |
| [diagramas/eventivo-diagrama-actividades.mmd](diagramas/eventivo-diagrama-actividades.mmd) | Fuente Mermaid del diagrama de actividades |
| [diagramas/eventivo-maquina-estados.puml](diagramas/eventivo-maquina-estados.puml) | Fuente PlantUML de la máquina de estados |

## Resumen ejecutivo

- **Producto**: EVENTIVO — app Flutter (MVVM) + microservicios REST NestJS/PostgreSQL.
- **Problema**: no hay trazabilidad de eventos académicos; difusión informal, sin recordatorios ni control de asistencia (caso real del docente Juan Pérez).
- **Ciclo que cierra**: el evento se difunde → la comunidad se entera → asiste o no.
- **Alcance MVP**: creación/difusión por administrativos, feed/agenda, preinscripción con aforo, QR + self check-in, recordatorios push (T−24 h / T−30 min), encuestas, calendario, reportes y seeds.
- **Fuera de alcance MVP**: certificados, plataforma web, interoperabilidad UCV, waitlist, QR rotativo/geolocalización.
- **Criterios de éxito**: 10 (EC-01..EC-10), destacando el ciclo Juan Pérez completo (EC-01) y **costo de demo = $0** (EC-10).
- **Stakeholder clave**: el **Ingeniero (jefe directo)** aprueba la documentación y la demo; espera un repositorio GitHub con el diagrama de actividades como pieza central.

## Enlaces

- Repositorio: <https://github.com/bvillegasa-bit/eventivo>
- README raíz: [../README.md](../README.md)