import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/usuario.dart';
import '../viewmodels/auth_viewmodel.dart';

/// Vista de registro (RF-01, T-S1.12): solo estudiantes y docentes
/// (el rol administrativo se crea por seed, 403 en backend).
class RegistroView extends ConsumerStatefulWidget {
  const RegistroView({super.key});

  @override
  ConsumerState<RegistroView> createState() => _RegistroViewState();
}

class _RegistroViewState extends ConsumerState<RegistroView> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmarController = TextEditingController();
  final _nombresController = TextEditingController();
  final _apellidosController = TextEditingController();
  final _codigoController = TextEditingController();
  final _telefonoController = TextEditingController();
  RolUsuario _rol = RolUsuario.estudiante;
  bool _ocultarPassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _confirmarController.dispose();
    _nombresController.dispose();
    _apellidosController.dispose();
    _codigoController.dispose();
    _telefonoController.dispose();
    super.dispose();
  }

  Future<void> _enviar() async {
    if (!_formKey.currentState!.validate()) return;
    // Si el registro es exitoso, el redirect del router lleva a /inicio;
    // si falla, el mensaje queda en estado.error (se muestra debajo del form).
    await ref.read(authStateProvider.notifier).registrar(
          email: _emailController.text,
          password: _passwordController.text,
          rol: _rol,
          nombres: _nombresController.text,
          apellidos: _apellidosController.text,
          codigoUcv: _codigoController.text,
          telefono: _telefonoController.text,
        );
  }

  @override
  Widget build(BuildContext context) {
    final estado = ref.watch(authStateProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Crear cuenta')),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SegmentedButton<RolUsuario>(
                      segments: const [
                        ButtonSegment(
                          value: RolUsuario.estudiante,
                          label: Text('Estudiante'),
                          icon: Icon(Icons.school_outlined),
                        ),
                        ButtonSegment(
                          value: RolUsuario.docente,
                          label: Text('Docente'),
                          icon: Icon(Icons.menu_book_outlined),
                        ),
                      ],
                      selected: {_rol},
                      onSelectionChanged: (seleccion) =>
                          setState(() => _rol = seleccion.first),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _nombresController,
                      textCapitalization: TextCapitalization.words,
                      decoration: const InputDecoration(
                        labelText: 'Nombres',
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                      validator: (v) => (v?.trim().isEmpty ?? true)
                          ? 'Ingresa tus nombres'
                          : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _apellidosController,
                      textCapitalization: TextCapitalization.words,
                      decoration: const InputDecoration(
                        labelText: 'Apellidos',
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                      validator: (v) => (v?.trim().isEmpty ?? true)
                          ? 'Ingresa tus apellidos'
                          : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      decoration: const InputDecoration(
                        labelText: 'Correo institucional',
                        prefixIcon: Icon(Icons.email_outlined),
                      ),
                      validator: (valor) {
                        final v = valor?.trim() ?? '';
                        if (v.isEmpty) return 'Ingresa tu correo';
                        final regex = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
                        if (!regex.hasMatch(v)) return 'Ingresa un correo válido';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _codigoController,
                      decoration: const InputDecoration(
                        labelText: 'Código UCV (opcional)',
                        prefixIcon: Icon(Icons.badge_outlined),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _telefonoController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Teléfono (opcional)',
                        prefixIcon: Icon(Icons.phone_outlined),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: _ocultarPassword,
                      autofillHints: const [AutofillHints.newPassword],
                      decoration: InputDecoration(
                        labelText: 'Contraseña',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _ocultarPassword
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                          ),
                          onPressed: () =>
                              setState(() => _ocultarPassword = !_ocultarPassword),
                        ),
                      ),
                      validator: (valor) {
                        final v = valor ?? '';
                        if (v.isEmpty) return 'Ingresa una contraseña';
                        if (v.length < 8) return 'Mínimo 8 caracteres';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _confirmarController,
                      obscureText: _ocultarPassword,
                      decoration: const InputDecoration(
                        labelText: 'Confirmar contraseña',
                        prefixIcon: Icon(Icons.lock_outline),
                      ),
                      validator: (valor) =>
                          valor != _passwordController.text
                              ? 'Las contraseñas no coinciden'
                              : null,
                    ),
                    if (estado.error != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        estado.error!,
                        style: TextStyle(color: Theme.of(context).colorScheme.error),
                      ),
                    ],
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: estado.cargando ? null : _enviar,
                      child: estado.cargando
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Crear cuenta'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}