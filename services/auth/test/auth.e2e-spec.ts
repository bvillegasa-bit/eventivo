/**
 * E2E del auth-service contra PostgreSQL real (docker-compose.dev o CI).
 *
 * PRERREQUISITOS (ver README.md):
 *   docker compose -f docker/docker-compose.dev.yml up -d auth-db
 *   cp .env.example .env   (el spec lee DATABASE_URL o DB_* de las variables)
 *
 * RF-01 escenarios 1-4 y RF-02 (login, rotación, reuso, logout) + RBAC.
 */

// El entorno DEBE quedar definido antes de importar AppModule (migraciones y Joi).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'clave-e2e-segura-para-pruebas-locales-123456';
process.env.JWT_ISSUER = 'https://api.eventivo.ucv.edu.pe';
process.env.JWT_AUDIENCE = 'eventivo-app';
process.env.X_SERVICE_KEY = 'clave-x-service-e2e-eventivo';
process.env.LOGIN_RATE_LIMIT_LIMIT = '10';
process.env.LOGIN_RATE_LIMIT_TTL_MS = '900000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { RolUsuario, Usuario } from '../src/auth/entities/usuario.entity';

function emailUnico(prefijo: string): string {
  return `${prefijo}-${randomUUID().slice(0, 8)}@eventivo.ucv.edu.pe`;
}

const PASSWORD_VALIDA = 'ClaveSegura123!';

describe('auth-service E2E (RF-01, RF-02, RBAC)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('responde 200 con estado ok', async () => {
      const respuesta = await http.get('/health').expect(200);
      expect(respuesta.body.estado).toBe('ok');
      expect(respuesta.body.servicio).toBe('auth');
    });
  });

  describe('RF-01 /auth/registro', () => {
    it('escenario 1: registro válido responde 201 con access + refresh + perfil (sin hash)', async () => {
      const respuesta = await http
        .post('/auth/registro')
        .send({
          email: emailUnico('feliz'),
          password: PASSWORD_VALIDA,
          rol: 'docente',
          nombres: 'Carlos',
          apellidos: 'Ramírez',
        })
        .expect(201);

      expect(respuesta.body.accessToken).toBeDefined();
      expect(respuesta.body.refreshToken).toBeDefined();
      expect(respuesta.body.usuario.rol).toBe('docente');
      expect(respuesta.body.usuario.email).toBeDefined();
      expect(JSON.stringify(respuesta.body)).not.toContain('passwordHash');
    });

    it('escenario 2: email duplicado responde 409 con mensaje genérico', async () => {
      const email = emailUnico('duplicado');
      await http
        .post('/auth/registro')
        .send({ email, password: PASSWORD_VALIDA, rol: 'estudiante', nombres: 'A', apellidos: 'B' })
        .expect(201);

      const respuesta = await http
        .post('/auth/registro')
        .send({ email: email.toUpperCase(), password: PASSWORD_VALIDA, rol: 'estudiante', nombres: 'A', apellidos: 'B' })
        .expect(409);

      expect(respuesta.body.message).toContain('No se pudo completar el registro');
    });

    it('escenario 3: validación — email inválido y contraseña corta → 400 con detalle por campo', async () => {
      const respuesta = await http
        .post('/auth/registro')
        .send({
          email: 'no-es-un-email',
          password: 'corta',
          rol: 'estudiante',
          nombres: 'A',
          apellidos: 'B',
        })
        .expect(400);

      expect(Array.isArray(respuesta.body.message)).toBe(true);
      expect(respuesta.body.message.length).toBeGreaterThanOrEqual(2);
      expect(
        respuesta.body.message.some((m: string) => m.includes('al menos 8')),
      ).toBe(true);
    });

    it('escenario 4: rol administrativo → 403 y NO crea la cuenta', async () => {
      const email = emailUnico('prohibido');
      const respuesta = await http
        .post('/auth/registro')
        .send({ email, password: PASSWORD_VALIDA, rol: 'administrativo', nombres: 'A', apellidos: 'B' })
        .expect(403);

      expect(respuesta.body.message).toContain('administrativo');
      // La cuenta no existe: login con esas credenciales falla con 401.
      await http
        .post('/auth/login')
        .send({ email, password: PASSWORD_VALIDA })
        .expect(401);
    });
  });

  describe('RF-02 /auth/login', () => {
    let credenciales: { email: string; password: string };

    beforeAll(async () => {
      credenciales = { email: emailUnico('login'), password: PASSWORD_VALIDA };
      await http
        .post('/auth/registro')
        .send({ ...credenciales, rol: 'estudiante', nombres: 'Ana', apellidos: 'García' })
        .expect(201);
    });

    it('login correcto → 200 con par de tokens y perfil', async () => {
      const respuesta = await http.post('/auth/login').send(credenciales).expect(200);
      expect(respuesta.body.accessToken).toBeDefined();
      expect(respuesta.body.refreshToken).toBeDefined();
      expect(respuesta.body.usuario.email).toBe(credenciales.email);
    });

    it('credenciales incorrectas → 401 con mensaje genérico', async () => {
      const respuesta = await http
        .post('/auth/login')
        .send({ email: credenciales.email, password: 'incorrecta' })
        .expect(401);
      expect(respuesta.body.message).toBe('Credenciales inválidas');
    });

    it('usuario inexistente → 401 idéntico al de contraseña mala (anti-enumeración)', async () => {
      const respuesta = await http
        .post('/auth/login')
        .send({ email: emailUnico('fantasma'), password: PASSWORD_VALIDA })
        .expect(401);
      expect(respuesta.body.message).toBe('Credenciales inválidas');
    });

    it('rate limiting: 10 intentos malos y el 11.º → 429 con Retry-After', async () => {
      const email = emailUnico('exceso');
      for (let i = 0; i < 10; i += 1) {
        await http.post('/auth/login').send({ email, password: 'mala' }).expect(401);
      }
      const respuesta = await http
        .post('/auth/login')
        .send({ email, password: 'mala' })
        .expect(429);
      expect(respuesta.headers['retry-after']).toBeDefined();
      expect(respuesta.body.message).toContain('Demasiados intentos');
    });
  });

  describe('Rutas protegidas y RBAC (T-S1.09)', () => {
    let accessEstudiante: string;
    let accessAdmin: string;

    beforeAll(async () => {
      const emailEstudiante = emailUnico('rbac-estudiante');
      await http
        .post('/auth/registro')
        .send({ email: emailEstudiante, password: PASSWORD_VALIDA, rol: 'estudiante', nombres: 'B', apellidos: 'C' })
        .expect(201);
      accessEstudiante = (await http.post('/auth/login').send({ email: emailEstudiante, password: PASSWORD_VALIDA }).expect(200)).body.accessToken as string;

      // El rol administrativo NO puede auto-registrarse (RF-01 esc. 4); se provisiona
      // vía repositorio directamente (mismo mecanismo que el seed de T-S1.10).
      const usuarios = app.get<Repository<Usuario>>(getRepositoryToken(Usuario));
      const admin = await usuarios.save(
        usuarios.create({
          email: emailUnico('rbac-admin'),
          passwordHash: await hash('ClaveAdminPrueba2026', 12),
          rol: RolUsuario.ADMINISTRATIVO,
          nombres: 'Admin',
          apellidos: 'Prueba RBAC',
          activo: true,
        }),
      );
      accessAdmin = (
        await http
          .post('/auth/login')
          .send({ email: admin.email, password: 'ClaveAdminPrueba2026' })
          .expect(200)
      ).body.accessToken as string;
    });

    it('GET /auth/me sin token → 401', async () => {
      await http.get('/auth/me').expect(401);
    });

    it('GET /auth/me con access válido → 200 y perfil sin hash', async () => {
      const respuesta = await http
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessEstudiante}`)
        .expect(200);
      expect(respuesta.body.rol).toBe('estudiante');
      expect(JSON.stringify(respuesta.body)).not.toContain('passwordHash');
    });

    it('GET /auth/admin-ping como estudiante → 403', async () => {
      const respuesta = await http
        .get('/auth/admin-ping')
        .set('Authorization', `Bearer ${accessEstudiante}`)
        .expect(403);
      expect(respuesta.body.message).toContain('permisos');
    });

    it('GET /auth/admin-ping como administrativo → 200', async () => {
      const respuesta = await http
        .get('/auth/admin-ping')
        .set('Authorization', `Bearer ${accessAdmin}`)
        .expect(200);
      expect(respuesta.body.mensaje).toContain('Acceso administrativo');
    });

    it('JWT con refresh token como Bearer → 401 (los refresh nunca autentican rutas)', async () => {
      const { body } = await http
        .post('/auth/registro')
        .send({ email: emailUnico('bearer-refresh'), password: PASSWORD_VALIDA, rol: 'estudiante', nombres: 'R', apellidos: 'T' })
        .expect(201);
      await http
        .get('/auth/me')
        .set('Authorization', `Bearer ${body.refreshToken}`)
        .expect(401);
    });
  });

  describe('RF-02 rotación de refresh (escenarios 3-4)', () => {
    let refreshVigente: string;

    beforeAll(async () => {
      const { body } = await http
        .post('/auth/registro')
        .send({
          email: emailUnico('rotacion'),
          password: PASSWORD_VALIDA,
          rol: 'estudiante',
          nombres: 'R',
          apellidos: 'S',
        })
        .expect(201);
      refreshVigente = body.refreshToken as string;
    });

    it('rotación válida → 200 con par nuevo (el refresh anterior queda invalidado)', async () => {
      const respuesta = await http
        .post('/auth/refresh')
        .send({ refreshToken: refreshVigente })
        .expect(200);

      expect(respuesta.body.accessToken).toBeDefined();
      expect(respuesta.body.refreshToken).toBeDefined();
      expect(respuesta.body.refreshToken).not.toBe(refreshVigente);

      // Reuso del token ya rotado → 401 y revocación de familia.
      await http.post('/auth/refresh').send({ refreshToken: refreshVigente }).expect(401);
    });

    it('reuso detectado revoca TAMBIÉN el refresh recién emitido (misma familia)', async () => {
      const { body: primer } = await http
        .post('/auth/registro')
        .send({
          email: emailUnico('familia'),
          password: PASSWORD_VALIDA,
          rol: 'docente',
          nombres: 'F',
          apellidos: 'G',
        })
        .expect(201);

      const { body: rotado } = await http
        .post('/auth/refresh')
        .send({ refreshToken: primer.refreshToken })
        .expect(200);

      // El token original se reusa → familia revocada.
      await http.post('/auth/refresh').send({ refreshToken: primer.refreshToken }).expect(401);
      // El token NUEVO de la misma familia también queda inutilizable.
      await http.post('/auth/refresh').send({ refreshToken: rotado.refreshToken }).expect(401);
    });

    it('logout revoca la sesión (refrescar tras logout → 401)', async () => {
      const { body } = await http
        .post('/auth/registro')
        .send({
          email: emailUnico('logout'),
          password: PASSWORD_VALIDA,
          rol: 'estudiante',
          nombres: 'L',
          apellidos: 'O',
        })
        .expect(201);

      await http.post('/auth/logout').send({ refreshToken: body.refreshToken }).expect(200);
      await http
        .post('/auth/refresh')
        .send({ refreshToken: body.refreshToken })
        .expect(401);
    });

    it('POST /auth/refresh con token basura → 401 genérico', async () => {
      const respuesta = await http
        .post('/auth/refresh')
        .send({ refreshToken: 'token-basura' })
        .expect(401);
      expect(respuesta.body.message).toBeDefined();
    });
  });

  describe('DTO estricto (R-07)', () => {
    it('rechaza campos no declarados en el payload (whitelist + forbidNonWhitelisted)', async () => {
      await http
        .post('/auth/registro')
        .send({
          email: emailUnico('extra'),
          password: PASSWORD_VALIDA,
          rol: 'estudiante',
          nombres: 'A',
          apellidos: 'B',
          rolExtra: 'superadmin',
        })
        .expect(400);
    });
  });

  describe('DT-02 /internal/auth/usuarios/:id (red interna, X-Service-Key)', () => {
    it('rechaza sin X-Service-Key → 403', async () => {
      await http.get('/internal/auth/usuarios/no-importa').expect(403);
    });

    it('rechaza con X-Service-Key incorrecta → 403', async () => {
      await http
        .get('/internal/auth/usuarios/no-importa')
        .set('x-service-key', 'clave-equivocada')
        .expect(403);
    });

    it('responde 404 si el usuario no existe (aunque la clave sea válida)', async () => {
      await http
        .get(`/internal/auth/usuarios/${randomUUID()}`)
        .set('x-service-key', process.env.X_SERVICE_KEY ?? '')
        .expect(404);
    });

    it('devuelve el perfil público del usuario con la clave correcta (sin hash)', async () => {
      const { body: registro } = await http
        .post('/auth/registro')
        .send({
          email: emailUnico('interno'),
          password: PASSWORD_VALIDA,
          rol: 'estudiante',
          nombres: 'I',
          apellidos: 'N',
        })
        .expect(201);

      const respuesta = await http
        .get(`/internal/auth/usuarios/${registro.usuario.id}`)
        .set('x-service-key', process.env.X_SERVICE_KEY ?? '')
        .expect(200);

      expect(respuesta.body.id).toBe(registro.usuario.id);
      expect(respuesta.body.email).toBe(registro.usuario.email);
      expect(JSON.stringify(respuesta.body)).not.toContain('passwordHash');
    });
  });
});