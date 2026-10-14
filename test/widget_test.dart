import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:miagames/app.dart';
import 'package:miagames/core/storage/progress_store.dart';
import 'package:miagames/core/widgets/game_tile.dart';
import 'package:miagames/core/widgets/mia_avatar.dart';
import 'package:miagames/core/widgets/star_rating.dart';
import 'package:miagames/modules/game_module.dart';
import 'package:miagames/modules/game_registry.dart';
import 'package:miagames/screens/home_screen.dart';

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

    for (final game in gameRegistry) {
      expect(find.text(game.displayName), findsOneWidget);
    }
    expect(find.byType(GameTile), findsNWidgets(gameRegistry.length));
  });

  testWidgets('a Mia cumprimenta e fala quando a criança toca no balão', (
    tester,
  ) async {
    await tester.pumpWidget(app());

    expect(find.text(miaGreeting), findsOneWidget);
    expect(narrator.spoken, isEmpty, reason: 'nada fala sozinho ao abrir');

    await tester.tap(find.text(miaGreeting));
    await tester.pump();
    await tester.tap(find.byType(MiaAvatar).first);
    await tester.pump();

    expect(narrator.spoken, [miaGreeting, miaGreeting]);
  });

  testWidgets('os cartões não têm etiquetas de texto das habilidades', (
    tester,
  ) async {
    await tester.pumpWidget(app());

    for (final game in gameRegistry) {
      for (final skill in game.skills) {
        expect(find.text(skill), findsNothing, reason: skill);
      }
    }
  });

  testWidgets('tocar no jogo fala o nome e abre as dificuldades', (
    tester,
  ) async {
    await tester.pumpWidget(app());

    await tester.tap(find.text('Jogo da Memória'));
    await tester.pumpAndSettle();

    expect(narrator.spoken, ['Jogo da Memória']);
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

  testWidgets('o seletor destaca o nível que a Mia sugere', (tester) async {
    await store.saveResult(
      gameId: 'memory',
      difficulty: GameDifficulty.easy,
      stars: 3,
      moves: 6,
      timeSeconds: 20,
    );
    await tester.pumpWidget(app());

    await tester.tap(find.text('Jogo da Memória'));
    await tester.pumpAndSettle();

    // 3 estrelas no fácil: a Mia sugere o médio. A carinha dela (além da que
    // está no topo da folha) aparece só no botão sugerido.
    final mediumButton = find.ancestor(
      of: find.text('Médio'),
      matching: find.byType(Material),
    );
    expect(
      find.descendant(of: mediumButton.first, matching: find.byType(MiaAvatar)),
      findsOneWidget,
    );
    final easyButton = find.ancestor(
      of: find.text('Fácil'),
      matching: find.byType(Material),
    );
    expect(
      find.descendant(of: easyButton.first, matching: find.byType(MiaAvatar)),
      findsNothing,
    );
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

  group('a Home cabe em qualquer tela, sem estourar', () {
    const sizes = {
      'celular pequeno 320x568': Size(320, 568),
      'celular 360x740': Size(360, 740),
      'celular paisagem 844x390': Size(844, 390),
      'tablet em pé 800x1280': Size(800, 1280),
      'tablet deitado 1280x800': Size(1280, 800),
    };
    for (final entry in sizes.entries) {
      testWidgets(entry.key, (tester) async {
        tester.view.physicalSize = entry.value;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);

        await tester.pumpWidget(app());
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);

        // o seletor também cabe (e rola, se precisar)
        await tester.tap(find.text('Jogo da Memória'));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.text('Difícil'), findsOneWidget);
      });
    }

    testWidgets('em tela larga os cartões ficam lado a lado', (tester) async {
      tester.view.physicalSize = const Size(1280, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(app());

      final tiles = find.byType(GameTile);
      final first = tester.getTopLeft(tiles.first);
      final last = tester.getTopLeft(tiles.at(gameRegistry.length - 1));
      expect(
        last.dy,
        first.dy,
        reason: 'todos os jogos numa só fileira em tela larga',
      );
    });
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
