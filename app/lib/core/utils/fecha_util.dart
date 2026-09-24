/// Utilidades de fecha de la app (TT-01 en Flutter, DT-10, BR-08).
///
/// El backend almacena y devuelve fechas en UTC (`timestamptz`). La
/// presentación siempre ocurre en la zona del usuario (referencia: Perú,
/// UTC−5). Esta utilidad NO depende de la zona local del dispositivo para
/// mostrar: convierte explícitamente la fecha UTC a UTC−5.
abstract final class FechaUtil {
  /// Desplazamiento de Perú respecto a UTC (sin horario de verano).
  static const Duration offsetPeru = Duration(hours: -5);

  /// Convierte una fecha UTC (o con offset) a la hora de Perú (UTC−5).
  static DateTime aUtcMenos5(DateTime fecha) => fecha.toUtc().add(offsetPeru);

  /// Formatea una fecha (UTC) en español: `24/09/2026 15:00` o `24/09/2026`.
  static String formatear(DateTime fecha, {bool conHora = true}) {
    final local = aUtcMenos5(fecha);
    final dd = local.day.toString().padLeft(2, '0');
    final mm = local.month.toString().padLeft(2, '0');
    final yyyy = local.year.toString();
    if (!conHora) {
      return '$dd/$mm/$yyyy';
    }
    final hh = local.hour.toString().padLeft(2, '0');
    final min = local.minute.toString().padLeft(2, '0');
    return '$dd/$mm/$yyyy $hh:$min';
  }
}