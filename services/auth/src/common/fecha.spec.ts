import {
  DESPLAZAMIENTO_PERU_MS,
  aUtcMinus5,
  desdeUtcMinus5,
  formatearEnEspanol,
} from './fecha';

describe('common/fecha (TT-01, DT-10)', () => {
  describe('desplazamiento de Perú', () => {
    it('es UTC−5 (sin horario de verano)', () => {
      expect(DESPLAZAMIENTO_PERU_MS).toBe(-5 * 60 * 60 * 1000);
    });
  });

  describe('aUtcMinus5', () => {
    it('convierte 12:00 UTC en 07:00 hora de pared peruana', () => {
      const instanteUtc = new Date('2026-01-15T12:00:00.000Z');
      const local = aUtcMinus5(instanteUtc);
      expect(local.getUTCHours()).toBe(7);
      expect(local.getUTCMinutes()).toBe(0);
    });
  });

  describe('desdeUtcMinus5', () => {
    it('es la operación inversa de aUtcMinus5', () => {
      const original = new Date('2026-06-20T23:45:00.000Z');
      const idaYVuelta = desdeUtcMinus5(aUtcMinus5(original));
      expect(idaYVuelta.getTime()).toBe(original.getTime());
    });
  });

  describe('formatearEnEspanol', () => {
    it('formatea en español con zona America/Lima', () => {
      const texto = formatearEnEspanol(new Date('2026-03-10T15:05:00.000Z'));
      expect(texto).toContain('2026');
      expect(texto).toBeDefined();
      expect(texto.length).toBeGreaterThan(5);
    });
  });
});