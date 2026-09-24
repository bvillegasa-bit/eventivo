import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RolUsuario } from '../entities/usuario.entity';

/**
 * RF-01 — Registro.
 * NOTA: `administrativo` se acepta en el DTO (sintácticamente válido) para que el
 * servicio lo rechace con 403, no 400 (el rol existe, pero está prohibido auto-registrarse).
 */
export class RegistroDto {
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  @MaxLength(255, { message: 'El correo electrónico no puede superar 255 caracteres' })
  email: string;

  @IsString({ message: 'La contraseña debe ser un texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La contraseña no puede superar 72 caracteres' })
  password: string;

  @IsIn([RolUsuario.ESTUDIANTE, RolUsuario.DOCENTE, RolUsuario.ADMINISTRATIVO], {
    message: 'El rol debe ser estudiante, docente o administrativo',
  })
  rol: RolUsuario;

  @IsString({ message: 'Los nombres son obligatorios' })
  @IsNotEmpty({ message: 'Los nombres son obligatorios' })
  @MaxLength(120, { message: 'Los nombres no pueden superar 120 caracteres' })
  nombres: string;

  @IsString({ message: 'Los apellidos son obligatorios' })
  @IsNotEmpty({ message: 'Los apellidos son obligatorios' })
  @MaxLength(120, { message: 'Los apellidos no pueden superar 120 caracteres' })
  apellidos: string;

  @IsOptional()
  @IsString()
  @MaxLength(32, { message: 'El código UCV no puede superar 32 caracteres' })
  codigoUcv?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32, { message: 'El teléfono no puede superar 32 caracteres' })
  telefono?: string;
}