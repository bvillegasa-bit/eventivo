import 'usuario.dart';

/// Sesión iniciada: par de tokens (DT-05) + perfil del usuario.
///
/// Es la respuesta de `POST /auth/registro` y `POST /auth/login`
/// (ver `docs/api/auth.openapi.yaml`).
class Sesion {
  const Sesion({
    required this.accessToken,
    required this.refreshToken,
    required this.usuario,
  });

  final String accessToken;

  /// Refresh token ROTATIVO (7 días): cada uso emite uno nuevo.
  final String refreshToken;

  final Usuario usuario;

  factory Sesion.fromJson(Map<String, dynamic> json) => Sesion(
        accessToken: json['accessToken'] as String,
        refreshToken: json['refreshToken'] as String,
        usuario: Usuario.fromJson(json['usuario'] as Map<String, dynamic>),
      );
}