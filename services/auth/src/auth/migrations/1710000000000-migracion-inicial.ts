import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T-S1.05 — Migración inicial de auth_db:
 * - extensión citext (email UNIQUE insensible a mayúsculas)
 * - tipo enumerado rol_usuario
 * - tabla usuarios (password_hash select:false a nivel de entidad)
 * - tabla token_sesiones (hash de refresh, DT-05)
 * Índices: UNIQUE(email), IDX(rol), IDX(usuario_id, revocado), IDX(familia_id).
 */
export class MigracionInicial1710000000000 implements MigrationInterface {
  name = 'MigracionInicial1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS citext');

    await queryRunner.query(
      `CREATE TYPE "rol_usuario" AS ENUM ('estudiante', 'docente', 'administrativo')`,
    );

    await queryRunner.query(`
      CREATE TABLE "usuarios" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" citext NOT NULL,
        "password_hash" text NOT NULL,
        "rol" "rol_usuario" NOT NULL,
        "nombres" character varying(120) NOT NULL,
        "apellidos" character varying(120) NOT NULL,
        "codigo_ucv" character varying(32),
        "telefono" character varying(32),
        "activo" boolean NOT NULL DEFAULT true,
        "creado_en" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_usuarios_email" UNIQUE ("email"),
        CONSTRAINT "PK_usuarios_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_usuarios_rol" ON "usuarios" ("rol")`);

    await queryRunner.query(`
      CREATE TABLE "token_sesiones" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "usuario_id" uuid NOT NULL,
        "familia_id" uuid NOT NULL,
        "refresh_token_hash" text NOT NULL,
        "expira_en" TIMESTAMPTZ NOT NULL,
        "revocado" boolean NOT NULL DEFAULT false,
        "creado_en" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_token_sesiones_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_token_sesiones_usuario" FOREIGN KEY ("usuario_id")
          REFERENCES "usuarios" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_token_sesiones_usuario_revocado" ON "token_sesiones" ("usuario_id", "revocado")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_token_sesiones_familia" ON "token_sesiones" ("familia_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "token_sesiones"`);
    await queryRunner.query(`DROP TABLE "usuarios"`);
    await queryRunner.query(`DROP TYPE "rol_usuario"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "citext"`);
  }
}