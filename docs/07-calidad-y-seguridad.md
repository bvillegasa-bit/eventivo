# 07 · Calidad y Seguridad — EVENTIVO

**Matriz ISO/IEC 25010 (SQuaRE) + capa OWASP Top 10 + criterios de aceptación no funcionales.**

Documento derivado del spec del proyecto (requisitos no funcionales y capa de seguridad).

---

## 1. Matriz ISO/IEC 25010 (8 características con umbrales)

### 1.1 Adecuación funcional
| Criterio | Umbral de aceptación |
|---|---|
| Exactitud de la máquina de estados | 100 % de las transiciones válidas de BR-01 implementadas; **0 transiciones inválidas aceptadas** (pruebas por transición) |
| Exactitud del aforo | **0 sobrecupos** bajo concurrencia (EC-03: N≥10 usuarios, 1 vencedor); conteo de cupos jamás negativo |
| Exactitud de reportes | Los 5 reportes de RF-15 coinciden **1:1** con los registros persistidos (prueba con evento de control) |
| Cobertura funcional | **100 % de RF-01..RF-20** verificables en la demo (EC-02); cada RF con al menos un escenario automatizable |

### 1.2 Eficiencia de desempeño
| Criterio | Umbral de aceptación |
|---|---|
| Latencia de lecturas (feed, detalle, historial, reportes) | p95 < **500 ms** (red local de demo / free tier con arranque frío aceptable) |
| Latencia de escrituras (preinscripción, check-in, registro) | p95 < **1 s**; el check-in confirma en pantalla en < **2 s** percibidos |
| Check-in concurrente | ≥ **1 000 usuarios** escaneando el mismo QR en el mismo minuto sin pérdida de registros |
| Arranque de la app | ≤ **3 s** en Android de gama media con datos en caché; listas sin jank (objetivo 60 fps) |

### 1.3 Compatibilidad
| Criterio | Umbral de aceptación |
|---|---|
| Plataformas móviles | **Android 8.0+ (API 26+)** como base y **iOS 13+**; verificación en emulador + ≥ 1 dispositivo real por plataforma |
| Contrato API | OpenAPI publicado por servicio; CORS configurado para la futura web; la API es consumible sin cambios por un cliente web (EC-08) |
| Push | FCM en Android e iOS; el centro in-app funciona en ambos como respaldo |

### 1.4 Usabilidad
| Criterio | Umbral de aceptación |
|---|---|
| Self check-in | Completar en ≤ **3 pasos** desde la apertura de la app (abrir evento → escanear QR → confirmar) |
| Estados entendibles | Badges/estados en español en feed y detalle (borrador, publicado, inscripciones abiertas, en curso, completado, cancelado, reprogramado; y por usuario: preinscrito, confirmado, no asistió, pendiente) |
| Onboarding | **5 usuarios nuevos** completan registro + primer vistazo al feed sin instrucciones externas |
| Accesibilidad básica | Contraste AA en textos; tamaños de fuente escalables; mensajes de error accionables (qué pasó + qué hacer) |
| Mensajes de error | Todo error de usuario muestra mensaje en español, descriptivo y no técnico |

### 1.5 Fiabilidad
| Criterio | Umbral de aceptación |
|---|---|
| Disponibilidad en demo | ≥ **99 %** durante la ventana de la demo (arranque frío de free tier aceptable y documentado, R-04) |
| Idempotencia | Check-in y preinscripción idempotentes: reintentos/escaneos repetidos **no duplican** registros (EC-04) |
| Degradación FCM | El **100 %** de las notificaciones emitidas quedan registradas en el centro in-app aunque FCM falle (R-03) |
| Respaldo de datos | Backups automáticos de PostgreSQL con restauración probada una vez antes de la demo |
| Tolerancia a fallo de jobs | Los jobs de transiciones y recordatorios **re-evalúan eventos pendientes al despertar** (arranque frío) |

### 1.6 Seguridad
| Área | Requisito y umbral |
|---|---|
| Autenticación (A07/A09) | JWT firmado (HS256/RS256), access ≤ 15 min, refresh con rotación y revocación de familia ante reuso; bcrypt (cost ≥ 10) o argon2; `401` genérico sin enumeración; **MFA fuera del MVP** |
| Autorización RBAC (A01) | RBAC evaluado en CADA endpoint; `403` si el rol no autoriza; menor privilegio en cuentas de BD; reportes restringidos por rol+evento (PA-01); estudiantes sin reportes |
| Validación de entrada (A03/A08) | DTO + class-validator en cada servicio; queries 100 % parametrizadas; escapado/saneado de salida; tamaños máximos de campos; `400` con detalle |
| Rate limiting (A07) | Login/registro: máx. **10 intentos/hora** por IP + email → `429` con `Retry-After`; endpoints públicos y gateway por IP |
| Protección de datos (A02/A05) | PII mínima; encuestas anónimas/agregadas en resultados (PA-03); seeds sin datos reales (R-09); **0 secretos en el repo**; HTTPS en producción; headers de seguridad (CSP, HSTS, X-Content-Type-Options, X-Frame-Options) |
| Logs y auditoría (A09/A08) | Registro de acciones sensibles (crear, publicar, cancelar, reprogramar, cerrar, check-in, encuesta, login/logout) con timestamp UTC; logs SIN datos sensibles |
| Sesiones/rotación | Logout revoca refresh; **reuso de refresh rotado → revoca toda la familia** y exige nuevo login (prueba automatizada) |

> Detalle completo de controles por capa (Gateway/Servicio/Datos/App/Secretos) en [05-arquitectura.md §7](05-arquitectura.md).

### 1.7 Mantenibilidad
| Criterio | Umbral de aceptación |
|---|---|
| Contratos API | OpenAPI por servicio (auth, evento, asistencia, notificacion, reporte) mantenido y versionado |
| Estructura | Carpetas por dominio; ESLint + Prettier (backend); `flutter analyze` sin errores de severidad alta |
| Cobertura de pruebas | ≥ **70 %** unitaria por servicio; núcleo crítico (máquina de estados, aforo, check-in, rotación de refresh) ≥ **85 %**; pruebas de integración por contrato |
| CI/CD | GitHub Actions con build + test + lint (y deploy free tier) verde en `main`; ninguna PR se mergea con CI rojo |

### 1.8 Portabilidad
| Criterio | Umbral de aceptación |
|---|---|
| Multiplataforma | Un único codebase Flutter para Android e iOS (EC-08) |
| Despliegue | Microservicios contenedorizados (Docker) + Nginx reproducible en cualquier hosting free tier; configuración 100 % vía variables de entorno |

## 2. Capa OWASP Top 10 aplicada

| Categoría OWASP | Controles en EVENTIVO | Evidencia de verificación |
|---|---|---|
| **A01 · Broken Access Control** | RBAC por endpoint (403), roles por seed, menor privilegio en BD, IDOR protegido (ponente solo su evento, PA-01) | Tests de RBAC por transición y por endpoint |
| **A02 · Cryptographic Failures** | JWT firmado, bcrypt/argon2, refresh con hash en BD, TLS/HTTPS, secrets en env | Gitleaks 0 secretos; revisión de headers |
| **A03 · Injection** | DTO + class-validator, queries parametrizadas/TypeORM, saneado de salida | SAST CodeQL/Semgrep; pruebas de inyección |
| **A04 · Insecure Design** | Máquina de estados centralizada, transacciones anti-sobrecupo, jobs tolerantes a arranque frío | Pruebas por transición; EC-03 |
| **A05 · Security Misconfiguration** | Headers de seguridad en Nginx, ocultar versión, bloqueo `/internal/*`, OpenAPI sin datos sensibles | Checklist OWASP + `curl -I` |
| **A06 · Vulnerable Components** | Dependabot en los 5 servicios y app; 0 findings críticos abiertos antes de la demo | Informe de Dependabot/SAST |
| **A07 · Auth Failures** | Access corto + refresh rotativo + revocación por reuso; rate limiting login 10/15 min | Test de reuso automatizado; 429 tras 10 intentos |
| **A08 · Integrity Failures** | Validación estricta de entrada/salida; firmas JWT con allowlist de algoritmos; logs de seguridad | SAST + revisión en verify |
| **A09 · Logging Failures** | Auditoría de acciones sensibles con timestamp UTC; logs sin PII (sin contraseñas/tokens/comentarios) | Revisión de logs en verify |
| **A10 · SSRF** | Red interna solo vía `X-Service-Key`, rutas `/internal/*` no expuestas al exterior, allowlist CORS | Prueba de acceso externo a `/internal/*` → 403/404 |

## 3. Criterios de aceptación no funcionales (resumen ejecutivo)

| Área | Criterio clave |
|---|---|
| Desempeño | lecturas p95 < 500 ms · escrituras p95 < 1 s · check-in < 2 s percibidos |
| Concurrencia | 0 sobrecupos (EC-03) · check-in idempotente (EC-04) · 1 000 check-ins/min sin pérdida |
| Disponibilidad | ≥ 99 % en la ventana de demo · tolerable el arranque frío free tier |
| Compatibilidad | Android 8+ / iOS 13+ · OpenAPI ×5 · CORS listo para web |
| Seguridad | OWASP Top 10 verificado en todos los servicios (checklist en `docs/seguridad/`) |
| Mantenibilidad | cobertura ≥ 70 % (85 % núcleo) · CI verde obligatorio · lint sin errores altos |
| Costo | **$0** en toda la demo (free tier) |
| Idioma | UI, mensajes, estados y **100 % de la documentación en español** |
| Zona horaria | Almacenamiento UTC; presentación/agendamiento UTC−5 (Perú) |

---

*Inicio: [README.md](README.md) del índice de documentación.*