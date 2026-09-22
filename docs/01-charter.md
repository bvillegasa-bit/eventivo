# 01 · Project Charter — EVENTIVO

**Sistema de Seguimiento de Eventos Académicos UCV · Campus Callao**

| Campo | Valor |
|---|---|
| **Producto** | EVENTIVO |
| **Tipo de proyecto** | GREENFIELD (sin código previo) |
| **Fecha** | 22 de septiembre de 2026 |
| **Repositorio** | <https://github.com/bvillegasa-bit/eventivo> |
| **Plazo** | ~2 meses (4 sprints SCRUM de 2 semanas) |
| **Costo de demo** | $0 (free tier) |
| **Documentación** | 100 % en español |

---

## 1. Problema y contexto

**Caso real (motivación del proyecto):** el docente **Juan Pérez** tiene un día ocupado; a las 11:00 a. m. le comparten por redes/canales oficiales el aviso de un evento académico de la UCV campus Callao, pero **se le olvida**. No existe ningún sistema que le confirme el evento, le recuerde (24 h / 30 min antes), registre si asistió, ni le muestre el estado de su participación.

**Contexto general:** los eventos académicos de la comunidad UCV campus Callao (administrativos, docentes y estudiantes) se difunden de forma informal. **No hay trazabilidad** de eventos, asistencia ni recordatorios.

EVENTIVO cierra el ciclo **"el evento se difunde → la comunidad se entera → asiste o no"** con una app móvil Flutter (MVVM) y un backend de microservicios REST (NestJS/PostgreSQL) que da seguimiento completo a cada evento: estados, preinscripción con aforo, asistencia por **QR con self check-in**, recordatorios push, encuestas y reportes.

## 2. Objetivos

| ID | Objetivo |
|---|---|
| OBJ-01 | Brindar trazabilidad completa del ciclo de vida de cada evento académico (estados e historial). |
| OBJ-02 | Asegurar que docentes y estudiantes **se enteren** de los eventos (difusión push) y **no se olviden** de asistir (recordatorios T−24 h / T−30 min configurables). |
| OBJ-03 | Registrar la asistencia de forma confiable y **a prueba de sobrecupos y duplicados** (preinscripción transaccional + check-in QR idempotente). |
| OBJ-04 | Proveer a los administrativos **reportes auditables** (asistencia, participación, ranking, por docente, métricas). |
| OBJ-05 | Preparar el terreno para la futura plataforma web (API REST con contratos OpenAPI + CORS listo) y para la futura emisión de certificados. |
| OBJ-06 | Entregar la **documentación en español** con el **diagrama de actividades** como pieza central, aprobada por el Ingeniero. |

## 3. Alcance

### 3.1 In Scope (MVP)

1. Creación y difusión de eventos por **administrativos** (borrador → publicado → difusión FCM).
2. Feed/agenda con filtros (estado, fecha) para docentes y estudiantes.
3. Detalle del evento con estado y trazabilidad por usuario.
4. Preinscripción con control de aforo (donde aplique).
5. **QR único por instancia de evento + self check-in** (cada usuario escanea con su celular).
6. Recordatorios push configurables: **24 h** y **30 min** antes (toggles por evento, default activado).
7. Encuestas post-evento (calificación 1–5 + comentarios).
8. Agregar evento al calendario del celular.
9. Reportes: asistencia por evento, % participación, ranking, asistencia por docente (doble dimensión), métricas generales.
10. Registro/login propio (email + contraseña), escalable a correo UCV en producción.
11. Seeds con datos ficticios realistas.
12. Arquitectura de microservicios REST que prepara la futura plataforma web.
13. Documentación formal en `docs/` (español) + **diagrama de actividades**.

### 3.2 Out of Scope (futuro)

1. **Certificados de participación** (el modelo de asistencia ya lo soporta).
2. **Plataforma web** (la API REST queda lista por Nginx con contratos OpenAPI).
3. **Interoperabilidad UCV** (matrícula, SSO correo institucional, asistencia oficial).
4. Lista de espera (waitlist) al llenarse el aforo.
5. QR dinámico/rotativo anti-screenshot y geolocalización del check-in.
6. Notificaciones por email/SMS y exportación CSV/PDF de reportes.
7. Panel de administración de usuarios/RBAC vía admin (roles fijos por seed).
8. Eventos con costo/registro de pago.
9. Revisión de segundo par para publicar (autoaprobación en MVP).
10. MFA, verificación de email y recuperación de contraseña por email.

## 4. Stakeholders

| Stakeholder | Rol en el proyecto | Expectativa |
|---|---|---|
| **Ingeniero (jefe directo)** | Aprobador de documentación y demo | Repo GitHub con docs 100 % español; **diagrama de actividades**; alcance claro; validación de supuestos |
| **Administrativos UCV** | Usuarios creadores/difusores (seed) | Crear, publicar, monitorear inscripciones, cerrar eventos, consultar reportes |
| **Docentes (p. ej. Juan Pérez)** | Usuarios asistentes/ponentes | Feed, recordatorios, check-in, encuestas, trazabilidad; reporte de su propio evento si es ponente |
| **Estudiantes** | Usuarios asistentes | Mismo ciclo que docentes (sin reportes) |
| **PM + dev full-stack** | Entrega del MVP | Cumplir EC-01..EC-10 y documentar en español |

## 5. Riesgos principales (top)

| # | Riesgo | Prob. | Mitigación |
|---|--------|-------|------------|
| **R-01** | Sobre cupo en concurrencia (último cupo) | Media | UPDATE condicional / fila bloqueada en transacción; prueba EC-03 |
| **R-02** | Fuga/duplicación de QR (screenshot) | Media | Ventana de validez solo `EN_CURSO`; token por instancia; regeneración al reprogramar; check-in idempotente |
| **R-03** | FCM no entregado (offline/apagado) | Media | Centro de notificaciones in-app como respaldo; reenvío de cortesía |
| **R-04** | Free tier inestable (sleep/memoria) | Baja–Media | Arranque frío aceptable para demo; monitoreo básico; plan B documentado |
| **R-05** | Ambigüedad de "no asistió" | Baja | "No asistió" = estado de asistencia del usuario (no del evento), derivado al completar |
| **R-06** | Alcance vs plazo de 2 meses | **Alta** | Verticales de negocio por sprint; congelar alcance tras el spec |
| **R-07** | Consistencia de la doc 100 % español | Media | Glosario de términos; revisión terminológica |
| **R-08** | Zona horaria UTC−5 en recordatorios | Media | Fechas en UTC con conversión explícita; pruebas de agendamiento |
| **R-09** | Seeds "reales" vs privacidad | Media | Datos ficticios realistas, sin datos reales de alumnos |
| **R-10** | Integración FCM en free tier | Media | Proyecto Firebase dedicado; claves como secrets de CI/CD |

## 6. Cronograma (SCRUM · ~2 meses)

| Sprint | Duración | Vertical | Entregable demo |
|---|---|---|---|
| **S1** | 2 semanas | Autenticación + RBAC + esqueleto | Registro/login (JWT rotativo), RBAC 403, app Flutter auth, CI/CD base verde |
| **S2** | 2 semanas | Eventos + Feed + Agenda | CRUD eventos, máquina de estados, feed por público objetivo, reprogramar/cancelar |
| **S3** | 2 semanas | Preinscripción + QR + Check-in | EC-03 (1 ganador del último cupo), QR imprimible, self check-in idempotente (EC-04) |
| **S4** | 2 semanas | Notificaciones + Encuestas + Reportes + Deploy | **Demo final (EC-01 caso Juan Pérez)**: FCM, recordatorios, encuesta, 5 reportes, deploy $0 |

**Estimación de esfuerzo**: 77 tareas en total (7 transversales `TT-01..TT-07` + 70 de sprint `T-S1.01`…`T-S4.18`).

## 7. Criterios de éxito (EC-01..EC-10)

| ID | Criterio |
|---|---|
| **EC-01** | Ciclo completo demostrable con el **caso Juan Pérez**: publicación → difusión FCM → recordatorio T−24 h/T−30 min → self check-in QR → encuesta → reporte. |
| **EC-02** | **100 % de los flujos del diagrama de actividades** (4 carriles, 7 puntos de decisión) implementados y verificables. |
| **EC-03** | **0 sobrecupos** en preinscripción concurrente (N≥10 usuarios por el último cupo → solo 1 gana). |
| **EC-04** | **Check-in idempotente**: doble escaneo del mismo QR = 1 solo registro. |
| **EC-05** | Recordatorios push emitidos según configuración (toggles ON→2 envíos; OFF→0; cancelado→0). |
| **EC-06** | **Reportes exactos** y auditables (coinciden 1:1 con los registros persistidos). |
| **EC-07** | Aprobación del Ingeniero: documentación 100 % en español + diagrama de actividades en el repo. |
| **EC-08** | App Flutter funcional (Android 8+ base / iOS 13+) consumiendo la API; contrato OpenAPI listo para web. |
| **EC-09** | Seguridad OWASP aplicada y verificable (JWT + RBAC, bcrypt, validación DTO, rate limiting, 0 secretos en repo). |
| **EC-10** | **Costo total de la demo = $0** (free tier). |

## 8. Decisiones en firme (resumen)

- **DF-01** Actores: estudiantes, docentes, administrativos; **solo administrativos** crean/difunden/cierran.
- **DF-02** Asistencia por QR escaneado por el propio usuario (self check-in).
- **DF-03** Estados del evento: `borrador → publicado → inscripciones abiertas → en curso → completado | cancelado | reprogramado`.
- **DF-04** Recordatorios push configurables: 24 h y 30 min antes.
- **DF-05** Preinscripción solo donde aplique (con cupos); mayoría solo asistencia.
- **DF-06** Reportes: asistencia por evento, % participación, ranking, asistencia por docente, métricas.
- **DF-07** Alcance MVP según sección 3 (encuestas + calendario IN; certificados OUT).
- **DF-08** **Stack**: Flutter MVVM + NestJS REST + PostgreSQL esquema-por-servicio + JWT/RBAC + FCM + Nginx + GitHub Actions + free tier $0 + secretos en env.
- **DF-09** Calidad ISO/IEC 25010; seguridad OWASP Top 10.
- **DF-10** SCRUM 2 semanas, ~2 meses; docs 100 % español; repo GitHub; **diagrama de actividades central**.
- **DF-11** "No asistió" = estado de **asistencia** del usuario derivado al completar (no es estado del evento).
- **DF-12** QR único por instancia, válido solo en `EN_CURSO`; se regenera al reprogramar.
- **DF-13** Eventos con preinscripción → solo preinscritos hacen check-in; abiertos → cualquier usuario del público objetivo.
- **DF-14** Check-in idempotente (1 usuario = 1 registro por evento).
- **DF-15** Reprogramar conserva preinscripciones y re-notifica; cancelar libera cupos y notifica.
- **DF-16** Admin provisionados por seed; registro público solo estudiante/docente.
- **DF-17** Recordatorios al público objetivo + preinscritos; centro in-app como respaldo de FCM.

---

*Siguiente documento: [02-prd.md](02-prd.md)*