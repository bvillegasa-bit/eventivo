import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/viewmodels/auth_viewmodel.dart';
import '../../features/auth/views/login_view.dart';
import '../../features/auth/views/registro_view.dart';
import '../../features/auth/views/splash_view.dart';
import '../../features/perfil/views/perfil_view.dart';
import '../../features/auth/views/home_view.dart';

/// Router de la app (T-S1.12): protege las rutas según el estado de la sesión.
///
/// Roles de las rutas:
///  - `/splash`   → punto de entrada; restaura la sesión guardada.
///  - `/login`, `/registro` → solo para usuarios NO autenticados.
///  - `/inicio`, `/perfil`  → solo para usuarios autenticados (shell con tabs).
final appRouterProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final estado = ref.read(authStateProvider).estado;
      final ubicacion = state.uri.path;

      switch (estado) {
        case EstadoAutenticacion.restaurando:
          return ubicacion == '/splash' ? null : '/splash';
        case EstadoAutenticacion.noAutenticado:
          if (ubicacion == '/login' || ubicacion == '/registro') return null;
          return '/login';
        case EstadoAutenticacion.autenticado:
          if (ubicacion == '/splash' || ubicacion == '/login' || ubicacion == '/registro') {
            return '/inicio';
          }
          return null;
      }
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashView()),
      GoRoute(path: '/login', builder: (_, __) => const LoginView()),
      GoRoute(path: '/registro', builder: (_, __) => const RegistroView()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            HomeView(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/inicio',
                builder: (_, __) => const InicioView(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/perfil', builder: (_, __) => const PerfilView()),
            ],
          ),
        ],
      ),
    ],
  );

  // Re-evalúa el redirect cuando cambia el estado de autenticación
  // (p. ej. tras restaurar sesión o cerrar sesión).
  ref.listen(authStateProvider, (prev, next) {
    if (prev?.estado != next.estado) router.refresh();
  });

  return router;
});