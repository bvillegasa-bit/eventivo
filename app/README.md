# EVENTIVO — app Flutter (MVVM)

App móvil de **EVENTIVO** (seguimiento de eventos académicos, UCV campus Callao).
Implementada en **Sprint 1 (Batch 2, T-S1.11..T-S1.17)**: autenticación completa
(registro, login, restauración de sesión, logout) + demo de RBAC contra el
auth-service, con el patrón **MVVM** (Riverpod) y **GoRouter**.

## Requisitos

- Flutter **stable** (Dart SDK `^3.5.0`; el CI usa `subosito/flutter-action` canal stable).
- Emulador Android (API 26+) o simulador iOS (13+).
- auth-service corriendo: ver [services/auth/README.md](../services/auth/README.md).

## Configurar la base URL de la API

La app compila la base URL del backend desde `--dart-define`. Por defecto apunta
al auth-service directo (emulador Android):

| Escenario | Comando |
|---|---|
| Emulador Android → servicio directo (`:3001`, por defecto) | `flutter run` |
| Emulador Android → **gateway** (`:8080`, demo) | `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080` |
| Simulador iOS → gateway (`localhost` comparte red con el host) | `flutter run -d <simulador> --dart-define=API_BASE_URL=http://localhost:8080` |
| Dispositivo físico | usar la IP LAN del host (p. ej. `http://192.168.x.x:8080`) |

> `10.0.2.2` es la forma en que el emulador Android llega a `localhost` del host.
> En iOS el simulador comparte la red del host (vale `localhost` directo).

## Estructura (MVVM)

```text
app/lib/
├── main.dart                   # ProviderScope + EventivoApp
├── app.dart                    # MaterialApp.router (tema UCV, GoRouter)
├── core/
│   ├── config/api_config.dart  # base URL vía dart-define (fallback :3001)
│   ├── network/                # Dio + ApiClient + AuthInterceptor (JWT/refresh)
│   ├── storage/token_storage.dart  # flutter_secure_storage (Keystore/Keychain)
│   ├── theme/app_theme.dart    # Material 3, color semilla rojo UCV
│   ├── providers.dart          # tokenStorage + apiClient (con onSesionInvalida)
│   ├── router/app_router.dart  # /splash, /login, /registro, /inicio, /perfil
│   └── utils/fecha_util.dart   # UTC→hora local (UTC−5)
├── features/
│   ├── auth/                   # models, repositories, viewmodels, views
│   └── perfil/                 # perfil + demo RBAC (verificarAccesoAdministrativo)
```

- **Modelos**: `Usuario` (rol `estudiante|docente|administrativo`) y `Sesion`
  (access + refresh + usuario). `fromJson` estricto (campos inesperados fallan).
- **Repositorio (`AuthRepository`)**: `login`, `registro`, `logout`, `me`;
  traduce `DioException` a `ApiException` (mensajes en español).
- **ViewModels (Riverpod)**: `AuthState` (`restaurando | noAutenticado | autenticado`)
  y `PerfilState`; lógica de negocio testeada con `mocktail`.
- **Interceptor**: adjunta `Bearer`, rota el refresh con corte de carrera
  (single-flight), reintenta la petición original una vez y, si el refresh
  falla, limpia la sesión y avisa al router (`onSesionInvalida`).
- **Seguridad**: tokens en `flutter_secure_storage`; Android usa
  `networkSecurityConfig` que permite HTTP claro **solo** a
  `10.0.2.2`/`localhost`/`127.0.0.1`; iOS usa `NSAllowsLocalNetworking` (ATS).

## Probar

```bash
flutter pub get
flutter analyze          # 0 issues (el CI lo exige)
flutter test             # 31 tests (unit + widget), sin red ni emulador
```

Los tests usan `FakeTokenStorage` (en memoria) en lugar de
`flutter_secure_storage` (no disponible en `flutter test`) y un `HttpClientAdapter`
falso para el interceptor.

## Flujo de la app (Sprint 1)

1. **Splash** → `restaurarSesion()` (lee tokens, valida `GET /auth/me`).
2. **Registro** (estudiante/docente) → **Login** (con validación y errores inline en español).
3. **Inicio / Perfil**: nav inferior con 2 pestañas; en Perfil → demo RBAC y **cerrar sesión** (confirma antes de salir).

## CI

El job `app` de [.github/workflows/ci.yml](../.github/workflows/ci.yml) ejecuta
`flutter pub get` + `flutter analyze` + `flutter test` en cada push/PR a `main`.

## Manual de demo

Ver [docs/manual-demo-s1.md](../docs/manual-demo-s1.md) (registro → login →
restauración de sesión → 403 estudiante → rate limit → red interna).