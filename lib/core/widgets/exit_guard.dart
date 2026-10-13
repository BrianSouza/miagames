import 'package:flutter/material.dart';

/// Exige dois toques no "voltar" do sistema (ou gesto de voltar) para sair.
///
/// Crianças pequenas tocam em tudo; um toque acidental não deve encerrar
/// a partida. O primeiro toque só mostra a dica para o adulto.
class ExitGuard extends StatefulWidget {
  const ExitGuard({
    super.key,
    required this.child,
    this.window = const Duration(seconds: 2),
  });

  final Widget child;

  /// Intervalo máximo entre os dois toques.
  final Duration window;

  @override
  State<ExitGuard> createState() => _ExitGuardState();
}

class _ExitGuardState extends State<ExitGuard> {
  DateTime? _lastBackPress;

  void _onBack() {
    final now = DateTime.now();
    final last = _lastBackPress;
    if (last != null && now.difference(last) <= widget.window) {
      Navigator.of(context).pop();
      return;
    }
    _lastBackPress = now;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: const Text('Toque em voltar de novo para sair'),
          duration: widget.window,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _onBack();
      },
      child: widget.child,
    );
  }
}
