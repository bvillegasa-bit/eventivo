import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/** RF-02 — Login. Mensajes genéricos (anti-enumeración). */
export class LoginDto {
  @IsEmail({}, { message: 'Credenciales inválidas' })
  email: string;

  @IsString({ message: 'Credenciales inválidas' })
  @IsNotEmpty({ message: 'Credenciales inválidas' })
  password: string;
}