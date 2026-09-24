import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/viewmodels/auth_viewmodel.dart';
import 'network/api_client.dart';
import 'storage/token_storage.dart';

/// Proveedores de la capa CORE (tokens seguros + cliente HTTP).
///
/// En tests se sobreescriben con fakes (p. ej. `FakeTokenStorage` de memoria),
/// ya que `flutter_secure_storage` requiere canales nativos.

/// Almacén de tokens (Keystore/Keychain) — sobreescribible en tests.
final tokenStorageProvider = Provider<TokenStorage>((ref) => SecureTokenStorage());

/// Cliente HTTP único. Ante reuso/expiración del refresh (401 en `/auth/refresh`),
/// el interceptor avisa al ViewModel de auth para cerrar la sesión (T-S1.13).
final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.watch(tokenStorageProvider);
  return ApiClient(
    storage: storage,
    onSesionInvalida: () {
      ref.read(authStateProvider.notifier).sesionInvalida();
    },
  );
});