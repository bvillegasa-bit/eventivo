import 'package:eventivo/core/network/api_exception.dart';
import 'package:eventivo/core/providers.dart';
import 'package:eventivo/core/storage/token_storage.dart';
import 'package:eventivo/features/auth/models/usuario.dart';
import 'package:eventivo/features/perfil/repositories/perfil_repository.dart';
import 'package:eventivo/features/perfil/viewmodels/perfil_viewmodel.dart';
import 'package:eventivo/features/perfil/views/perfil_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'helpers/fakes.dart';

class MockPerfilRepository extends Mock implements PerfilRepository {}

void main() {
  late FakeTokenStorage storage;
  late MockPerfilRepository perfilRepo;

  Widget app() => ProviderScope(
        overrides: [
          tokenStorageProvider.overrideWithValue(storage),
          perfilRepositoryProvider.overrideWithValue(perfilRepo),
        ],
        child: const MaterialApp(home: PerfilView()),
      );

  setUp(() {
    storage = FakeTokenStorage(
      tokens: const TokensAlmacenados(accessToken: 'access-1', refreshToken: 'refresh-1'),
    );
    perfilRepo = MockPerfilRepository();
  });

  // El botón de cerrar sesión queda al final del ListView (fuera del viewport
  // de prueba): se hace scroll hasta que sea visible.
  Future<void> scrollAlCierre(WidgetTester tester) async {
    await tester.dragUntilVisible(
      find.text('Cerrar sesión'),
      find.byType(ListView),
      const Offset(0, -200),
    );
    await tester.pumpAndSettle();
  }

  group('PerfilView (T-S1.13)', () {
    testWidgets('carga y muestra el perfil del usuario', (tester) async {
      when(() => perfilRepo.obtenerPerfil()).thenAnswer(
        (_) async => Usuario.fromJson(usuarioJson),
      );
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();

      expect(find.text('Ana García'), findsOneWidget);
      expect(find.text('alumno@ucv.edu.pe'), findsOneWidget);
      expect(find.text('Estudiante'), findsOneWidget);
      expect(find.text('2024001234'), findsOneWidget);
      expect(find.text('Activo'), findsOneWidget);
      await scrollAlCierre(tester);
      expect(find.text('Cerrar sesión'), findsOneWidget);
    });

    testWidgets('demo RBAC: 403 → acceso denegado', (tester) async {
      when(() => perfilRepo.obtenerPerfil()).thenAnswer(
        (_) async => Usuario.fromJson(usuarioJson),
      );
      when(() => perfilRepo.verificarAccesoAdministrativo()).thenThrow(
        const ApiException('No tienes permisos para realizar esta acción.',
            statusCode: 403),
      );
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Verificar acceso administrativo'));
      await tester.pumpAndSettle();

      expect(
        find.textContaining('Acceso denegado'),
        findsOneWidget,
      );
      expect(
        find.textContaining('se requiere rol administrativo'),
        findsOneWidget,
      );
    });

    testWidgets('demo RBAC: 200 → acceso permitido', (tester) async {
      when(() => perfilRepo.obtenerPerfil()).thenAnswer(
        (_) async => Usuario.fromJson(usuarioJson),
      );
      when(() => perfilRepo.verificarAccesoAdministrativo())
          .thenAnswer((_) async {});
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Verificar acceso administrativo'));
      await tester.pumpAndSettle();

      expect(find.text('Acceso administrativo permitido'), findsOneWidget);
    });

    testWidgets('muestra error si no se puede cargar el perfil', (tester) async {
      when(() => perfilRepo.obtenerPerfil()).thenThrow(Exception('red caída'));
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();

      expect(find.textContaining('No se pudo cargar tu perfil'), findsOneWidget);
    });

    testWidgets('el botón de cerrar sesión confirma y limpia la sesión',
        (tester) async {
      when(() => perfilRepo.obtenerPerfil()).thenAnswer(
        (_) async => Usuario.fromJson(usuarioJson),
      );
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();
      await scrollAlCierre(tester);

      await tester.tap(find.text('Cerrar sesión'));
      await tester.pumpAndSettle();

      // Diálogo de confirmación.
      expect(find.text('¿Deseas cerrar tu sesión?'), findsOneWidget);
      await tester.tap(find.widgetWithText(FilledButton, 'Cerrar sesión'));
      await tester.pumpAndSettle();

      expect(storage.tokens, isNull);
    });
  });
}