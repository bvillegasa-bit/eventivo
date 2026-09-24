import 'package:eventivo/core/network/api_exception.dart';
import 'package:eventivo/core/providers.dart';
import 'package:eventivo/features/auth/models/sesion.dart';
import 'package:eventivo/features/auth/repositories/auth_repository.dart';
import 'package:eventivo/features/auth/viewmodels/auth_viewmodel.dart';
import 'package:eventivo/features/auth/views/registro_view.dart';
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
        child: const MaterialApp(home: RegistroView()),
      );

  setUp(() {
    storage = FakeTokenStorage();
    repo = MockAuthRepository();
  });

  // El formulario es alto: el botón "Crear cuenta" queda fuera del viewport
  // de prueba (800x600). Se hace scroll hasta él antes de tocar.
  Future<void> scrollAlBoton(WidgetTester tester) async {
    await tester.scrollUntilVisible(
      find.widgetWithText(FilledButton, 'Crear cuenta'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
  }

  group('RegistroView (RF-01)', () {
    testWidgets('muestra el formulario de registro', (tester) async {
      await tester.pumpWidget(app());

      expect(
        find.descendant(of: find.byType(AppBar), matching: find.text('Crear cuenta')),
        findsOneWidget,
      );
      expect(find.widgetWithText(FilledButton, 'Crear cuenta'), findsOneWidget);
      expect(find.text('Estudiante'), findsOneWidget);
      expect(find.text('Docente'), findsOneWidget);
      expect(find.text('Nombres'), findsOneWidget);
      expect(find.text('Apellidos'), findsOneWidget);
      expect(find.text('Correo institucional'), findsOneWidget);
    });

    testWidgets('valida campos obligatorios y contraseña corta', (tester) async {
      await tester.pumpWidget(app());

      await scrollAlBoton(tester);
      await tester.tap(find.widgetWithText(FilledButton, 'Crear cuenta'));
      await tester.pump();

      expect(find.text('Ingresa tus nombres'), findsWidgets);
      expect(find.text('Ingresa tus apellidos'), findsWidgets);
      expect(find.text('Ingresa tu correo'), findsOneWidget);
      expect(find.text('Ingresa una contraseña'), findsOneWidget);
    });

    testWidgets('contraseñas no coinciden no pasan la validación', (tester) async {
      await tester.pumpWidget(app());

      await tester.enterText(find.byType(TextFormField).at(2), 'alumno@ucv.edu.pe');
      await tester.enterText(find.byType(TextFormField).at(5), '12345678');
      await tester.enterText(find.byType(TextFormField).at(6), 'distinta');
      await scrollAlBoton(tester);
      await tester.tap(find.widgetWithText(FilledButton, 'Crear cuenta'));
      await tester.pump();

      expect(find.text('Las contraseñas no coinciden'), findsOneWidget);
    });

    testWidgets('registra estudiante con datos válidos', (tester) async {
      when(() => repo.registrar(
            email: any(named: 'email'),
            password: any(named: 'password'),
            rol: any(named: 'rol'),
            nombres: any(named: 'nombres'),
            apellidos: any(named: 'apellidos'),
            codigoUcv: any(named: 'codigoUcv'),
            telefono: any(named: 'telefono'),
          )).thenAnswer((_) async => Sesion.fromJson(sesionJson));
      await tester.pumpWidget(app());

      await tester.enterText(find.byType(TextFormField).at(0), 'Ana');
      await tester.enterText(find.byType(TextFormField).at(1), 'García');
      await tester.enterText(find.byType(TextFormField).at(2), 'alumno@ucv.edu.pe');
      await tester.enterText(find.byType(TextFormField).at(3), '2024001234');
      await tester.enterText(find.byType(TextFormField).at(4), '999888777');
      await tester.enterText(find.byType(TextFormField).at(5), '12345678');
      await tester.enterText(find.byType(TextFormField).at(6), '12345678');
      await scrollAlBoton(tester);
      await tester.tap(find.widgetWithText(FilledButton, 'Crear cuenta'));
      await tester.pumpAndSettle();

      verify(() => repo.registrar(
            email: 'alumno@ucv.edu.pe',
            password: '12345678',
            rol: 'estudiante',
            nombres: 'Ana',
            apellidos: 'García',
            codigoUcv: '2024001234',
            telefono: '999888777',
          )).called(1);
    });

    testWidgets('muestra el error 409 del backend', (tester) async {
      when(() => repo.registrar(
            email: any(named: 'email'),
            password: any(named: 'password'),
            rol: any(named: 'rol'),
            nombres: any(named: 'nombres'),
            apellidos: any(named: 'apellidos'),
            codigoUcv: any(named: 'codigoUcv'),
            telefono: any(named: 'telefono'),
          )).thenThrow(const ApiException('El correo ya está registrado.', statusCode: 409));
      await tester.pumpWidget(app());

      await tester.enterText(find.byType(TextFormField).at(0), 'Ana');
      await tester.enterText(find.byType(TextFormField).at(1), 'García');
      await tester.enterText(find.byType(TextFormField).at(2), 'duplicado@ucv.edu.pe');
      await tester.enterText(find.byType(TextFormField).at(5), '12345678');
      await tester.enterText(find.byType(TextFormField).at(6), '12345678');
      await scrollAlBoton(tester);
      await tester.tap(find.widgetWithText(FilledButton, 'Crear cuenta'));
      await tester.pumpAndSettle();

      expect(find.textContaining('ya está registrado'), findsOneWidget);
    });
  });
}