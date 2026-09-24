import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../auth/models/usuario.dart';
import '../repositories/perfil_repository.dart';

/// Proveedor del repositorio de perfil (sobreescribible en tests).
final perfilRepositoryProvider = Provider<PerfilRepository>(
  (ref) => PerfilRepository(ref.watch(apiClientProvider)),
);

/// Estado de UI del feature PERFIL.
class PerfilState {
  const PerfilState({
    this.usuario,
    this.cargando = true,
    this.error,
    this.elRolPermiteAdmin,
  });

  final Usuario? usuario;
  final bool cargando;
  final String? error;

  /// Resultado de la demo `admin-ping`: `null` = sin probar, `true` = acceso
  /// concedido, `false` = 403 (rol insuficiente).
  final bool? elRolPermiteAdmin;

  PerfilState copyWith({
    Usuario? usuario,
    bool? cargando,
    String? Function()? error,
    bool? Function()? elRolPermiteAdmin,
  }) {
    return PerfilState(
      usuario: usuario ?? this.usuario,
      cargando: cargando ?? this.cargando,
      error: error != null ? error() : this.error,
      elRolPermiteAdmin:
          elRolPermiteAdmin != null ? elRolPermiteAdmin() : this.elRolPermiteAdmin,
    );
  }
}

/// ViewModel del perfil (T-S1.13): carga el perfil y la demo de RBAC.
class PerfilViewModel extends Notifier<PerfilState> {
  @override
  PerfilState build() {
    return const PerfilState();
  }

  PerfilRepository get _repository => ref.read(perfilRepositoryProvider);

  Future<void> cargarPerfil() async {
    state = const PerfilState(cargando: true);
    try {
      final usuario = await _repository.obtenerPerfil();
      state = PerfilState(usuario: usuario, cargando: false);
    } catch (e) {
      state = PerfilState(
        cargando: false,
        error: 'No se pudo cargar tu perfil: $e',
      );
    }
  }

  /// Demo de control de acceso por rol (admin-ping): si el rol no es
  /// administrativo el backend devuelve 403 (DF-16).
  Future<void> verificarAccesoAdministrativo() async {
    try {
      await _repository.verificarAccesoAdministrativo();
      state = state.copyWith(elRolPermiteAdmin: () => true);
    } on ApiException {
      state = state.copyWith(elRolPermiteAdmin: () => false);
    } catch (_) {
      state = state.copyWith(error: () => 'No se pudo verificar el acceso.');
    }
  }

  void limpiarResultadoAdmin() {
    state = state.copyWith(elRolPermiteAdmin: () => null);
  }
}

/// Proveedor del estado del perfil.
final perfilStateProvider =
    NotifierProvider<PerfilViewModel, PerfilState>(PerfilViewModel.new);