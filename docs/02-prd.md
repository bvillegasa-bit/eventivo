# 02 · PRD — Product Requirements Document

**EVENTIVO — Sistema de Seguimiento de Eventos Académicos UCV · Campus Callao**

Requisitos funcionales del MVP, criterios de aceptación en formato **Given/When/Then**, estados del evento y reglas de negocio. Este documento se deriva íntegramente del spec del proyecto (artifacts engram) y usa lenguaje RFC 2119 (DEBE/SHOULD/PUEDE).

---

## 1. Resumen

EVENTIVO es una app móvil (Flutter, MVVM) + backend de microservicios REST (NestJS/PostgreSQL). Los **administrativos** crean y difunden eventos; **docentes y estudiantes** los siguen, se preinscriben cuando aplica, asisten vía **self check-in QR** y responden encuestas; los administrativos (y el docente ponente para su propio evento) consultan reportes. El sistema provee estados, recordatorios push (T−24 h / T−30 min), trazabilidad y auditoría.

| Alcance funcional | Detalle |
|---|---|
| Requisitos funcionales | RF-01..RF-20 |
| Criterios de aceptación | Escenarios Given/When/Then por requisito (feliz + error) |
| Reglas de negocio | BR-01..BR-08 (máquina de estados, aforo, check-in, encuesta, recordatorios, visibilidad, reprogramación/cancelación, zona horaria) |
| Supuestos aplicados | PA-01..PA-09 (aprobados e incorporados como comportamiento obligatorio) |

## 2. Requisitos funcionales (RF-01..RF-20)

> Convención: **GWT** = escenarios Given/When/Then. "▪" = cualquier rol autenticado; **ADM** = administrativo; **DOC** = docente; **EST** = estudiante.

### RF-01 — Registro de usuario (email + contraseña; rol estudiante/docente)
- **Descripción**: el sistema DEBE permitir el registro público con email y contraseña y selección de rol entre `estudiante` y `docente`. DEBE rechazar el rol `administrativo` en el registro público (se provisionan por seed). La contraseña DEBE almacenarse con hash seguro (bcrypt cost ≥ 10 o argon2). DEBE validar formato de email y fortaleza mínima (≥ 8 caracteres).
- **Actor**: docente, estudiante (público).
- **Criterios de aceptación (GWT)**:
  1. *Feliz*: **GIVEN** un usuario no registrado con email válido y contraseña segura; **WHEN** completa el formulario y selecciona rol `docente`; **THEN** se crea la cuenta, se emiten tokens JWT (access + refresh) y queda autenticado.
  2. *Email duplicado*: **GIVEN** un email ya registrado; **WHEN** se intenta registrar con ese email; **THEN** responde `409 Conflict` con mensaje genérico (sin revelar si el email existe — anti-enumeración).
  3. *Validación*: **GIVEN** email malformado o contraseña < 8 caracteres; **WHEN** se envía el registro; **THEN** responde `400 Bad Request` con detalle por campo.
  4. *Rol prohibido*: **GIVEN** un usuario elige rol `administrativo`; **WHEN** se envía el registro; **THEN** rechaza con `403 Forbidden` y no crea la cuenta.

### RF-02 — Autenticación JWT + RBAC y cierre de sesión
- **Descripción**: DEBE autenticar con email + contraseña y emitir access token de expiración corta (≤ 15 min) y refresh token con **rotación** (cada uso emite uno nuevo e invalida el anterior). DEBE aplicar **RBAC en cada endpoint** (403 si el rol no autoriza). DEBE permitir cierre de sesión revocando la familia de tokens. Los administrativos DEBEN autenticarse con sus cuentas de seed.
- **Actor**: todos.
- **Criterios de aceptación (GWT)**:
  1. *Feliz*: **GIVEN** credenciales válidas de un `estudiante`; **WHEN** envía `POST /auth/login`; **THEN** recibe access + refresh y accede a endpoints permitidos.
  2. *Credenciales*: **GIVEN** credenciales incorrectas; **WHEN** se intenta el login; **THEN** responde `401 Unauthorized` genérico y el intento cuenta para rate limiting.
  3. *RBAC*: **GIVEN** un `estudiante` autenticado; **WHEN** intenta crear un evento (acción ADM); **THEN** responde `403 Forbidden`.
  4. *Refresh reutilizado*: **GIVEN** un refresh token ya rotado; **WHEN** un atacante reenvía el refresh antiguo; **THEN** el sistema revoca TODA la familia de tokens y exige nuevo login (detección de reuso).

### RF-03 — CRUD de eventos (solo administrativo, persistencia en borrador)
- **Descripción**: DEBE permitir a un `administrativo` crear, leer, editar y descartar eventos. El evento DEBE crearse siempre en `BORRADOR` con: título, descripción, fecha/hora inicio y fin, sede/ubicación, modalidad (`presencial | virtual | hibrida`), ponente(s), público objetivo (`todos | docentes | estudiantes` — PA-07), indicador de preinscripción, aforo (obligatorio y > 0 si hay preinscripción), toggles de recordatorios (default ON, PA-05) y encuesta opcional. DEBE validar: fecha fin > inicio; aforo > 0 si aplica.
- **Actor**: administrativo.
- **Criterios de aceptación (GWT)**:
  1. *Feliz*: **GIVEN** un ADM autenticado; **WHEN** crea un evento con público objetivo `docentes`; **THEN** se persiste en `BORRADOR`, visible solo para ADM y ausente del feed.
  2. *Validación*: **GIVEN** fecha fin ≤ inicio o aforo = 0 con preinscripción requerida; **WHEN** se guarda; **THEN** `400 Bad Request` con detalle y NO persiste.
  3. *Permisos*: **GIVEN** un DOC/EST autenticado; **WHEN** intenta crear/editar/eliminar un evento; **THEN** `403 Forbidden`.

### RF-04 — Publicación de eventos y difusión push (autoaprobación — PA-06)
- **Descripción**: DEBE publicar un borrador `BORRADOR → PUBLICADO` **sin revisión de segundo par**. Al publicar, DEBE disparar push FCM al público objetivo (PA-07) y registrar la notificación en el centro in-app de cada destinatario (respaldo R-03). El evento DEBE aparecer en el feed correspondiente. DEBE bloquear la edición de campos estructurales tras la publicación (salvo reprogramación/cancelación).
- **Actor**: administrativo.
- **Criterios de aceptación (GWT)**:
  1. *Feliz*: **GIVEN** un borrador completo con público `todos`; **WHEN** el admin publica; **THEN** pasa a `PUBLICADO`, aparece en el feed de docentes/estudiantes y cada usuario recibe push + entrada in-app.
  2. *Difusión fallida*: **GIVEN** un dispositivo con FCM no entregable; **WHEN** se publica; **THEN** el push puede fallar pero la notificación queda en el centro in-app (degradación sin pérdida).

### RF-05 — Máquina de estados con transiciones automáticas y override manual (PA-04)
- **Descripción**: DEBE implementar la máquina de estados de BR-01. Las transiciones a `EN_CURSO` (hora inicio) y `COMPLETADO` (hora fin) DEBEN ejecutarse automáticamente por horario; el ADM DEBE poder hacer override manual (adelantar/atrasar). DEBE rechazar cualquier transición no definida con `409`. Al completarse, DEBE derivar `NO_ASISTIO` para preinscritos sin check-in (DF-11) y habilitar la encuesta.
- **Actor**: sistema (automático), administrativo (override).
- **Criterios de aceptación (GWT)**:
  1. *Automático*: **GIVEN** un evento publicado sin preinscripción con hora inicio = ahora; **WHEN** el job evalúa; **THEN** pasa a `EN_CURSO` y se activa el QR.
  2. *Cierre automático*: **GIVEN** un evento `EN_CURSO` con hora fin pasada; **WHEN** el job evalúa; **THEN** pasa a `COMPLETADO`, deriva `NO_ASISTIO` y habilita la encuesta.
  3. *Transición inválida*: **GIVEN** un evento `EN_CURSO`; **WHEN** se intenta volver a `PUBLICADO`; **THEN** `409 Conflict` y el estado no cambia.
  4. *Override*: **GIVEN** un ADM y un evento publicado; **WHEN** hace override manual a `EN_CURSO` antes de la hora; **THEN** pasa a `EN_CURSO` y el QR queda activo.

### RF-06 — Feed/agenda de eventos con filtros
- **Descripción**: DEBE mostrar a DOC/EST un feed con filtros por estado y rango de fechas. DEBE filtrar por público objetivo (un usuario SOLO ve eventos cuyo público incluye su rol). DEBE excluir siempre los borradores y los no visibles. Orden por fecha (próximos primero).
- **Actor**: docente, estudiante.
- **Criterios de aceptación (GWT)**:
  1. *Feliz*: **GIVEN** un `estudiante` autenticado; **WHEN** consulta el feed con filtro estado=`EN_CURSO`; **THEN** recibe SOLO eventos en curso cuyo público incluye `estudiantes`, ordenados por fecha.
  2. *Vacío*: **GIVEN** un usuario sin coincidencias; **WHEN** consulta con filtros sin resultados; **THEN** `200 OK` con lista vacía y la app muestra "No hay eventos para los filtros seleccionados".
  3. *Visibilidad*: **GIVEN** un evento con público `docentes`; **WHEN** un `estudiante` consulta el feed; **THEN** ese evento NO aparece en ningún filtro.

### RF-07 — Detalle del evento y trazabilidad del usuario
- **Descripción**: DEBE mostrar el detalle: datos generales, modalidad, ponentes, ubicación, estado, cupos disponibles (si aplica), configuración de recordatorios, **estado del usuario respecto al evento** (preinscrito / confirmado / no asistió / pendiente / cancelado / reprogramado), y accesos a preinscripción, calendario, QR (si corresponde) y encuesta.
- **Actor**: docente, estudiante, administrativo.
- **Criterios de aceptación (GWT)**:
  1. *Feliz*: **GIVEN** un `docente` y un evento publicado con preinscripción; **WHEN** abre el detalle; **THEN** ve datos, cupos restantes y su estado ("no preinscrito") con botón de preinscripción habilitado.
  2. *No visible*: **GIVEN** un evento cuyo público no incluye el rol; **WHEN** intenta el detalle; **THEN** `404 Not Found` (no revela existencia — anti-enumeración).

### RF-08 — Preinscripción con control transaccional de aforo (0 sobrecupos)
- **Descripción**: DEBE registrar la preinscripción SOLO si el evento está en `INSCRIPCIONES_ABIERTAS`, hay cupo y no está preinscrito (anti-duplicado). Decremento de cupo + registro en **operación transaccional atómica** (UPDATE condicional / fila bloqueada) → 0 sobrecupos (EC-03). DEBE cerrar inscripciones automáticamente cuando el cupo llega a 0 y notificar. Todos los eventos del MVP son SIN COSTO (PA-08).
- **Actor**: docente, estudiante.
- **Criterios de aceptación (GWT)**:
  1. *Feliz*: **GIVEN** un evento con 1 cupo restante en `INSCRIPCIONES_ABIERTAS` y un usuario sin preinscripción; **WHEN** se preinscribe; **THEN** se registra, el cupo pasa a 0, las inscripciones se cierran automáticamente y ve confirmación.
  2. *Aforo completo*: **GIVEN** un evento con cupo 0; **WHEN** se intenta preinscribir; **THEN** `409 Conflict` "aforo completo, el evento ya no acepta inscripciones" y NO registra.
  3. *Duplicado*: **GIVEN** un usuario ya preinscrito; **WHEN** se intenta de nuevo; **THEN** `409 Conflict` "ya estás preinscrito" y no duplica.
  4. *Concurrencia*: **GIVEN** N≥10 usuarios compiten por el último cupo; **WHEN** se procesan las preinscripciones concurrentes; **THEN** exactamente 1 gana y los demás reciben "aforo completo"; el conteo nunca supera el aforo (prueba EC-03).

### RF-09 — Generación de QR único por instancia de evento (PA-09)
- **Descripción**: DEBE generar un QR con token único por instancia, con ventana de validez ligada al estado `EN_CURSO` (DF-12; activo al entrar en curso, inactivo al salir). Al reprogramar, DEBE regenerar el token/ventana. El ADM DEBE ver el QR en pantalla y DEBE poder descargarlo/imprimirlo (PA-09).
- **Actor**: sistema (genera), administrativo (visualiza/imprime).
- **Criterios de aceptación (GWT)**:
  1. *Feliz*: **GIVEN** un evento `EN_CURSO` y un ADM autenticado; **WHEN** abre la pantalla de QR; **THEN** ve el QR con opción de descargar/imprimir.
  2. *Estado*: **GIVEN** un evento en `PUBLICADO` o `COMPLETADO`; **WHEN** se solicita el QR; **THEN** `409 Conflict` "el QR solo está disponible durante el evento".
  3. *Reprogramación*: **GIVEN** un evento reprogramado; **WHEN** se procesa la reprogramación; **THEN** el token anterior queda inválido y se genera uno nuevo (vigente solo en el nuevo `EN_CURSO`).

### RF-10 — Self check-in QR con idempotencia
- **Descripción**: DEBE registrar la asistencia (usuario + evento + fecha/hora) cuando el usuario **escanea con SU propio celular** el QR (self check-in, DF-02), validando: evento `EN_CURSO`, token vigente, elegibilidad (RF-11) y ausencia de check-in previo. DEBE ser **idempotente** (DF-14): un usuario = un registro; escaneos repetidos NO duplican (EC-04).
- **Actor**: docente, estudiante.
- **Criterios de aceptación (GWT)**:
  1. *Feliz*: **GIVEN** un usuario elegible en un evento `EN_CURSO` sin asistencia previa; **WHEN** escanea el QR; **THEN** registra la asistencia y ve "Asistencia confirmada".
  2. *Repetido*: **GIVEN** el mismo usuario ya con check-in; **WHEN** vuelve a escanear; **THEN** NO registra un segundo registro; la app muestra "Ya registraste tu asistencia".
  3. *Fuera de ventana*: **GIVEN** un evento no en `EN_CURSO` (o token vencido/regenerado); **WHEN** se escanea; **THEN** `409 Conflict` "check-in no disponible".

### RF-11 — Regla de elegibilidad del check-in (DF-13)
- **Descripción**: DEBE aplicar: eventos con preinscripción → **solo preinscritos** pueden hacer check-in; eventos abiertos → cualquier usuario del público objetivo.
- **Actor**: sistema.
- **Criterios de aceptación (GWT)**:
  1. *Feliz*: **GIVEN** un evento abierto y un usuario del público objetivo; **WHEN** escanea; **THEN** el check-in es aceptado.
  2. *Error*: **GIVEN** un evento con preinscripción y un usuario NO preinscrito; **WHEN** escanea; **THEN** `403 Forbidden` "solo usuarios preinscritos".

### RF-12 — Recordatorios push configurables por evento (PA-05)
- **Descripción**: DEBE agendar y enviar recordatorios a **T−24 h** y **T−30 min** según la configuración del evento (toggles por evento, **default activado**). Destinatarios: público objetivo + preinscritos (DF-17). DEBE re-agendar al reprogramar y SUPRIMIR pendientes si se cancela. Cada recordatorio DEBE quedarse en el centro in-app (respaldo, R-03).
- **Actor**: sistema (automático).
- **Criterios de aceptación (GWT)**:
  1. *Feliz*: **GIVEN** un evento con ambos toggles ON y hora de inicio en 24 h; **WHEN** el job evalúa a T−24 h; **THEN** envía push a público objetivo + preinscritos y registra en `notificacion_log` + centro in-app.
  2. *Offline*: **GIVEN** un destinatario con FCM no entregable; **WHEN** se emite el recordatorio; **THEN** el push puede fallar, pero queda en el centro in-app y se reenvía por cortesía al abrir.
  3. *Supresión*: **GIVEN** un evento cancelado con recordatorios pendientes; **WHEN** se cancela; **THEN** los recordatorios agendados no se envían.

### RF-13 — Encuesta post-evento (PA-03)
- **Descripción**: DEBE configurar una encuesta opcional por evento y habilitarla a usuarios con **asistencia confirmada** cuando el evento pasa a `COMPLETADO`. Contenido: calificación 1–5 (obligatoria) + comentario opcional. Respuestas **atribuidas internamente** (trazabilidad, anti-duplicado) pero resultados SIEMPRE **agregados/anónimos**. UNA sola respuesta por usuario/evento.
- **Actor**: docente, estudiante (asistentes); administrativo (consulta agregada).
- **Criterios de aceptación (GWT)**:
  1. *Feliz*: **GIVEN** un evento `COMPLETADO` y un usuario con asistencia confirmada; **WHEN** responde; **THEN** se persiste atribuida internamente, ve confirmación y el ADM ve solo el agregado anónimo.
  2. *Duplicado*: **GIVEN** un usuario que ya respondió; **WHEN** intenta de nuevo; **THEN** `409 Conflict` "ya respondiste esta encuesta".
  3. *No elegible*: **GIVEN** un usuario con `NO_ASISTIO` o sin asistencia; **WHEN** intenta responder; **THEN** `403 Forbidden` "solo asistentes confirmados".
  4. *Rango*: **GIVEN** una calificación fuera de 1–5; **WHEN** se envía; **THEN** `400 Bad Request`.

### RF-14 — Agregar evento al calendario del celular
- **Descripción**: DEBE permitir agregar un evento a la agenda nativa (EventKit iOS / CalendarProvider Android) desde el detalle, con título, fechas, ubicación y modalidad. El evento DEBE quedar visible aunque la app esté cerrada.
- **Actor**: docente, estudiante.
- **Criterios de aceptación (GWT)**:
  1. *Feliz*: **GIVEN** un usuario en el detalle de un evento publicado; **WHEN** toca "Agregar al calendario" y acepta el permiso; **THEN** el evento aparece en la agenda nativa.
  2. *Permisos*: **GIVEN** permiso denegado o no disponible; **WHEN** se solicita; **THEN** la app muestra mensaje accesible ("Revisa los permisos de calendario en ajustes") sin bloquear la app.

### RF-15 — Reportes (PA-01, PA-02)
- **Descripción**: DEBE generar para el ADM: (a) asistencia por evento, (b) % de participación, (c) ranking de eventos más concurridos, (d) asistencia por docente en **doble dimensión** (docentes ASISTENTES y asistencia a eventos donde figuran como PONENTES), (e) métricas generales. DEBE permitir a un **docente ponente** consultar SOLO su propio evento (PA-01). El estudiante NO accede a reportes. DEBE derivarse solo de registros persistidos (EC-06).
- **Actor**: administrativo (todos); docente ponente (solo su evento).
- **Criterios de aceptación (GWT)**:
  1. *Admin*: **GIVEN** un ADM autenticado; **WHEN** consulta "asistencia por evento"; **THEN** ve confirmados/preinscritos/no asistentes y % de participación calculados de los registros persistidos.
  2. *Estudiante*: **GIVEN** un `estudiante`; **WHEN** consulta cualquier reporte; **THEN** `403 Forbidden`.
  3. *Ponente*: **GIVEN** un docente ponente del evento X; **WHEN** consulta el reporte de X; **THEN** obtiene sus datos; cuando consulta el evento Y (del que no es ponente) → `403 Forbidden`.

### RF-16 — Trazabilidad por usuario (historial)
- **Descripción**: DEBE mostrar a cada usuario su historial de eventos con estado: `PREINSCRITO`, `CONFIRMADO`, `NO_ASISTIO`, y para eventos con incidencia: `CANCELADO` / `REPROGRAMADO` (conservando el estado de preinscripción si aplica).
- **Actor**: docente, estudiante.
- **Criterios de aceptación (GWT)**:
  1. *Feliz*: **GIVEN** un docente con eventos en varios estados; **WHEN** consulta su historial; **THEN** ve cada evento con su estado y las incidencias.
  2. *Vacío*: **GIVEN** un usuario sin eventos; **WHEN** consulta; **THEN** `200 OK` con lista vacía y la app muestra "Aún no tienes eventos".

### RF-17 — Reprogramación de eventos (conserva preinscripciones)
- **Descripción**: DEBE permitir reprogramar un evento en `PUBLICADO`, `INSCRIPCIONES_ABIERTAS` (o `EN_CURSO` con justificación, según diseño). Al reprogramar DEBE: pasar a `REPROGRAMADO`, conservar preinscripciones (DF-15), re-agendar recordatorios, regenerar el QR (DF-12) y notificar a interesados y preinscritos. DEBE validar nueva fecha fin > inicio y usualmente futura.
- **Actor**: administrativo, sistema.
- **Criterios de aceptación (GWT)**:
  1. *Feliz*: **GIVEN** un ADM y un evento con preinscritos en `PUBLICADO`; **WHEN** reprograma a una fecha futura válida; **THEN** pasa a `REPROGRAMADO`, se conservan preinscripciones, se re-agendan recordatorios, se regenera el QR y se notifica.
  2. *Fecha inválida*: **GIVEN** una nueva fecha en el pasado o con fin ≤ inicio; **WHEN** se envía; **THEN** `400 Bad Request` y no modifica el evento.
  3. *Estado terminal*: **GIVEN** un evento `COMPLETADO` o `CANCELADO`; **WHEN** se intenta reprogramar; **THEN** `409 Conflict` "el evento ya está en un estado terminal".

### RF-18 — Notificaciones de cancelación/reprogramación
- **Descripción**: DEBE notificar (push FCM + centro in-app) a interesados y preinscritos al cancelar o reprogramar (DF-15). Al cancelar DEBE: liberar cupos, bloquear preinscripción y check-in, y mostrar `CANCELADO` en el historial.
- **Actor**: sistema.
- **Criterios de aceptación (GWT)**:
  1. *Feliz*: **GIVEN** un evento publicado con preinscritos; **WHEN** el admin cancela; **THEN** los cupos se liberan, se bloquea preinscripción/check-in y los afectados reciben push + entrada in-app.
  2. *FCM*: **GIVEN** un destinatario con FCM no entregable; **WHEN** se emite el aviso; **THEN** queda visible en el centro in-app (degradación sin pérdida).

### RF-19 — Seeds con datos ficticios realistas
- **Descripción**: DEBE incluir semillas idempotentes: administrativos provisionados (≥ 2), docentes (≥ 5), estudiantes (≥ 10) y eventos (≥ 6) en TODOS los estados, con preinscripciones, asistencias y encuestas de ejemplo. NO DEBEN contener datos reales (R-09).
- **Actor**: sistema/desarrollo (provisión de la demo).
- **Criterios de aceptación (GWT)**:
  1. *Feliz*: **GIVEN** una BD vacía; **WHEN** se ejecutan los seeds; **THEN** existen usuarios y eventos mínimos en todos los estados y la demo funciona sin ingreso manual.
  2. *Re-ejecución*: **GIVEN** los seeds ya ejecutados; **WHEN** se ejecutan de nuevo; **THEN** no se duplican registros (idempotencia verificable).

### RF-20 — Idioma español (UI y documentación)
- **Descripción**: la UI, mensajes, estados visibles y TODA la documentación DEBEN estar en español. El código y nombres internos PUEDEN estar en inglés; los artefactos visibles al usuario y al Ingeniero NO.
- **Actor**: transversal (sistema completo).
- **Criterios de aceptación (GWT)**:
  1. *Feliz*: **GIVEN** la app instalada; **WHEN** se navega por todos los flujos (registro, feed, detalle, preinscripción, check-in, encuesta, reportes); **THEN** todas las etiquetas, estados y mensajes están en español, sin cadenas sin traducir.
  2. *Verificación*: **GIVEN** el repositorio; **WHEN** se revisa `docs/`; **THEN** el 100 % de la documentación entregable está en español (criterio EC-07).

---

## 3. Estados del evento y de asistencia

### 3.1 Estados del evento
| Estado | Significado |
|---|---|
| `BORRADOR` | Evento creado, visible solo para administrativos; sin difusión. |
| `PUBLICADO` | Difundido al público objetivo; aparece en el feed. |
| `INSCRIPCIONES_ABIERTAS` | Acepta preinscripciones (solo si requiere preinscripción). |
| `EN_CURSO` | Se está realizando; el QR está activo (ventana de validez). |
| `COMPLETADO` | **Terminal**. Se derivó `NO_ASISTIO` y se habilitó la encuesta. |
| `CANCELADO` | **Terminal**. Cupos liberados; preinscripción/check-in bloqueados. |
| `REPROGRAMADO` | Nueva fecha/hora; conserva preinscripciones; re-agenda y regenera QR. |

> Nota (DF-11): **"no asistió" NO es un estado del evento**; es un **estado de asistencia del usuario** derivado automáticamente al completarse el evento.

### 3.2 Estados de asistencia del usuario
| Estado | Descripción |
|---|---|
| `PENDIENTE` | Sin registro (antes del cierre), en eventos sin preinscripción. |
| `PREINSCRITO` | Cupo reservado en evento con preinscripción. |
| `CONFIRMADO` | Asistencia registrada vía check-in QR (idempotente). |
| `NO_ASISTIO` | Derivado al completarse el evento (preinscrito sin check-in). |
| `CANCELADO` / `REPROGRAMADO` | Incidencia del evento que afecta al historial del usuario. |

---

## 4. Reglas de negocio (BR-01..BR-08)

### BR-01 — Máquina de estados del evento (DF-03, DF-11)
Estados: `BORRADOR → PUBLICADO → INSCRIPCIONES_ABIERTAS → EN_CURSO → COMPLETADO | CANCELADO | REPROGRAMADO`.

**Transiciones válidas (EV)**:
| Desde | Hacia | Condición |
|---|---|---|
| BORRADOR | PUBLICADO | Publicar (autoaprobación, PA-06) |
| BORRADOR | CANCELADO | Descartar borrador |
| PUBLICADO | INSCRIPCIONES_ABIERTAS | Solo si requiere preinscripción |
| PUBLICADO | EN_CURSO | Solo sin preinscripción, a la hora de inicio |
| PUBLICADO | CANCELADO / REPROGRAMADO | Admin |
| INSCRIPCIONES_ABIERTAS | EN_CURSO | Hora de inicio |
| INSCRIPCIONES_ABIERTAS | CANCELADO / REPROGRAMADO | Admin |
| EN_CURSO | COMPLETADO | Hora fin o cierre manual |
| EN_CURSO | CANCELADO | Admin (con aviso) |
| REPROGRAMADO | EN_CURSO | Nueva hora de inicio (sin preinscripción) |
| REPROGRAMADO | INSCRIPCIONES_ABIERTAS | Con preinscripción (→ luego EN_CURSO) |
| REPROGRAMADO | CANCELADO | Admin |

- **Terminales**: `CANCELADO` y `COMPLETADO` (sin transiciones posteriores). Toda transición no listada → `409 Conflict`.
- **Automáticas (PA-04)**: hora inicio → `EN_CURSO`; hora fin → `COMPLETADO`; con override manual del admin (adelantar/atrasar).
- **"No asistió"** (DF-11): estado de ASISTENCIA del usuario derivado al completar el evento para preinscritos sin check-in.

### BR-02 — Preinscripción y aforo (RF-08, DF-05, PA-08)
- Solo se preinscribe si: `INSCRIPCIONES_ABIERTAS`, cupo > 0, sin duplicado (→ 409).
- Decremento de cupo + registro en UNA transacción atómica (UPDATE condicional / fila bloqueada) → 0 sobrecupos (EC-03).
- Cupo = 0 → cierre automático (+ aviso).
- Con preinscripción → cupos > 0 obligatorios; sin preinscripción → asistencia libre sin cupo.
- MVP sin costo (PA-08): el que no asiste solo obtiene `NO_ASISTIO`.

### BR-03 — Check-in QR (RF-09..RF-11, DF-02, DF-12..DF-14)
- Ventana del QR: SOLO durante `EN_CURSO`; token único por instancia; se regenera al reprogramar (anterior inválido).
- **Self check-in**: cada usuario escanea con SU propio celular (DF-02).
- Elegibilidad (DF-13): con preinscripción → solo preinscritos (403 si no); sin → cualquier usuario del público objetivo.
- Idempotencia (DF-14): 1 usuario = 1 registro por evento (EC-04).
- Registro: `usuario` + `evento` + `fecha_hora` (prepara certificados futuros).

### BR-04 — Encuestas (RF-13, PA-03)
- Configuración opcional por evento; se habilita al `COMPLETADO`.
- Elegible: solo asistentes confirmados (403 para no asistentes).
- UNA sola respuesta por usuario/evento (duplicado → 409).
- Calificación 1–5 (obligatoria) + comentario opcional; fuera de rango → 400.
- Atribución interna (trazabilidad/anti-duplicado) pero resultados SIEMPRE agregados/anónimos.

### BR-05 — Recordatorios (RF-12, PA-05, DF-17)
- Configurables por evento (toggles T−24 h / T−30 min); **default activado** (PA-05); el admin puede desactivar.
- Destinatarios: público objetivo + preinscritos (DF-17).
- Reprogramar → re-agendar; cancelar → suprimir pendientes.
- Respaldo: toda notificación queda en el centro in-app aunque FCM falle (R-03).

### BR-06 — Visibilidad (RF-06/RF-07, PA-07)
- `BORRADOR`: solo administrativos (nunca en feed público).
- Público objetivo filtra feed y detalle; no visible → omitido del feed y `404` en detalle.
- Feed ordena por fecha (próximos primero); filtros por estado/fecha.

### BR-07 — Reprogramación y cancelación (RF-17/RF-18, DF-15)
- **Reprogramar**: conserva preinscripciones; re-agenda recordatorios; regenera QR; notifica a interesados + preinscritos.
- **Cancelar**: libera cupos; bloquea preinscripción y check-in; notifica; queda `CANCELADO` en el historial.
- `CANCELADO`/`COMPLETADO` son terminales (BR-01).

### BR-08 — Zona horaria (R-08)
- Todas las fechas en **UTC**; presentación y agendamiento convertidos a la zona del usuario (**Perú, UTC−5** como referencia).
- Los jobs de transiciones y recordatorios DEBEN evaluar con conversión explícita UTC ↔ UTC−5 (pruebas EC-05).

---

## 5. Supuestos aplicados (PA-01..PA-09)

| # | Supuesto aprobado | Comportamiento en el sistema |
|---|---|---|
| PA-01 | Docente ponente ve el reporte SOLO de su propio evento | Lectura restringida por rol+evento; sin acceso a otros reportes (RF-15) |
| PA-02 | "Asistencia por docente" = doble dimensión | Docentes como asistentes Y asistencia a eventos donde figuran como ponentes (RF-15) |
| PA-03 | Encuestas atribuidas internamente, presentadas agregadas/anónimas | Trazabilidad interna; resultados nunca identifican al encuestado (RF-13) |
| PA-04 | Transición en curso/completado automática + override manual | Jobs por horario + override del admin (RF-05) |
| PA-05 | Recordatorios configurables por evento, default activado | Toggles T−24 h / T−30 min ON por defecto (RF-12) |
| PA-06 | Autoaprobación de publicación | El mismo admin publica su borrador; revisión de segundo par = futuro (RF-04) |
| PA-07 | Público objetivo configurable por evento | `todos | docentes | estudiantes`; feed y FCM respetan la selección (RF-03/RF-06)) |
| PA-08 | MVP sin eventos con costo | El no asistente solo registra `NO_ASISTIO` (sin penalización) (RF-08) |
| PA-09 | QR descargable/imprimible por el admin | Pantalla + descarga/impresión para proyectar en el aula (RF-09) |

---

*Siguiente documento: [03-casos-de-uso.md](03-casos-de-uso.md)*