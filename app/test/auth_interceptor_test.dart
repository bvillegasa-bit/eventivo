import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:eventivo/core/network/auth_interceptor.dart';
import 'package:eventivo/core/storage/token_storage.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/fakes.dart';

/// Adaptador HTTP falso: responde según la URL y el header Authorization.
class _AdapterFake implements HttpClientAdapter {
  _AdapterFake(this._manejador);

  final Future<ResponseBody> Function(RequestOptions opciones) _manejador;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) {
    return _manejador(options);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody _json(Object datos, int status) => ResponseBody.fromString(
      jsonEncode(datos),
      status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );

void main() {
  group('AuthInterceptor (T-S1.13)', () {
    late FakeTokenStorage storage;
    late Dio dio;
    late Dio refreshDio;
    late List<String> refreshes;
    bool sesionInvalidada = false;

    setUp(() {
      storage = FakeTokenStorage(
        tokens: const TokensAlmacenados(accessToken: 'access-1', refreshToken: 'refresh-1'),
      );
      refreshes = [];
      sesionInvalidada = false;

      refreshDio = Dio(BaseOptions(baseUrl: 'http://test'));
      refreshDio.httpClientAdapter = _AdapterFake((opciones) async {
        refreshes.add(opciones.path);
        if (opciones.path == '/auth/refresh') {
          return _json({'accessToken': 'access-2', 'refreshToken': 'refresh-2'}, 200);
        }
        return _json({'message': 'Not Found', 'statusCode': 404}, 404);
      });

      dio = Dio(BaseOptions(baseUrl: 'http://test'));
      dio.interceptors.add(AuthInterceptor(
        dio: dio,
        refreshDio: refreshDio,
        storage: storage,
        onSesionInvalida: () => sesionInvalidada = true,
      ));
    });

    test('adjunta el Bearer si hay tokens guardados', () async {
      late RequestOptions visto;
      dio.httpClientAdapter = _AdapterFake((opciones) async {
        visto = opciones;
        return _json({'message': 'ok'}, 200);
      });

      await dio.get('/auth/me');

      expect(visto.headers['Authorization'], 'Bearer access-1');
    });

    test('401 → rota refresh y reintenta con el access nuevo', () async {
      final autorizaciones = <String?>[];
      dio.httpClientAdapter = _AdapterFake((opciones) async {
        autorizaciones.add(opciones.headers['Authorization'] as String?);
        if (opciones.path == '/auth/me' &&
            opciones.headers['Authorization'] == 'Bearer access-2') {
          return _json(usuarioJson, 200);
        }
        return _json({'message': 'Token expirado', 'statusCode': 401}, 401);
      });

      final respuesta = await dio.get<Map<String, dynamic>>('/auth/me');

      expect(refreshes, ['/auth/refresh']);
      expect(autorizaciones, ['Bearer access-1', 'Bearer access-2']);
      expect(respuesta.data?['email'], 'alumno@ucv.edu.pe');
      // El interceptor guardó el par rotado.
      expect(storage.tokens?.accessToken, 'access-2');
      expect(storage.tokens?.refreshToken, 'refresh-2');
      expect(sesionInvalidada, isFalse);
    });

    test('single-flight: dos 401 simultáneos → un solo refresh', () async {
      dio.httpClientAdapter = _AdapterFake((opciones) async {
        if (opciones.path == '/auth/me' &&
            opciones.headers['Authorization'] == 'Bearer access-2') {
          return _json(usuarioJson, 200);
        }
        return _json({'message': 'Token expirado', 'statusCode': 401}, 401);
      });

      await Future.wait([
        dio.get('/auth/me'),
        dio.get('/auth/me'),
        dio.get('/auth/me'),
      ]);

      expect(refreshes.length, 1);
      expect(storage.tokens?.refreshToken, 'refresh-2');
    });

    test('401 en /auth/login NO dispara refresh', () async {
      dio.httpClientAdapter = _AdapterFake((opciones) async {
        return _json({'message': 'Credenciales inválidas', 'statusCode': 401}, 401);
      });

      await expectLater(
        dio.post('/auth/login', data: {'email': 'x@ucv.edu.pe', 'password': 'nope'}),
        throwsA(isA<DioException>()),
      );

      expect(refreshes, isEmpty);
      expect(storage.tokens, isNotNull); // los tokens guardados se conservan
    });

    test('refresh rechazado (401) → limpia storage y avisa sesión inválida', () async {
      refreshDio.httpClientAdapter = _AdapterFake((opciones) async {
        return _json({'message': 'Refresh inválido o reutilizado', 'statusCode': 401}, 401);
      });
      dio.httpClientAdapter = _AdapterFake((opciones) async {
        return _json({'message': 'Token expirado', 'statusCode': 401}, 401);
      });

      await expectLater(
        dio.get('/auth/me'),
        throwsA(isA<DioException>()),
      );

      expect(storage.tokens, isNull);
      expect(limpiadasde(storage), 1);
      expect(sesionInvalidada, isTrue);
    });

    test('petición ya reintentada no vuelve a refrescar (evita bucles)', () async {
      final autorizaciones = <String?>[];
      dio.httpClientAdapter = _AdapterFake((opciones) async {
        autorizaciones.add(opciones.headers['Authorization'] as String?);
        return _json({'message': 'Token expirado', 'statusCode': 401}, 401);
      });

      await expectLater(
        dio.get('/auth/me'),
        throwsA(isA<DioException>()),
      );

      // Primera vez: refresh + reintento (marcado). El reintento falla de nuevo
      // pero YA no refresca (una sola llamada a refresh).
      expect(refreshes, ['/auth/refresh']);
      expect(autorizaciones.length, 2);
      expect(autorizaciones.last, 'Bearer access-2');
    });
  });
}

int limpiadasde(FakeTokenStorage storage) => storage.limpiadas;