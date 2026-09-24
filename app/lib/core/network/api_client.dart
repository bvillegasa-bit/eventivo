import 'package:dio/dio.dart';

import '../config/api_config.dart';
import '../storage/token_storage.dart';
import 'auth_interceptor.dart';

/// Cliente HTTP único de la app (capa core, T-S1.11/T-S1.13).
///
/// Expone un `Dio` con el interceptor de JWT+refresh y un `Dio` "pelado"
/// reservado exclusivamente para `POST /auth/refresh` (sin interceptor,
/// para evitar recursión).
class ApiClient {
  ApiClient({required TokenStorage storage, required void Function() onSesionInvalida}) {
    final opciones = BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: ApiConfig.timeoutConexion,
      receiveTimeout: ApiConfig.timeoutRespuesta,
      headers: const {'Accept': 'application/json'},
      contentType: Headers.jsonContentType,
    );

    _dio = Dio(opciones);
    _dio.interceptors.add(AuthInterceptor(
      dio: _dio,
      refreshDio: _dioRefresh,
      storage: storage,
      onSesionInvalida: onSesionInvalida,
    ));
  }

  late final Dio _dio;

  /// Dio sin interceptor para `/auth/refresh` (T-S1.13).
  late final Dio _dioRefresh = Dio(
    BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: ApiConfig.timeoutConexion,
      receiveTimeout: ApiConfig.timeoutRespuesta,
      headers: const {'Accept': 'application/json'},
      contentType: Headers.jsonContentType,
    ),
  );

  /// Cliente principal de la app (Bearer + refresh automático).
  Dio get dio => _dio;
}