/// Configuración de la API (T-S1.11).
///
/// La base URL se inyecta en tiempo de compilación con:
/// `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080`
///
/// Si no se define, se usa el valor por defecto para el EMULADOR de Android
/// (`10.0.2.2` = localhost de la máquina anfitriona visto desde el emulador).
/// Para el simulador de iOS usar `--dart-define=API_BASE_URL=http://localhost:3001`.
abstract final class ApiConfig {
  static const String _baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3001',
  );

  /// Base URL de la API (gateway Nginx o auth-service en desarrollo).
  static String get baseUrl => _baseUrl;

  /// Timeouts de red (desarrollo local; el free tier puede tardar más).
  static const Duration timeoutConexion = Duration(seconds: 10);
  static const Duration timeoutRespuesta = Duration(seconds: 20);
}