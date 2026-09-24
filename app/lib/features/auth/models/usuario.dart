/// Roles del sistema (DF-16). `administrativo` NO se auto-registra (seed).
enum RolUsuario {
  estudiante('estudiante', 'Estudiante'),
  docente('docente', 'Docente'),
  administrativo('administrativo', 'Administrativo');

  const RolUsuario(this.valor, this.etiqueta);

  /// Valor que viaja en el JSON/API.
  final String valor;

  /// Etiqueta visible en español (RF-20).
  final String etiqueta;

  static RolUsuario desdeString(String valor) => RolUsuario.values.firstWhere(
        (r) => r.valor == valor,
        orElse: () => RolUsuario.estudiante,
      );
}

/// Entidad Usuario (perfil público del backend, sin hashes — T-S1.09).
class Usuario {
  const Usuario({
    required this.id,
    required this.email,
    required this.rol,
    required this.nombres,
    required this.apellidos,
    this.codigoUcv,
    this.telefono,
    required this.activo,
    required this.creadoEn,
  });

  final String id;
  final String email;
  final RolUsuario rol;
  final String nombres;
  final String apellidos;
  final String? codigoUcv;
  final String? telefono;
  final bool activo;

  /// Fecha de creación en UTC (presentación en UTC−5, DT-10).
  final DateTime creadoEn;

  String get nombreCompleto => '$nombres $apellidos'.trim();

  factory Usuario.fromJson(Map<String, dynamic> json) => Usuario(
        id: json['id'] as String,
        email: json['email'] as String,
        rol: RolUsuario.desdeString(json['rol'] as String),
        nombres: json['nombres'] as String,
        apellidos: json['apellidos'] as String,
        codigoUcv: json['codigoUcv'] as String?,
        telefono: json['telefono'] as String?,
        activo: json['activo'] as bool? ?? true,
        creadoEn: DateTime.parse(json['creadoEn'] as String).toUtc(),
      );
}