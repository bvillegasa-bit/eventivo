import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Sesión de refresh token con hash en BD (DT-05).
 * - `familia_id`: agrupa la "familia" de tokens de una misma sesión; al detectar
 *   reuso se revoca TODA la familia (RF-02 escenario 4).
 * - `refresh_token_hash`: hash SHA-256 del refresh vigente; NUNCA el token en claro.
 */
@Entity('token_sesiones')
@Index('IDX_token_sesiones_usuario_revocado', ['usuarioId', 'revocado'])
export class TokenSesion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @Index('IDX_token_sesiones_familia')
  @Column({ name: 'familia_id', type: 'uuid' })
  familiaId: string;

  @Column({ name: 'refresh_token_hash', type: 'text' })
  refreshTokenHash: string;

  @Column({ name: 'expira_en', type: 'timestamptz' })
  expiraEn: Date;

  @Column({ type: 'boolean', default: false })
  revocado: boolean;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;
}