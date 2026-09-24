import { hash } from 'bcryptjs';
import { DataSource } from 'typeorm';
import { RolUsuario, Usuario } from '../auth/entities/usuario.entity';

export interface ResultadoSeed {
  creados: number;
  existentes: number;
}

const COSTO_BCRYPT = 12;

/**
 * T-S1.10 — Seed idempotente de 2 administrativos (RF-19, parcial).
 * - Idempotente: si el email ya existe, NO se toca (ni su rol ni su hash).
 * - Los datos son FICTICIOS (R-09), solo para demostración local/CI:
 *   nunca usar contraseñas reales de nadie.
 */
export async function sembrarAdministradores(
  dataSource: DataSource,
  opciones: { emails: string[]; password: string },
): Promise<ResultadoSeed> {
  const repositorio = dataSource.getRepository(Usuario);
  const emails = [...new Set(opciones.emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  const resultado: ResultadoSeed = { creados: 0, existentes: 0 };

  const passwordHash = await hash(opciones.password, COSTO_BCRYPT);

  for (let indice = 0; indice < emails.length; indice += 1) {
    const email = emails[indice];
    const existe = await repositorio.findOneBy({ email });
    if (existe) {
      resultado.existentes += 1;
      continue;
    }

    await repositorio.save(
      repositorio.create({
        email,
        passwordHash,
        rol: RolUsuario.ADMINISTRATIVO,
        nombres: 'Administrador',
        apellidos: `Demo ${indice + 1}`,
        activo: true,
      }),
    );
    resultado.creados += 1;
  }

  return resultado;
}