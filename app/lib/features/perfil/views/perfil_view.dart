import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/utils/fecha_util.dart';
import '../../auth/models/usuario.dart';
import '../../auth/viewmodels/auth_viewmodel.dart';
import '../viewmodels/perfil_viewmodel.dart';

/// Pestaña Perfil (T-S1.13): muestra el perfil del usuario, permite probar
/// la demo de RBAC (`admin-ping`) y cerrar sesión.
class PerfilView extends ConsumerStatefulWidget {
  const PerfilView({super.key});

  @override
  ConsumerState<PerfilView> createState() => _PerfilViewState();
}

class _PerfilViewState extends ConsumerState<PerfilView> {
  @override
  void initState() {
    super.initState();
    // Carga el perfil cada vez que se muestra la pestaña (refresco de sesión).
    Future.microtask(() => ref.read(perfilStateProvider.notifier).cargarPerfil());
  }

  Future<void> _cerrarSesion() async {
    final confirmado = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cerrar sesión'),
        content: const Text('¿Deseas cerrar tu sesión?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Cerrar sesión'),
          ),
        ],
      ),
    );
    if (confirmado == true) {
      await ref.read(authStateProvider.notifier).cerrarSesion();
    }
  }

  @override
  Widget build(BuildContext context) {
    final estado = ref.watch(perfilStateProvider);
    final usuario = estado.usuario ?? ref.watch(authStateProvider).usuario;

    return Scaffold(
      appBar: AppBar(title: const Text('Perfil')),
      body: estado.cargando && usuario == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (estado.error != null)
                  Card(
                    color: Theme.of(context).colorScheme.errorContainer,
                    child: ListTile(
                      leading: const Icon(Icons.error_outline),
                      title: Text(estado.error!),
                    ),
                  ),
                if (usuario != null) ...[
                  _EncabezadoPerfil(usuario: usuario),
                  const SizedBox(height: 16),
                  Card(
                    child: Column(
                      children: [
                        ListTile(
                          leading: const Icon(Icons.badge_outlined),
                          title: const Text('Rol'),
                          trailing: Text(usuario.rol.etiqueta),
                        ),
                        if (usuario.codigoUcv != null)
                          ListTile(
                            leading: const Icon(Icons.confirmation_number_outlined),
                            title: const Text('Código UCV'),
                            trailing: Text(usuario.codigoUcv!),
                          ),
                        if (usuario.telefono != null)
                          ListTile(
                            leading: const Icon(Icons.phone_outlined),
                            title: const Text('Teléfono'),
                            trailing: Text(usuario.telefono!),
                          ),
                        ListTile(
                          leading: const Icon(Icons.event_outlined),
                          title: const Text('Registrado el'),
                          subtitle: Text(
                            FechaUtil.formatear(FechaUtil.aUtcMenos5(usuario.creadoEn)),
                          ),
                        ),
                        ListTile(
                          leading: const Icon(Icons.verified_user_outlined),
                          title: const Text('Estado'),
                          trailing: Text(usuario.activo ? 'Activo' : 'Inactivo'),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                _DemoRbacCard(
                  cargando: estado.cargando,
                  resultado: estado.elRolPermiteAdmin,
                  onVerificar: () =>
                      ref.read(perfilStateProvider.notifier).verificarAccesoAdministrativo(),
                ),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: _cerrarSesion,
                  icon: const Icon(Icons.logout),
                  label: const Text('Cerrar sesión'),
                ),
              ],
            ),
    );
  }
}

class _EncabezadoPerfil extends StatelessWidget {
  const _EncabezadoPerfil({required this.usuario});

  final Usuario usuario;

  @override
  Widget build(BuildContext context) {
    final iniciales = usuario.nombreCompleto
        .split(' ')
        .where((p) => p.isNotEmpty)
        .take(2)
        .map((p) => p[0].toUpperCase())
        .join();

    return Row(
      children: [
        CircleAvatar(
          radius: 32,
          backgroundColor: Theme.of(context).colorScheme.primary,
          child: Text(
            iniciales,
            style: const TextStyle(fontSize: 24, color: Colors.white),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                usuario.nombreCompleto,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              Text(usuario.email, style: Theme.of(context).textTheme.bodyMedium),
            ],
          ),
        ),
      ],
    );
  }
}

class _DemoRbacCard extends StatelessWidget {
  const _DemoRbacCard({
    required this.cargando,
    required this.resultado,
    required this.onVerificar,
  });

  final bool cargando;
  final bool? resultado;
  final VoidCallback onVerificar;

  @override
  Widget build(BuildContext context) {
    final (icono, color, texto) = switch (resultado) {
      null => (Icons.shield_outlined, Colors.grey, null),
      true => (Icons.check_circle, Colors.green, 'Acceso administrativo permitido'),
      false => (Icons.cancel, Colors.red, 'Acceso denegado: se requiere rol administrativo'),
    };

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Demo — Control de acceso por rol', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 4),
            const Text(
              'Verifica el endpoint /auth/admin-ping: solo el rol administrativo '
              'recibe 200; los demás reciben 403.',
              style: TextStyle(fontSize: 12),
            ),
            const SizedBox(height: 12),
            FilledButton.tonalIcon(
              onPressed: cargando ? null : onVerificar,
              icon: const Icon(Icons.verified_user_outlined),
              label: const Text('Verificar acceso administrativo'),
            ),
            if (texto != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(icono, color: color, size: 20),
                  const SizedBox(width: 8),
                  Expanded(child: Text(texto, style: TextStyle(color: color))),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}