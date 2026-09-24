import 'package:dio/dio.dart';

import '../storage/token_storage.dart';

/// Interceptor de autenticación JWT (T-S1.13).
///
/// Responsabilidades:
///  1. Adjuntar el access token (Bearer) a cada petición.
///  2. Ante un `401` con access expirado, ROTAR el refresh token una sola vez
///     (DT-05) y reintentar la petición original automáticamente.
///  3. Ante un refresh rechazado (reuso detectado / expirado / revocado),
///     limpiar los tokens y notificar que la sesión quedó inválida para que la
///     app redirija al login (logout forzado).
///
/// Single-flight: si varias peticiones fallan a la vez con 401, solo se ejecuta
/// UNA llamada a `/auth/refresh` y todas comparten el resultado.
class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required this.dio,
    required this.refreshDio,
    required this.storage,
    required this.onSesionInvalida,
  });

  /// Dio de la app (para reintentar la petición original).
  final Dio dio;

  /// Dio SIN este interceptor, usado solo para `POST /auth/refresh`
  /// (evita recursión si el propio refresh responde 401).
  final Dio refreshDio;

  final TokenStorage storage;

  /// Se invoca cuando el refresh es rechazado (reuso/expiración):
  /// la sesión debe cerrarse y volver al login.
  final void Function() onSesionInvalida;

  /// Futuro compartido del refresh en curso (single-flight).
  Future<String?>? _refreshEnCurso;

  /// Marca en `extra` de la petición reintentada para no reintentar dos veces.
  static const marcarReintento = '_auth_reintentado';

  /// Rutas que NUNCA disparan refresh (auth público o el propio refresh).
  static const _rutasSinRefresh = {'/auth/login', '/auth/registro', '/auth/refresh'};

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final tokens = await storage.leerTokens();
    final access = tokens?.accessToken;
    if (access != null && access.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $access';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final request = err.requestOptions;
    final es401 = err.response?.statusCode == 401;
    final yaReintentado = request.extra[marcarReintento] == true;
    final rutaSinRefresh = _rutasSinRefresh.contains(request.path);

    if (!es401 || yaReintentado || rutaSinRefresh) {
      handler.next(err);
      return;
    }

    try {
      final nuevoAccess = await _rotarRefresh();
      if (nuevoAccess == null) {
        handler.next(err);
        return;
      }

      // Reintenta la petición original con el access token nuevo.
      final reintento = await dio.fetch<dynamic>(
        request.copyWith(
          headers: {...request.headers, 'Authorization': 'Bearer $nuevoAccess'},
          extra: {...request.extra, marcarReintento: true},
        ),
      );
      handler.resolve(reintento);
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        // Reuso del refresh ya rotado o token revocado: se revoca la sesión
        // (DT-05: detección de reuso → exigir nuevo login).
        await storage.limpiar();
        onSesionInvalida();
      }
      handler.next(err);
    }
  }

  /// Rota el refresh token una sola vez (single-flight) y devuelve el nuevo
  /// access token; `null` si no había refresh guardado.
  Future<String?> _rotarRefresh() {
    _refreshEnCurso ??= _refrescar().whenComplete(() => _refreshEnCurso = null);
    return _refreshEnCurso!;
  }

  Future<String?> _refrescar() async {
    final tokens = await storage.leerTokens();
    final refresh = tokens?.refreshToken;
    if (refresh == null || refresh.isEmpty) {
      return null;
    }

    final respuesta = await refreshDio.post<Map<String, dynamic>>(
      '/auth/refresh',
      data: {'refreshToken': refresh},
    );
    final datos = respuesta.data;
    if (datos == null) {
      throw DioException(
        requestOptions: respuesta.requestOptions,
        type: DioExceptionType.unknown,
        message: 'Respuesta de refresh sin contenido',
      );
    }

    final nuevoAccess = datos['accessToken'] as String;
    final nuevoRefresh = datos['refreshToken'] as String;
    await storage.guardarTokens(accessToken: nuevoAccess, refreshToken: nuevoRefresh);
    return nuevoAccess;
  }
}