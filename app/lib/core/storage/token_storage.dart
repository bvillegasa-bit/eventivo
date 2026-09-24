import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Par de tokens almacenados (DT-05: access corto + refresh rotativo).
class TokensAlmacenados {
  const TokensAlmacenados({required this.accessToken, required this.refreshToken});

  final String accessToken;
  final String refreshToken;
}

/// Contrato de almacenamiento de tokens (T-S1.11, capa core).
///
/// Expuesto como interfaz para poder usar un fake en memoria en los tests
/// (flutter_secure_storage usa canales nativos, no disponibles en `flutter test`).
abstract class TokenStorage {
  Future<void> guardarTokens({required String accessToken, required String refreshToken});
  Future<TokensAlmacenados?> leerTokens();
  Future<void> limpiar();
}

/// Implementación real: `flutter_secure_storage` (Keystore / Keychain).
///
/// Seguridad de la app (design §6): los JWT NUNCA se guardan en
/// SharedPreferences ni en logs; solo en el almacén seguro del SO.
class SecureTokenStorage implements TokenStorage {
  SecureTokenStorage({FlutterSecureStorage? storage})
      : _storage =
            storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            );

  static const _claveAccess = 'access_token';
  static const _claveRefresh = 'refresh_token';

  final FlutterSecureStorage _storage;

  @override
  Future<void> guardarTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: _claveAccess, value: accessToken);
    await _storage.write(key: _claveRefresh, value: refreshToken);
  }

  @override
  Future<TokensAlmacenados?> leerTokens() async {
    final access = await _storage.read(key: _claveAccess);
    final refresh = await _storage.read(key: _claveRefresh);
    if (access == null || refresh == null || access.isEmpty || refresh.isEmpty) {
      return null;
    }
    return TokensAlmacenados(accessToken: access, refreshToken: refresh);
  }

  @override
  Future<void> limpiar() async {
    await _storage.delete(key: _claveAccess);
    await _storage.delete(key: _claveRefresh);
  }
}