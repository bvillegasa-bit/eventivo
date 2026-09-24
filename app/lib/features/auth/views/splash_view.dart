import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/viewmodels/auth_viewmodel.dart';

/// Pantalla de arranque (T-S1.12): restaura la sesión guardada una sola vez.
/// El router redirige automáticamente a `/login` o `/inicio` según el resultado.
class SplashView extends ConsumerStatefulWidget {
  const SplashView({super.key});

  @override
  ConsumerState<SplashView> createState() => _SplashViewState();
}

class _SplashViewState extends ConsumerState<SplashView> {
  @override
  void initState() {
    super.initState();
    // Se dispara tras el primer frame para no bloquear la ruta inicial.
    Future.microtask(() => ref.read(authStateProvider.notifier).restaurarSesion());
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.school, size: 72, color: Color(0xFFB0202A)),
            SizedBox(height: 16),
            Text('EVENTIVO', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
            SizedBox(height: 8),
            Text('Eventos académicos UCV'),
            SizedBox(height: 24),
            CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}