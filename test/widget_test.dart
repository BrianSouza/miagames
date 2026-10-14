import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:miagames/app.dart';
import 'package:miagames/core/storage/progress_store.dart';
import 'package:miagames/core/widgets/star_rating.dart';
import 'package:miagames/modules/game_module.dart';

import 'fake_narrator.dart';
import 'test_helpers.dart';

void main() {
  late FakeNarrator narrator;
  late ProgressStore store;

  setUp(() async {
    narrator = FakeNarrator();
    store = await memoryStore();
  });

  Widget app() => MiaGamesApp(narrator: narrator, store: store);

  /// Abre a Área dos pais respondendo a conta do bloqueio.
  Future<void> openParentsArea(WidgetTester tester) async {
    await tester.tap(find.byTooltip('Área dos pais'));
    await tester.pumpAndSettle();
    final question = tester.widget<Text>(find.textContaining('Quanto é')).data!;
    final numbers = RegExp(
      r'\d+',
    ).allMatches(question).map((m) => int.parse(m[0]!));
    await tester.tap(find.text('${numbers.reduce((a, b) => a + b)}'));
    await tester.pumpAndSettle();
  }

  testWidgets('Home lista os jogos do registry', (tester) async {
    await tester.pumpWidget(app());

    expect(find.text('MiaGames'), findsOneWidget);
    expect(find.text('Jogo da Memória'), findsOneWidget);
  });

  testWidgets('tocar no jogo fala o nome e abre as dificuldades', (
    tester,
  ) async {
    await tester.pumpWidget(app());

    await tester.tap(find.text('Jogo da Memória'));
    await tester.pumpAndSettle();

    expect(narrator.spoken, ['Jogo da Memória']);
    expect(find.text('Escolha a dificuldade:'), findsOneWidget);
    for (final label in ['Fácil', 'Médio', 'Difícil']) {
      expect(find.text(label), findsOneWidget);
    }
    expect(
      find.byType(StarRating),
      findsNothing,
      reason: 'nenhum recorde ainda',
    );

    // O que cada nível traz: números maiores a cada nível, até 50
    expect(find.text('Letras e números até 9'), findsOneWidget);
    expect(find.text('Letras e números até 20'), findsOneWidget);
    expect(find.text('Letras e números até 50'), findsOneWidget);
  });

  testWidgets('o seletor mostra o recorde de cada dificuldade', (tester) async {
    await store.saveResult(
      gameId: 'memory',
      difficulty: GameDifficulty.medium,
      stars: 2,
      moves: 12,
      timeSeconds: 50,
    );
    await tester.pumpWidget(app());

    await tester.tap(find.text('Jogo da Memória'));
    await tester.pumpAndSettle();

    final rating = tester.widget<StarRating>(find.byType(StarRating));
    expect(rating.stars, 2);
    expect(find.byType(StarRating), findsOneWidget);
  });

  testWidgets('o card do jogo é um botão para leitores de tela', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    await tester.pumpWidget(app());

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

    await tester.pumpWidget(app());
    await tester.tap(find.text('Jogo da Memória'));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('Difícil'), findsOneWidget);
  });

  group('Área dos pais', () {
    testWidgets('fica atrás do bloqueio parental', (tester) async {
      await tester.pumpWidget(app());

      await tester.tap(find.byTooltip('Área dos pais'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cancelar'));
      await tester.pumpAndSettle();

      expect(find.text('Efeitos sonoros'), findsNothing);
    });

    testWidgets('liga e desliga voz e sons', (tester) async {
      await tester.pumpWidget(app());
      await openParentsArea(tester);

      await tester.tap(find.text('Efeitos sonoros'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Voz'));
      await tester.pumpAndSettle();

      expect(store.soundEnabled, isFalse);
      expect(store.voiceEnabled, isFalse);
    });

    testWidgets('mostra o progresso e apaga com confirmação', (tester) async {
      await store.saveResult(
        gameId: 'memory',
        difficulty: GameDifficulty.easy,
        stars: 3,
        moves: 6,
        timeSeconds: 20,
      );
      await tester.pumpWidget(app());
      await openParentsArea(tester);

      expect(find.text('Recorde: 6 jogadas · 1 partida'), findsOneWidget);
      expect(find.text('Ainda não jogou'), findsNWidgets(2));

      await tester.scrollUntilVisible(find.text('Apagar progresso'), 100);
      await tester.tap(find.text('Apagar progresso'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Apagar'));
      await tester.pumpAndSettle();

      expect(store.record('memory', GameDifficulty.easy), isNull);
      expect(find.text('Ainda não jogou'), findsNWidgets(3));
    });
  });
}
