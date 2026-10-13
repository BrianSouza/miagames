import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:miagames/app.dart';

import 'fake_narrator.dart';

void main() {
  late FakeNarrator narrator;

  setUp(() => narrator = FakeNarrator());

  testWidgets('Home lista os jogos do registry', (tester) async {
    await tester.pumpWidget(MiaGamesApp(narrator: narrator));

    expect(find.text('🎮 MiaGames'), findsOneWidget);
    expect(find.text('Jogo da Memória'), findsOneWidget);
  });

  testWidgets('tocar no jogo fala o nome e abre as dificuldades', (
    tester,
  ) async {
    await tester.pumpWidget(MiaGamesApp(narrator: narrator));

    await tester.tap(find.text('Jogo da Memória'));
    await tester.pumpAndSettle();

    expect(narrator.spoken, ['Jogo da Memória']);
    expect(find.text('Escolha a dificuldade:'), findsOneWidget);
    for (final label in ['Fácil', 'Médio', 'Difícil']) {
      expect(find.text(label), findsOneWidget);
    }
  });

  testWidgets('o card do jogo é um botão para leitores de tela', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    await tester.pumpWidget(MiaGamesApp(narrator: narrator));

    expect(
      tester.getSemantics(find.bySemanticsLabel('Jogo da Memória')),
      matchesSemantics(label: 'Jogo da Memória', isButton: true),
    );
    semantics.dispose();
  });

  testWidgets('escolher a dificuldade fala o nome e cabe em tela pequena', (
    tester,
  ) async {
    // iPhone SE (1ª geração): 320 x 568
    tester.view.physicalSize = const Size(640, 1136);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(MiaGamesApp(narrator: narrator));
    await tester.tap(find.text('Jogo da Memória'));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('Difícil'), findsOneWidget);
  });
}
