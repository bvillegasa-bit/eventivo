import { IsNotEmpty, IsString } from 'class-validator';

/** RF-02 — Rotación/cierre de sesión (body: el refresh token vigente). */
export class RefreshDto {
  @IsString({ message: 'El token de refresco es obligatorio' })
  @IsNotEmpty({ message: 'El token de refresco es obligatorio' })
  refreshToken: string;
}

export class LogoutDto {
  @IsString({ message: 'El token de refresco es obligatorio' })
  @IsNotEmpty({ message: 'El token de refresco es obligatorio' })
  refreshToken: string;
}