/**
 * TT-01 — Utilidades de fecha compartidas para todos los servicios.
 * REGLA (DT-10 / BR-08): en BD todo se almacena en UTC (timestamptz);
 * la conversión a hora local Peruana (UTC−5) ocurre SOLO al presentar
 * información al usuario.
 */

/** Desplazamiento de Perú respecto a UTC en milisegundos. */
export const DESPLAZAMIENTO_PERU_MS = -5 * 60 * 60 * 1000;

/** Convierte un instante UTC a la misma 'hora de pared' peruana (para presentación). */
export function aUtcMinus5(instanteUtc: Date): Date {
  return new Date(instanteUtc.getTime() + DESPLAZAMIENTO_PERU_MS);
}

/** Convierte una 'hora de pared' peruana a un instante UTC (para persistencia). */
export function desdeUtcMinus5(instanteLocal: Date): Date {
  return new Date(instanteLocal.getTime() - DESPLAZAMIENTO_PERU_MS);
}

/** Formatea una fecha en es-PE (zona America/Lima). */
export function formatearEnEspanol(instanteUtc: Date): string {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(instanteUtc);
}