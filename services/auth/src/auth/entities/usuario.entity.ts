import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Roles del sistema (DF-16): administrativo NUNCA se auto-registra, se provisiona por seed. */
export enum RolUsuario {
  ESTUDIANTE = 'estudiante',
  DOCENTE = 'docente',
  ADMINISTRATIVO = 'administrativo',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** citext: comparación/UNIQUE insensible a mayúsculas (T-S1.05). */
  @Index({ unique: true })
  @Column({ type: 'citext' })
  email: string;

  /**
   * Hash bcrypt (cost 12) — jamás se devuelve en respuestas.
   * select: false obliga a pedirlo explícitamente (addSelect) solo para verificar login.
   */
  @Column({ name: 'password_hash', type: 'text', select: false })
  passwordHash: string;

  @Index('IDX_usuarios_rol')
  @Column({ type: 'enum', enum: RolUsuario, enumName: 'rol_usuario' })
  rol: RolUsuario;

  @Column({ type: 'varchar', length: 120 })
  nombres: string;

  @Column({ type: 'varchar', length: 120 })
  apellidos: string;

  @Column({ name: 'codigo_ucv', type: 'varchar', length: 32, nullable: true })
  codigoUcv: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  telefono: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;
}