import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/storage/token_storage.dart';
import '../models/usuario.dart';
import '../repositories/auth_repository.dart';

/// Proveedor del repositorio de auth (sobreescribible en tests).
final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.watch(apiClientProvider)),
);

/// Estados del ciclo de vida de la sesión.
enum EstadoAutenticacion { restaurando, noAutenticado, autenticado }

/// Estado de UI del feature AUTH (MVVM: ViewModel = Notifier de Riverpod).
class AuthState {
  const AuthState({
    required this.estado,
    this.usuario,
    this.error,
    this.cargando = false,
  });

  final EstadoAutenticacion estado;
  final Usuario? usuario;

  /// Mensaje de error en español para mostrar al usuario (null si no hay error).
  final String? error;

  /// True mientras una operación (login/registro) está en vuelo.
  final bool cargando;

  AuthState copyWith({
    EstadoAutenticacion? estado,
    Usuario? usuario,
    String? Function()? error,
    bool? cargando,
  }) {
    return AuthState(
      estado: estado ?? this.estado,
      usuario: usuario ?? this.usuario,
      error: error != null ? error() : this.error,
      cargando: cargando ?? this.cargando,
    );
  }
}

/// ViewModel de autenticación (T-S1.12): flujos login, registro,
/// restauración de sesión, cierre de sesión y salida por sesión inválida.
class AuthViewModel extends Notifier<AuthState> {
  @override
  AuthState build() {
    return const AuthState(estado: EstadoAutenticacion.restaurando);
  }

  AuthRepository get _repository => ref.read(authRepositoryProvider);
  TokenStorage get _storage => ref.read(tokenStorageProvider);

  /// Restaura la sesión guardada (T-S1.12): si hay tokens, valida el access
  /// contra `/auth/me` (el interceptor rota el refresh si hace falta, T-S1.13).
  Future<void> restaurarSesion() async {
    state = const AuthState(estado: EstadoAutenticacion.restaurando);
    final tokens = await _storage.leerTokens();
    if (tokens == null) {
      state = const AuthState(estado: EstadoAutenticacion.noAutenticado);
      return;
    }

    try {
      final usuario = await _repository.obtenerPerfil();
      state = AuthState(estado: EstadoAutenticacion.autenticado, usuario: usuario);
    } on ApiException catch (e) {
      if (e.statusCode == 401) {
        // Access expirado y refresh inválido: sesión irrecuperable.
        await _storage.limpiar();
        state = const AuthState(estado: EstadoAutenticacion.noAutenticado);
      } else {
        // Error de red u otro: no se descarta la sesión guardada; se lleva al
        // usuario al login con el motivo (podrá reintentar).
        state = AuthState(estado: EstadoAutenticacion.noAutenticado, error: e.mensaje);
      }
    } catch (_) {
      state = const AuthState(estado: EstadoAutenticacion.noAutenticado);
    }
  }

  /// RF-02 — Inicia sesión y guarda los tokens en el almacén seguro.
  /// Devuelve `true` si la sesión quedó iniciada.
  Future<bool> iniciarSesion({required String email, required String password}) async {
    state = state.copyWith(cargando: true, error: () => null);
    try {
      final sesion = await _repository.iniciarSesion(email: email, password: password);
      await _storage.guardarTokens(
        accessToken: sesion.accessToken,
        refreshToken: sesion.refreshToken,
      );
      state = AuthState(estado: EstadoAutenticacion.autenticado, usuario: sesion.usuario);
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(
        estado: EstadoAutenticacion.noAutenticado,
        cargando: false,
        error: () => e.mensaje,
      );
      return false;
    } catch (_) {
      state = state.copyWith(
        estado: EstadoAutenticacion.noAutenticado,
        cargando: false,
        error: () => 'Ocurrió un error inesperado. Inténtalo de nuevo.',
      );
      return false;
    }
  }

  /// RF-01 — Registro de estudiante/docente (valores ya validados en la vista).
  Future<bool> registrar({
    required String email,
    required String password,
    required RolUsuario rol,
    required String nombres,
    required String apellidos,
    String? codigoUcv,
    String? telefono,
  }) async {
    state = state.copyWith(cargando: true, error: () => null);
    try {
      final sesion = await _repository.registrar(
        email: email,
        password: password,
        rol: rol.valor,
        nombres: nombres,
        apellidos: apellidos,
        codigoUcv: codigoUcv,
        telefono: telefono,
      );
      await _storage.guardarTokens(
        accessToken: sesion.accessToken,
        refreshToken: sesion.refreshToken,
      );
      state = AuthState(estado: EstadoAutenticacion.autenticado, usuario: sesion.usuario);
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(
        estado: EstadoAutenticacion.noAutenticado,
        cargando: false,
        error: () => e.mensaje,
      );
      return false;
    } catch (_) {
      state = state.copyWith(
        estado: EstadoAutenticacion.noAutenticado,
        cargando: false,
        error: () => 'Ocurrió un error inesperado. Inténtalo de nuevo.',
      );
      return false;
    }
  }

  /// RF-02 — Cierra sesión: revoca el refresh en el backend (best effort)
  /// y limpia los tokens locales.
  Future<void> cerrarSesion() async {
    final tokens = await _storage.leerTokens();
    if (tokens != null) {
      try {
        await _repository.cerrarSesion(tokens.refreshToken);
      } on ApiException {
        // Best effort: aunque el backend esté caído la sesión local se cierra.
      } catch (_) {
        // Ídem.
      }
    }
    await _storage.limpiar();
    state = const AuthState(estado: EstadoAutenticacion.noAutenticado);
  }

  /// Invocado por el interceptor (T-S1.13) cuando el refresh es rechazado
  /// (reuso detectado / expiración): sesión inválida → volver al login.
  void sesionInvalida() {
    state = const AuthState(
      estado: EstadoAutenticacion.noAutenticado,
      error: 'Tu sesión expiró. Inicia sesión de nuevo.',
    );
  }
}

/// Proveedor del estado de autenticación (leído por el router y las vistas).
final authStateProvider =
    NotifierProvider<AuthViewModel, AuthState>(AuthViewModel.new);