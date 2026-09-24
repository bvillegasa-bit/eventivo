import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

/// Widget raíz de EVENTIVO (T-S1.11): enruta con GoRouter y aplica el tema.
class EventivoApp extends ConsumerWidget {
  const EventivoApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    return MaterialApp.router(
      title: 'EVENTIVO',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.tema,
      routerConfig: router,
    );
  }
}