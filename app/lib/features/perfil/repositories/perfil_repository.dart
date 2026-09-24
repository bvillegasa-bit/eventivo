import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../auth/models/usuario.dart';

/// Repositorio del feature PERFIL: consume endpoints de identidad
/// (`/auth/me` y `/auth/admin-ping`) — T-S1.13.
class PerfilRepository {
  PerfilRepository(this._client);

  final ApiClient _client;

  /// GET /auth/me — perfil propio.
  Future<Usuario> obtenerPerfil() async {
    try {
      final respuesta = await _client.dio.get<Map<String, dynamic>>('/auth/me');
      return Usuario.fromJson(respuesta.data!);
    } on DioException catch (e) {
      throw ApiException.desdeDio(e);
    }
  }

  /// GET /auth/admin-ping — fixture de RBAC (DF-16): 403 si el rol no es
  /// administrativo. Se usa como "demo" del control de acceso por rol.
  Future<void> verificarAccesoAdministrativo() async {
    try {
      await _client.dio.get<Map<String, dynamic>>('/auth/admin-ping');
    } on DioException catch (e) {
      throw ApiException.desdeDio(e);
    }
  }
}