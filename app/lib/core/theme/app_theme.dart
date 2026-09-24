import 'package:flutter/material.dart';

/// Tema visual de EVENTIVO (Material 3, tono institucional UCV).
abstract final class AppTheme {
  /// Rojo institucional UCV.
  static const Color rojoUcv = Color(0xFFB0202A);

  static ThemeData get tema {
    final scheme = ColorScheme.fromSeed(seedColor: rojoUcv);
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      appBarTheme: const AppBarTheme(centerTitle: true),
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(48),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}