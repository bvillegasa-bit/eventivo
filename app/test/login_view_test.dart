import 'package:eventivo/core/network/api_exception.dart';
import 'package:eventivo/core/providers.dart';
import 'package:eventivo/features/auth/models/sesion.dart';
import 'package:eventivo/features/auth/repositories/auth_repository.dart';
import 'package:eventivo/features/auth/viewmodels/auth_viewmodel.dart';
import 'package:eventivo/features/auth/views/login_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'helpers/fakes.dart';

class MockAuthRepository extends Mock implements AuthRepository {}

void main() {
  late FakeTokenStorage storage;
  late MockAuthRepository repo;

  Widget app() => ProviderScope(
        overrides: [
          tokenStorageProvider.overrideWithValue(storage),
          authRepositoryProvider.overrideWithValue(repo),
        ],
        child: const MaterialApp(home: LoginView()),
      );

  setUp(() {
    storage = FakeTokenStorage();
    repo = MockAuthRepository();
  });

  group('LoginView (RF-02)', () {
    testWidgets('muestra el formulario de ingreso', (tester) async {
      await tester.pumpWidget(app());

      expect(find.text('Iniciar sesión'), findsOneWidget);
      expect(find.text('Correo institucional'), findsOneWidget);
      expect(find.text('Contraseña'), findsOneWidget);
      expect(find.text('Ingresar'), findsOneWidget);
    });

    testWidgets('valida campos vacíos', (tester) async {
      await tester.pumpWidget(app());

      await tester.tap(find.text('Ingresar'));
      await tester.pump();

      expect(find.text('Ingresa tu correo'), findsOneWidget);
      expect(find.text('Ingresa tu contraseña'), findsOneWidget);
      // No se llamó al repositorio.
      verifyNever(() => repo.iniciarSesion(
            email: any(named: 'email'),
            password: any(named: 'password'),
          ));
    });

    testWidgets('correo inválido no pasa la validación', (tester) async {
      await tester.pumpWidget(app());

      await tester.enterText(find.byType(TextFormField).at(0), 'correo-sin-formato');
      await tester.enterText(find.byType(TextFormField).at(1), '12345678');
      await tester.tap(find.text('Ingresar'));
      await tester.pump();

      expect(find.text('Ingresa un correo válido'), findsOneWidget);
    });

    testWidgets('envía credenciales al repositorio', (tester) async {
      when(() => repo.iniciarSesion(
            email: any(named: 'email'),
            password: any(named: 'password'),
          )).thenAnswer((_) async => Sesion.fromJson(sesionJson));
      await tester.pumpWidget(app());

      await tester.enterText(find.byType(TextFormField).at(0), 'alumno@ucv.edu.pe');
      await tester.enterText(find.byType(TextFormField).at(1), '12345678');
      await tester.tap(find.text('Ingresar'));
      await tester.pumpAndSettle();

      verify(() => repo.iniciarSesion(
            email: 'alumno@ucv.edu.pe',
            password: '12345678',
          )).called(1);
      // Los tokens quedaron guardados en el almacén seguro.
      expect(storage.tokens?.accessToken, 'access-nuevo');
    });

    testWidgets('muestra el error del backend al usuario', (tester) async {
      final error =
          'Tus credenciales no son válidas o tu sesión expiró. Inicia sesión de nuevo.';
      when(() => repo.iniciarSesion(
            email: any(named: 'email'),
            password: any(named: 'password'),
          )).thenThrow(ApiException(error, statusCode: 401));
      await tester.pumpWidget(app());

      await tester.enterText(find.byType(TextFormField).at(0), 'alumno@ucv.edu.pe');
      await tester.enterText(find.byType(TextFormField).at(1), 'incorrecta');
      await tester.tap(find.text('Ingresar'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Tus credenciales'), findsOneWidget);
    });
  });
}