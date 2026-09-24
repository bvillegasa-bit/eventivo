import 'package:dio/dio.dart';

/// Excepción de red/API con mensaje SIEMPRE en español y accionable (RF-20,
/// RNF 4.4). La capa ViewModel/View nunca ve `DioException` cruda.
class ApiException implements Exception {
  const ApiException(this.mensaje, {this.statusCode, this.detalles = const []});

  /// Mensaje en español listo para mostrar al usuario.
  final String mensaje;

  /// Código HTTP si la respuesta llegó (null en errores de red).
  final int? statusCode;

  /// Detalles por campo (respuestas 400 de NestJS).
  final List<String> detalles;

  /// Convierte un `DioException` en un mensaje de usuario en español.
  factory ApiException.desdeDio(DioException error) {
    final status = error.response?.statusCode;
    final data = error.response?.data;
    final esErrorRed = error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout ||
        error.type == DioExceptionType.connectionError;

    if (esErrorRed) {
      return const ApiException(
        'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.',
      );
    }

    // El backend responde en español: `{message: string | string[], statusCode}`.
    List<String> detalles = const [];
    String? mensajeServidor;
    if (data is Map<String, dynamic>) {
      final m = data['message'];
      if (m is List) {
        detalles = m.whereType<String>().toList();
      } else if (m is String && m.isNotEmpty) {
        mensajeServidor = m;
      }
    }

    final String mensaje;
    switch (status) {
      case 400:
        mensaje = detalles.isNotEmpty
            ? detalles.join('\n')
            : (mensajeServidor ?? 'Verifica los datos ingresados.');
      case 401:
        mensaje = mensajeServidor ??
            'Tus credenciales no son válidas o tu sesión expiró. Inicia sesión de nuevo.';
      case 403:
        mensaje = mensajeServidor ?? 'No tienes permisos para realizar esta acción.';
      case 404:
        mensaje = mensajeServidor ?? 'No se encontró lo solicitado.';
      case 409:
        mensaje = mensajeServidor ?? 'La operación no se pudo completar. Inténtalo de nuevo.';
      case 429:
        mensaje = mensajeServidor ??
            'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
      default:
        mensaje = mensajeServidor ?? 'Ocurrió un error inesperado. Inténtalo de nuevo.';
    }

    return ApiException(mensaje, statusCode: status, detalles: detalles);
  }

  @override
  String toString() => 'ApiException($statusCode): $mensaje';
}