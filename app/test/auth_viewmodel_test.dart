import 'package:eventivo/core/network/api_exception.dart';
import 'package:eventivo/core/providers.dart';
import 'package:eventivo/core/storage/token_storage.dart';
import 'package:eventivo/features/auth/models/sesion.dart';
import 'package:eventivo/features/auth/models/usuario.dart';
import 'package:eventivo/features/auth/repositories/auth_repository.dart';
import 'package:eventivo/features/auth/viewmodels/auth_viewmodel.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'helpers/fakes.dart';

class MockAuthRepository extends Mock implements AuthRepository {}

void main() {
  late FakeTokenStorage storage;
  late MockAuthRepository repo;

  ProviderContainer crearContainer() => ProviderContainer(
        overrides: [
          tokenStorageProvider.overrideWithValue(storage),
          authRepositoryProvider.overrideWithValue(repo),
        ],
      );

  setUp(() {
    storage = FakeTokenStorage();
    repo = MockAuthRepository();
  });

  group('AuthViewModel (T-S1.12)', () {
    test('restaurarSesion sin tokens → noAutenticado', () async {
      final container = crearContainer();
      final vm = container.read(authStateProvider.notifier);

      await vm.restaurarSesion();

      expect(container.read(authStateProvider).estado,
          EstadoAutenticacion.noAutenticado);
    });

    test('restaurarSesion con tokens válidos → autenticado', () async {
      storage.tokens = const TokensAlmacenados(
          accessToken: 'access-1', refreshToken: 'refresh-1');
      when(() => repo.obtenerPerfil()).thenAnswer(
        (_) async => Usuario.fromJson(usuarioJson),
      );
      final container = crearContainer();
      final vm = container.read(authStateProvider.notifier);

      await vm.restaurarSesion();

      final estado = container.read(authStateProvider);
      expect(estado.estado, EstadoAutenticacion.autenticado);
      expect(estado.usuario?.email, 'alumno@ucv.edu.pe');
    });

    test('restaurarSesion con 401 → limpia storage y noAutenticado', () async {
      storage.tokens = const TokensAlmacenados(
          accessToken: 'access-viejo', refreshToken: 'refresh-viejo');
      when(() => repo.obtenerPerfil()).thenThrow(
        const ApiException('Sesión expirada', statusCode: 401),
      );
      final container = crearContainer();
      final vm = container.read(authStateProvider.notifier);

      await vm.restaurarSesion();

      expect(container.read(authStateProvider).estado,
          EstadoAutenticacion.noAutenticado);
      expect(storage.tokens, isNull);
    });

    test('restaurarSesion con error de red → noAutenticado con mensaje', () async {
      storage.tokens = const TokensAlmacenados(
          accessToken: 'access-1', refreshToken: 'refresh-1');
      when(() => repo.obtenerPerfil()).thenThrow(
        const ApiException('No se pudo conectar con el servidor.'),
      );
      final container = crearContainer();
      final vm = container.read(authStateProvider.notifier);

      await vm.restaurarSesion();

      final estado = container.read(authStateProvider);
      expect(estado.estado, EstadoAutenticacion.noAutenticado);
      expect(estado.error, isNotNull);
      // No se descartan los tokens: podría ser una caída temporal de red.
      expect(storage.tokens, isNotNull);
    });

    test('iniciarSesion exitoso → autenticado y tokens guardados', () async {
      when(() => repo.iniciarSesion(
            email: any(named: 'email'),
            password: any(named: 'password'),
          )).thenAnswer((_) async => Sesion.fromJson(sesionJson));
      final container = crearContainer();
      final vm = container.read(authStateProvider.notifier);

      final ok = await vm.iniciarSesion(email: 'alumno@ucv.edu.pe', password: '12345678');

      expect(ok, isTrue);
      expect(container.read(authStateProvider).estado,
          EstadoAutenticacion.autenticado);
      expect(storage.tokens?.accessToken, 'access-nuevo');
      expect(storage.tokens?.refreshToken, 'refresh-nuevo');
    });

    test('iniciarSesion con 401 → error visible y no autenticado', () async {
      when(() => repo.iniciarSesion(
            email: any(named: 'email'),
            password: any(named: 'password'),
          )).thenThrow(const ApiException('Credenciales inválidas', statusCode: 401));
      final container = crearContainer();
      final vm = container.read(authStateProvider.notifier);

      final ok = await vm.iniciarSesion(email: 'x@ucv.edu.pe', password: 'incorrecta');

      expect(ok, isFalse);
      final estado = container.read(authStateProvider);
      expect(estado.estado, EstadoAutenticacion.noAutenticado);
      expect(estado.error, contains('Credenciales'));
      expect(estado.cargando, isFalse);
      expect(storage.tokens, isNull);
    });

    test('registrar exitoso → autenticado con el perfil del backend', () async {
      when(() => repo.registrar(
            email: any(named: 'email'),
            password: any(named: 'password'),
            rol: any(named: 'rol'),
            nombres: any(named: 'nombres'),
            apellidos: any(named: 'apellidos'),
            codigoUcv: any(named: 'codigoUcv'),
            telefono: any(named: 'telefono'),
          )).thenAnswer((_) async => Sesion.fromJson(sesionJson));
      final container = crearContainer();
      final vm = container.read(authStateProvider.notifier);

      final ok = await vm.registrar(
        email: 'alumno@ucv.edu.pe',
        password: '12345678',
        rol: RolUsuario.estudiante,
        nombres: 'Ana',
        apellidos: 'García',
        codigoUcv: '2024001234',
        telefono: '999888777',
      );

      expect(ok, isTrue);
      final estado = container.read(authStateProvider);
      expect(estado.estado, EstadoAutenticacion.autenticado);
      expect(estado.usuario?.rol, RolUsuario.estudiante);
      expect(storage.tokens?.refreshToken, 'refresh-nuevo');
    });

    test('registrar con 409 → error mostrado', () async {
      when(() => repo.registrar(
            email: any(named: 'email'),
            password: any(named: 'password'),
            rol: any(named: 'rol'),
            nombres: any(named: 'nombres'),
            apellidos: any(named: 'apellidos'),
            codigoUcv: any(named: 'codigoUcv'),
            telefono: any(named: 'telefono'),
          )).thenThrow(const ApiException('El correo ya está registrado.', statusCode: 409));
      final container = crearContainer();
      final vm = container.read(authStateProvider.notifier);

      final ok = await vm.registrar(
        email: 'duplicado@ucv.edu.pe',
        password: '12345678',
        rol: RolUsuario.docente,
        nombres: 'Luis',
        apellidos: 'Pérez',
      );

      expect(ok, isFalse);
      expect(container.read(authStateProvider).error, contains('ya está registrado'));
    });

    test('cerrarSesion → revoca refresh, limpia storage y noAutenticado', () async {
      storage.tokens = const TokensAlmacenados(
          accessToken: 'access-1', refreshToken: 'refresh-1');
      when(() => repo.cerrarSesion(any())).thenAnswer((_) async {});
      final container = crearContainer();
      final vm = container.read(authStateProvider.notifier);

      await vm.cerrarSesion();

      verify(() => repo.cerrarSesion('refresh-1')).called(1);
      expect(storage.tokens, isNull);
      expect(container.read(authStateProvider).estado,
          EstadoAutenticacion.noAutenticado);
    });

    test('sesionInvalida → noAutenticado con mensaje de expiración', () {
      final container = crearContainer();
      final vm = container.read(authStateProvider.notifier);

      vm.sesionInvalida();

      final estado = container.read(authStateProvider);
      expect(estado.estado, EstadoAutenticacion.noAutenticado);
      expect(estado.error, contains('expiró'));
    });
  });
}