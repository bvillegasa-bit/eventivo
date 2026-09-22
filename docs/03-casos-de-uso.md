# 03 · Casos de uso — EVENTIVO

**Sistema de Seguimiento de Eventos Académicos UCV · Campus Callao**

Los 15 casos de uso del MVP con actores y flujos alternativos. Se derivan íntegramente del spec del proyecto.

| # | Caso de uso | Actores principales | Reglas relacionadas |
|---|---|---|---|
| UC-01 | Registro de usuario | docente, estudiante | RF-01, BR-06 |
| UC-02 | Autenticación y cierre de sesión | todos | RF-02 |
| UC-03 | Crear evento (borrador) | administrativo | RF-03, RF-07 |
| UC-04 | Publicar y difundir evento | administrativo, sistema | RF-04, RF-05, RF-12 |
| UC-05 | Gestionar inscripciones | administrativo | RF-08, BR-02 |
| UC-06 | Consultar feed/agenda | docente, estudiante | RF-06, BR-06 |
| UC-07 | Preinscribirse | docente, estudiante, sistema | RF-08, BR-02 |
| UC-08 | Asistir vía self check-in QR | docente, estudiante, sistema | RF-09..RF-11, BR-03 |
| UC-09 | Agregar evento al calendario nativo | docente, estudiante | RF-14 |
| UC-10 | Responder encuesta post-evento | asistente confirmado; administrativo (consulta) | RF-13, BR-04 |
| UC-11 | Consultar reportes | administrativo; docente ponente (solo su evento) | RF-15, PA-01 |
| UC-12 | Reprogramar evento | administrativo, sistema | RF-17, BR-07 |
| UC-13 | Cancelar evento | administrativo, sistema | RF-18, BR-07 |
| UC-14 | Ver trazabilidad/historial personal | docente, estudiante | RF-16 |
| UC-15 | Ver detalle del evento | todos; administrativo con QR | RF-07, BR-06 |

---

## UC-01 — Registro de usuario
- **Actores**: docente, estudiante (primarios); sistema.
- **Disparador**: usuario nuevo abre la app y elige "Registrarse".
- **Flujo principal**: validar términos → ingresar email, contraseña y rol → validación y hash → crear cuenta → emitir tokens → sesión iniciada.
- **Flujos alternativos**: email duplicado (`409` genérico, anti-enumeración); contraseña débil/malformada (`400` por campo); rol `administrativo` seleccionado (`403`); sin verificación de email en MVP (cuenta usable de inmediato).

## UC-02 — Autenticación y cierre de sesión
- **Actores**: todos (primarios); sistema.
- **Disparador**: usuario existente abre la app o expira su access token.
- **Flujo principal**: login email+contraseña → emitir access+refresh → usar access → refrescar al expirar → logout revoca la familia.
- **Flujos alternativos**: credenciales incorrectas (`401` genérico + rate limiting); access expirado → refresh automático con rotación; refresh reutilizado → **revocación total de la familia** y nuevo login; intentos excesivos → `429`.

## UC-03 — Crear evento (borrador)
- **Actores**: administrativo (primario); sistema.
- **Disparador**: el admin quiere registrar un nuevo evento académico.
- **Flujo principal**: autenticarse como admin → formulario completo (datos, fechas, sede, modalidad, ponentes, público objetivo, preinscripción/aforo, recordatorios, encuesta) → validación → persistir `BORRADOR`.
- **Flujos alternativos**: validación fallida (`400` con detalle por campo); aforo sin valor con preinscripción marcada; edición posterior del borrador; descarte del borrador → `CANCELADO`.

## UC-04 — Publicar y difundir evento
- **Actores**: administrativo (primario); sistema.
- **Disparador**: el borrador está completo y el admin lo publica (autoaprobación, PA-06).
- **Flujo principal**: publicar → `PUBLICADO` → visible en el feed según público objetivo → push FCM + centro in-app al público objetivo.
- **Flujos alternativos**: FCM no entregable (queda en el centro in-app, R-03); con preinscripción → tras publicar abre inscripciones (`INSCRIPCIONES_ABIERTAS`); sin preinscripción → directo a `EN_CURSO` en su hora de inicio.

## UC-05 — Gestionar inscripciones (administrativo)
- **Actores**: administrativo (primario); sistema.
- **Disparador**: hay un evento en `INSCRIPCIONES_ABIERTAS`.
- **Flujo principal**: ver preinscritos y cupos restantes → monitorear → cerrar inscripciones manualmente o por cupo lleno automático.
- **Flujos alternativos**: cierre manual anticipado; cupo llega a 0 (cierre automático + aviso); nadie se preinscribe.

## UC-06 — Consultar feed/agenda
- **Actores**: docente, estudiante (primarios).
- **Disparador**: el usuario abre la app o la pestaña agenda.
- **Flujo principal**: cargar feed filtrado por público objetivo del rol → aplicar filtros estado/fecha → ordenar por fecha → abrir detalle.
- **Flujos alternativos**: filtros sin resultados (lista vacía con mensaje); evento no visible por público objetivo (omitido / `404` en detalle); primera carga lenta por arranque frío (spinner).

## UC-07 — Preinscribirse
- **Actores**: docente, estudiante (primarios); sistema (aforo).
- **Disparador**: el usuario quiere asegurar cupo en un evento con preinscripción.
- **Flujo principal**: ver cupos en detalle → preinscribirse → **transacción atómica** (cupo −1 + registro) → confirmación visible.
- **Flujos alternativos**: aforo completo (`409` + "aforo completo"); ya preinscrito (`409` + "ya estás preinscrito"); concurrencia por el último cupo (1 gana, el resto `409`); evento no en `INSCRIPCIONES_ABIERTAS` (bloqueado); no asistió al final → `NO_ASISTIO` (PA-08).

## UC-08 — Asistir vía self check-in QR
- **Actores**: docente, estudiante (primarios); sistema.
- **Disparador**: el evento está `EN_CURSO` y el QR visible (pantalla admin / impresión).
- **Flujo principal**: escanear el QR con la cámara → validar evento `EN_CURSO` + token vigente + elegibilidad + no duplicado → registrar asistencia → confirmación en pantalla.
- **Flujos alternativos**: evento no en curso (rechazado); usuario no elegible (requiere preinscripción y no está preinscrito → `403`); doble escaneo (idempotente, "ya registraste tu asistencia"); token regenerado por reprogramación (invalida escaneos del token anterior).

## UC-09 — Agregar evento al calendario nativo
- **Actores**: docente, estudiante (primarios).
- **Disparador**: el usuario quiere que el evento aparezca en su agenda del celular.
- **Flujo principal**: desde el detalle → "Agregar al calendario" → permiso (pide si falta) → evento en la agenda nativa.
- **Flujos alternativos**: permiso denegado (mensaje accesible, no bloquea la app); evento en estado terminal cancelado (se omite/deshabilita).

## UC-10 — Responder encuesta post-evento
- **Actores**: docente, estudiante con asistencia confirmada (primarios); administrativo (consulta agregada).
- **Disparador**: el evento pasó a `COMPLETADO` y el usuario tiene asistencia confirmada.
- **Flujo principal**: aviso en la app → abrir encuesta → calificación 1–5 + comentario opcional → persistir (atribuida internamente) → agradecimiento.
- **Flujos alternativos**: duplicado (`409` "ya respondiste"); no elegible/no asistente (`403`); calificación fuera de rango (`400`); resultados solo visibles agregados/anónimos (PA-03).

## UC-11 — Consultar reportes
- **Actores**: administrativo (todos, primario); docente ponente (solo su evento, PA-01).
- **Disparador**: el admin (o ponente) quiere métricas de un evento o del sistema.
- **Flujo principal**: seleccionar reporte → agregaciones sobre registros persistidos → presentación en pantalla.
- **Flujos alternativos**: estudiante intenta acceder (`403`); ponente consulta un evento del que no es ponente (`403`); reporte sin datos (tabla vacía con mensaje).

## UC-12 — Reprogramar evento
- **Actores**: administrativo (primario); sistema.
- **Disparador**: una incidencia (sala, ponente, fechas) obliga a mover el evento.
- **Flujo principal**: seleccionar nueva fecha/hora → validar → `REPROGRAMADO` → conservar preinscripciones → re-agendar recordatorios → regenerar QR → notificar push + centro in-app.
- **Flujos alternativos**: fecha inválida (`400`); estado terminal (`409`); FCM falla (centro in-app); reprogramación durante `EN_CURSO` (validado en diseño: permitida con justificación o exige cancelar primero).

## UC-13 — Cancelar evento
- **Actores**: administrativo (primario); sistema.
- **Disparador**: imposibilidad de realizar el evento.
- **Flujo principal**: cancelar → `CANCELADO` → liberar cupos → bloquear preinscripción/check-in → notificar push + centro in-app a interesados/preinscritos → visible como cancelado en el historial.
- **Flujos alternativos**: cancelar borrador (descartar sin notificaciones); FCM falla (centro in-app); cancelar evento `COMPLETADO` (no permitido, terminal).

## UC-14 — Ver trazabilidad/historial personal
- **Actores**: docente, estudiante (primarios).
- **Disparador**: el usuario quiere ver su participación pasada.
- **Flujo principal**: abrir historial → ver eventos con su estado (preinscrito / confirmado / no asistió / pendiente) e incidencias (reprogramado / cancelado).
- **Flujos alternativos**: sin eventos (lista vacía con mensaje "Aún no tienes eventos").

## UC-15 — Ver detalle del evento
- **Actores**: todos (primarios); administrativo con privilegios adicionales (QR).
- **Disparador**: el usuario toca un evento del feed/agenda/historial.
- **Flujo principal**: cargar detalle + estado del usuario + cupos + accesos (preinscripción, calendario, encuesta, QR si aplica).
- **Flujos alternativos**: evento no visible por público objetivo (`404`); QR solo en `EN_CURSO` y solo para admin (PA-09) o pantalla proyectada; evento terminal (acciones deshabilitadas, historial actualizado).

---

### Matriz de trazabilidad casos de uso → módulos

| Caso de uso | Módulo(s) |
|---|---|
| UC-01, UC-02 | auth |
| UC-03, UC-04, UC-06, UC-12, UC-13, UC-15 | evento (+ notificacion en difusión) |
| UC-05, UC-07, UC-08, UC-10 | asistencia (+ evento: contexto/QR) |
| UC-09 | app Flutter (sin backend) |
| UC-11 | reporte (+ evento, asistencia) |
| UC-14 | evento, asistencia (vista) |

*Siguiente documento: [04-diagrama-de-actividades.md](04-diagrama-de-actividades.md)*