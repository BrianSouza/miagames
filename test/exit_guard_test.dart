import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:miagames/core/widgets/exit_guard.dart';

void main() {
  Future<void> openGuardedPage(WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => TextButton(
            onPressed: () => Navigator.push<void>(
              context,
              MaterialPageRoute(
                builder: (_) =>
                    const ExitGuard(child: Scaffold(body: Text('jogo'))),
              ),
            ),
            child: const Text('abrir'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('abrir'));
    await tester.pumpAndSettle();
  }

  testWidgets('um toque no voltar só mostra a dica', (tester) async {
    await openGuardedPage(tester);

    await tester.binding.handlePopRoute();
    await tester.pump();

    expect(find.text('jogo'), findsOneWidget);
    expect(find.text('Toque em voltar de novo para sair'), findsOneWidget);
  });

  testWidgets('dois toques seguidos no voltar saem do jogo', (tester) async {
    await openGuardedPage(tester);

    await tester.binding.handlePopRoute();
    await tester.pump();
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();

    expect(find.text('jogo'), findsNothing);
    expect(find.text('abrir'), findsOneWidget);
  });
}
