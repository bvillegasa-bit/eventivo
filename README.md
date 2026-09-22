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

- **Fase**: documentación inicial materializada (charter, PRD, casos de uso, diagrama de actividades, arquitectura, backlog SCRUM) para la revisión del Ingeniero.
- **Proceso**: SCRUM — 4 sprints de 2 semanas (~2 meses hasta la demo).
- **Pieza central del entregable**: [diagrama de actividades del sistema](docs/04-diagrama-de-actividades.md) con carriles Administrativo / Sistema / Docente / Estudiante.

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
| [docs/diagramas/](docs/diagramas/) | Diagramas renderizados (PNG) y fuentes (PlantUML/Mermaid) |

## Repositorio

- URL: <https://github.com/bvillegasa-bit/eventivo>
- Rama: `main`
- Documentación 100 % en español (requisito del Ingeniero).