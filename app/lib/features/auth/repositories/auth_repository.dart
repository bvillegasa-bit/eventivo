import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../models/sesion.dart';
import '../models/usuario.dart';

/// Repositorio del feature AUTH (RF-01/RF-02): consume el auth-service
/// a través del gateway (`/auth/*`) mapeando DTO ↔ Model (MVVM, design §8).
class AuthRepository {
  AuthRepository(this._client);

  final ApiClient _client;

  /// POST /auth/login — inicia sesión (RF-02).
  Future<Sesion> iniciarSesion({
    required String email,
    required String password,
  }) async {
    try {
      final respuesta = await _client.dio.post<Map<String, dynamic>>(
        '/auth/login',
        data: {'email': email.trim(), 'password': password},
      );
      return Sesion.fromJson(respuesta.data!);
    } on DioException catch (e) {
      throw ApiException.desdeDio(e);
    }
  }

  /// POST /auth/registro — crea cuenta estudiante/docente (RF-01).
  Future<Sesion> registrar({
    required String email,
    required String password,
    required String rol,
    required String nombres,
    required String apellidos,
    String? codigoUcv,
    String? telefono,
  }) async {
    try {
      final respuesta = await _client.dio.post<Map<String, dynamic>>(
        '/auth/registro',
        data: {
          'email': email.trim(),
          'password': password,
          'rol': rol,
          'nombres': nombres.trim(),
          'apellidos': apellidos.trim(),
          if (codigoUcv != null && codigoUcv.trim().isNotEmpty) 'codigoUcv': codigoUcv.trim(),
          if (telefono != null && telefono.trim().isNotEmpty) 'telefono': telefono.trim(),
        },
      );
      return Sesion.fromJson(respuesta.data!);
    } on DioException catch (e) {
      throw ApiException.desdeDio(e);
    }
  }

  /// POST /auth/logout — revoca la familia de refresh tokens (RF-02).
  Future<void> cerrarSesion(String refreshToken) async {
    try {
      await _client.dio.post<Map<String, dynamic>>(
        '/auth/logout',
        data: {'refreshToken': refreshToken},
      );
    } on DioException catch (e) {
      throw ApiException.desdeDio(e);
    }
  }

  /// GET /auth/me — perfil propio (sin password_hash).
  Future<Usuario> obtenerPerfil() async {
    try {
      final respuesta = await _client.dio.get<Map<String, dynamic>>('/auth/me');
      return Usuario.fromJson(respuesta.data!);
    } on DioException catch (e) {
      throw ApiException.desdeDio(e);
    }
  }
}