import 'package:eventivo/core/storage/token_storage.dart';

/// Fake de [TokenStorage] en memoria (flutter_secure_storage usa canales
/// nativos y no está disponible en `flutter test`).
class FakeTokenStorage implements TokenStorage {
  FakeTokenStorage({this.tokens});

  TokensAlmacenados? tokens;
  int guardados = 0;
  int limpiadas = 0;

  @override
  Future<void> guardarTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    tokens = TokensAlmacenados(accessToken: accessToken, refreshToken: refreshToken);
    guardados++;
  }

  @override
  Future<TokensAlmacenados?> leerTokens() async => tokens;

  @override
  Future<void> limpiar() async {
    tokens = null;
    limpiadas++;
  }
}

/// Usuario de prueba (PerfilPublico del backend).
const usuarioJson = {
  'id': 'a1b2c3d4-e5f6-7890-abcd-ef0123456789',
  'email': 'alumno@ucv.edu.pe',
  'rol': 'estudiante',
  'nombres': 'Ana',
  'apellidos': 'García',
  'codigoUcv': '2024001234',
  'telefono': '999888777',
  'activo': true,
  'creadoEn': '2026-09-20T14:30:00.000Z',
};

/// Respuesta de login/registro.
const sesionJson = {
  'accessToken': 'access-nuevo',
  'refreshToken': 'refresh-nuevo',
  'usuario': usuarioJson,
};