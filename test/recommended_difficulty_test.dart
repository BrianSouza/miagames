import 'dart:ui' show Color;

import 'package:flutter_test/flutter_test.dart';
import 'package:miagames/modules/game_module.dart';
import 'package:miagames/modules/game_registry.dart';
import 'package:miagames/modules/recommended_difficulty.dart';

import 'test_helpers.dart';

void main() {
  final game = findGameById('memory')!;

  Future<dynamic> withStars(Map<GameDifficulty, int> stars) async {
    final store = await memoryStore();
    for (final entry in stars.entries) {
      await store.saveResult(
        gameId: game.id,
        difficulty: entry.key,
        stars: entry.value,
        moves: 10,
        timeSeconds: 30,
      );
    }
    return store;
  }

  test('sem partidas, sugere o fácil', () async {
    expect(
      recommendedDifficulty(await withStars({}), game),
      GameDifficulty.easy,
    );
  });

  test('o fácil com 3 estrelas leva ao médio', () async {
    final store = await withStars({GameDifficulty.easy: 3});
    expect(recommendedDifficulty(store, game), GameDifficulty.medium);
  });

  test('fácil com menos de 3 estrelas continua sendo o sugerido', () async {
    final store = await withStars({GameDifficulty.easy: 2});
    expect(recommendedDifficulty(store, game), GameDifficulty.easy);
  });

  test(
    'com o médio sem estrelas, sugere o médio mesmo que o difícil esteja feito',
    () async {
      final store = await withStars({
        GameDifficulty.easy: 3,
        GameDifficulty.hard: 3,
      });
      expect(recommendedDifficulty(store, game), GameDifficulty.medium);
    },
  );

  test('tudo com 3 estrelas: o mais difícil', () async {
    final store = await withStars({
      GameDifficulty.easy: 3,
      GameDifficulty.medium: 3,
      GameDifficulty.hard: 3,
    });
    expect(recommendedDifficulty(store, game), GameDifficulty.hard);
  });

  group('pontuação na Área dos pais', () {
    test('o Jogo da Memória conta jogadas', () {
      expect(game.scoreText(1), '1 jogada');
      expect(game.scoreText(6), '6 jogadas');
    });

    test('um jogo de responder conta erros', () {
      const quiz = GameModule(
        id: 'q',
        displayName: 'Q',
        iconAsset: 'q.svg',
        accentColor: Color(0xFF000000),
        ageRange: [3, 6],
        skills: [],
        difficulties: [GameDifficulty.easy],
        assetPath: 'q.html',
        scoreLabel: 'erros',
        scoreLabelSingular: 'erro',
      );
      expect(quiz.scoreText(0), '0 erros');
      expect(quiz.scoreText(1), '1 erro');
      expect(quiz.scoreText(3), '3 erros');
    });
  });
}
