import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:miagames/app.dart';
import 'package:miagames/core/storage/progress_store.dart';
import 'package:miagames/core/widgets/game_tile.dart';
import 'package:miagames/core/widgets/mia_avatar.dart';
import 'package:miagames/core/widgets/star_rating.dart';
import 'package:miagames/modules/game_module.dart';
import 'package:miagames/modules/game_registry.dart';
import 'package:miagames/modules/level_progress.dart';
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

  Widget app({GameScreenBuilder? gameBuilder}) =>
      MiaGamesApp(narrator: narrator, store: store, gameBuilder: gameBuilder);

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
    // tela alta: a grade é preguiçosa e só constrói o que cabe
    tester.view.physicalSize = const Size(800, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
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

  Finder level(int n) => find.byKey(ValueKey('level-$n'));

  Future<void> openPicker(WidgetTester tester) async {
    await tester.tap(find.text('Jogo da Memória'));
    await tester.pumpAndSettle();
  }

  testWidgets('tocar no jogo fala o nome e mostra a trilha de 6 níveis', (
    tester,
  ) async {
    await tester.pumpWidget(app());

    await openPicker(tester);

    expect(narrator.spoken, ['Jogo da Memória']);
    for (var n = 1; n <= 6; n++) {
      expect(level(n), findsOneWidget, reason: 'nível $n');
    }
    // sem recordes: só o nível 1 está aberto (os outros 5 têm cadeado)
    expect(find.byIcon(Icons.lock_rounded), findsNWidgets(5));
    final rating = tester.widget<StarRating>(find.byType(StarRating));
    expect(rating.stars, 0);
    expect(find.text('Letras e números até 5 · 4 pares'), findsOneWidget);
  });

  testWidgets('cada nível abre com 2 estrelas no anterior', (tester) async {
    await store.saveResult(
      gameId: 'memory',
      difficulty: GameDifficulty.level1,
      stars: 3,
      moves: 5,
      timeSeconds: 30,
    );
    await store.saveResult(
      gameId: 'memory',
      difficulty: GameDifficulty.level2,
      stars: 2,
      moves: 12,
      timeSeconds: 50,
    );
    await tester.pumpWidget(app());

    await openPicker(tester);

    // 1, 2 e 3 abertos (o 3 abriu com as 2 estrelas do 2); 4, 5 e 6 fechados
    expect(find.byIcon(Icons.lock_rounded), findsNWidgets(3));
    final stars = tester
        .widgetList<StarRating>(find.byType(StarRating))
        .map((r) => r.stars)
        .toList();
    expect(stars, [3, 2, 0]);
  });

  testWidgets('1 estrela não abre o próximo nível', (tester) async {
    await store.saveResult(
      gameId: 'memory',
      difficulty: GameDifficulty.level1,
      stars: 1,
      moves: 9,
      timeSeconds: 30,
    );
    await tester.pumpWidget(app());

    await openPicker(tester);

    expect(find.byIcon(Icons.lock_rounded), findsNWidgets(5));
  });

  testWidgets('tocar num nível fechado fala como abrir e não sai da trilha', (
    tester,
  ) async {
    await tester.pumpWidget(app());
    await openPicker(tester);

    await tester.tap(level(3));
    await tester.pumpAndSettle();

    expect(
      narrator.spoken.last,
      'Ganhe duas estrelas no nível dois para abrir este.',
    );
    expect(level(3), findsOneWidget, reason: 'a trilha continua na tela');
  });

  testWidgets('o seletor destaca o nível que a Mia sugere', (tester) async {
    await store.saveResult(
      gameId: 'memory',
      difficulty: GameDifficulty.level1,
      stars: 3,
      moves: 5,
      timeSeconds: 20,
    );
    await tester.pumpWidget(app());

    await openPicker(tester);

    // 3 estrelas no nível 1: o 2 abriu e a Mia o sugere. A carinha dela (além da
    // que está no topo da folha) aparece só no nível sugerido.
    expect(
      find.descendant(of: level(2), matching: find.byType(MiaAvatar)),
      findsOneWidget,
    );
    expect(
      find.descendant(of: level(1), matching: find.byType(MiaAvatar)),
      findsNothing,
    );
  });

  group('abrir um nível novo', () {
    /// Tela de jogo falsa: "terminar" salva `stars` e volta, como o jogo real faz
    Widget fakeGame(
      BuildContext context,
      GameModule game,
      GameDifficulty difficulty,
      int stars,
    ) {
      return Scaffold(
        body: Column(
          children: [
            Text('JOGO ${game.id} nível ${difficulty.level}'),
            TextButton(
              onPressed: () async {
                await store.saveResult(
                  gameId: game.id,
                  difficulty: difficulty,
                  stars: stars,
                  moves: 3,
                  timeSeconds: 20,
                );
                if (context.mounted) Navigator.pop(context);
              },
              child: const Text('terminar'),
            ),
          ],
        ),
      );
    }

    Future<void> playLevel1(WidgetTester tester, int stars) async {
      await tester.pumpWidget(
        app(gameBuilder: (c, g, d) => fakeGame(c, g, d, stars)),
      );
      await openPicker(tester);
      await tester.tap(level(1));
      await tester.pumpAndSettle();
      expect(find.text('JOGO memory nível 1'), findsOneWidget);
      expect(narrator.spoken.last, 'Nível um');
      await tester.tap(find.text('terminar'));
      await tester.pumpAndSettle();
    }

    testWidgets('com 2 estrelas, a Mia comemora e o nível 2 abre', (
      tester,
    ) async {
      await playLevel1(tester, 2);

      expect(find.text('Nível 2 aberto!'), findsOneWidget);
      expect(narrator.spoken.last, 'Parabéns! Você abriu o nível dois!');
      expect(unlockedCount(store, findGameById('memory')!), 2);
    });

    testWidgets('o botão de jogar leva direto ao nível novo', (tester) async {
      await playLevel1(tester, 3);

      await tester.tap(find.byIcon(Icons.play_arrow_rounded));
      await tester.pumpAndSettle();

      expect(find.text('JOGO memory nível 2'), findsOneWidget);
    });

    testWidgets('o botão de início fecha a comemoração', (tester) async {
      await playLevel1(tester, 2);

      await tester.tap(find.byIcon(Icons.home_rounded));
      await tester.pumpAndSettle();

      expect(find.text('Nível 2 aberto!'), findsNothing);
      expect(find.text('JOGO memory nível 2'), findsNothing);
    });

    testWidgets('com 1 estrela, nada abre e não há comemoração', (
      tester,
    ) async {
      await playLevel1(tester, 1);

      expect(find.text('Nível 2 aberto!'), findsNothing);
      expect(unlockedCount(store, findGameById('memory')!), 1);
    });

    testWidgets(
      'jogar de novo um nível cujo seguinte já abriu não comemora outra vez',
      (tester) async {
        await store.saveResult(
          gameId: 'memory',
          difficulty: GameDifficulty.level1,
          stars: 2,
          moves: 8,
          timeSeconds: 30,
        );

        await playLevel1(tester, 3);

        expect(find.text('Nível 2 aberto!'), findsNothing);
      },
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
    expect(level(6), findsOneWidget);
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
        expect(level(6), findsOneWidget);
      });
    }

    testWidgets('em tela larga os cartões ficam lado a lado, 4 por fileira', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1280, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(app());

      final tiles = find.byType(GameTile);
      final first = tester.getTopLeft(tiles.first);
      final fourth = tester.getTopLeft(tiles.at(3));
      expect(fourth.dy, first.dy, reason: '4 jogos na primeira fileira');
      expect(fourth.dx, greaterThan(first.dx));
      if (gameRegistry.length > 4) {
        expect(
          tester.getTopLeft(tiles.at(4)).dy,
          greaterThan(first.dy),
          reason: 'o quinto desce para a fileira de baixo',
        );
      }
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

    testWidgets('cada jogo conta a pontuação do seu jeito: jogadas ou erros', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(800, 3000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await store.saveResult(
        gameId: 'which-letter',
        difficulty: GameDifficulty.level1,
        stars: 3,
        moves: 1,
        timeSeconds: 40,
      );
      await store.saveResult(
        gameId: 'memory',
        difficulty: GameDifficulty.level1,
        stars: 3,
        moves: 7,
        timeSeconds: 40,
      );
      await tester.pumpWidget(app());
      await openParentsArea(tester);

      expect(find.text('Recorde: 1 erro · 1 partida'), findsOneWidget);
      expect(find.text('Recorde: 7 jogadas · 1 partida'), findsOneWidget);
    });

    testWidgets('mostra o progresso e apaga com confirmação', (tester) async {
      // tela alta: a lista é preguiçosa e só constrói o que cabe
      tester.view.physicalSize = const Size(800, 3000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await store.saveResult(
        gameId: 'memory',
        difficulty: GameDifficulty.level1,
        stars: 3,
        moves: 6,
        timeSeconds: 20,
      );
      await tester.pumpWidget(app());
      await openParentsArea(tester);

      expect(find.text('Recorde: 6 jogadas · 1 partida'), findsOneWidget);
      final levels = gameRegistry.length * GameDifficulty.values.length;
      expect(find.text('Ainda não jogou'), findsNWidgets(levels - 1));

      await tester.scrollUntilVisible(find.text('Apagar progresso'), 100);
      await tester.tap(find.text('Apagar progresso'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Apagar'));
      await tester.pumpAndSettle();

      expect(store.record('memory', GameDifficulty.level1), isNull);
      expect(find.text('Ainda não jogou'), findsNWidgets(levels));
    });
  });
}
