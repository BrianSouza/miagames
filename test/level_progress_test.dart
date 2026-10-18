import 'package:flutter_test/flutter_test.dart';
import 'package:miagames/core/storage/progress_store.dart';
import 'package:miagames/modules/game_module.dart';
import 'package:miagames/modules/game_registry.dart';
import 'package:miagames/modules/level_progress.dart';

import 'test_helpers.dart';

void main() {
  final game = findGameById('memory')!;

  Future<ProgressStore> withStars(Map<GameDifficulty, int> stars) async {
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

  group('abrir níveis', () {
    test('sem partidas, só o nível 1 está aberto', () async {
      final store = await withStars({});
      expect(isUnlocked(store, game, GameDifficulty.level1), isTrue);
      for (final d in GameDifficulty.values.skip(1)) {
        expect(isUnlocked(store, game, d), isFalse, reason: d.label);
      }
      expect(unlockedCount(store, game), 1);
    });

    test('2 estrelas num nível abrem o seguinte (1 estrela, não)', () async {
      final one = await withStars({GameDifficulty.level1: 1});
      expect(isUnlocked(one, game, GameDifficulty.level2), isFalse);

      final two = await withStars({GameDifficulty.level1: 2});
      expect(isUnlocked(two, game, GameDifficulty.level2), isTrue);
      expect(isUnlocked(two, game, GameDifficulty.level3), isFalse);
      expect(unlockedCount(two, game), 2);
    });

    test('3 estrelas também abrem o seguinte', () async {
      final store = await withStars({GameDifficulty.level1: 3});
      expect(isUnlocked(store, game, GameDifficulty.level2), isTrue);
    });

    test('abrir é um nível de cada vez: pular não vale', () async {
      final store = await withStars({GameDifficulty.level3: 3});
      expect(
        isUnlocked(store, game, GameDifficulty.level4),
        isTrue,
        reason: 'o 3 tem 3 estrelas, então o 4 abre',
      );
      expect(
        isUnlocked(store, game, GameDifficulty.level3),
        isFalse,
        reason: 'mas o 3 só abre com o 2, que não foi feito',
      );
    });

    test('com tudo feito, os 6 níveis estão abertos', () async {
      final store = await withStars({
        for (final d in GameDifficulty.values) d: 2,
      });
      expect(unlockedCount(store, game), 6);
    });

    test('o número de estrelas exigido é 2', () {
      expect(unlockStars, 2);
    });
  });

  group('nível sugerido pela Mia', () {
    test('sem partidas, o 1', () async {
      expect(
        recommendedDifficulty(await withStars({}), game),
        GameDifficulty.level1,
      );
    });

    test('é o mais alto que já está aberto', () async {
      final store = await withStars({
        GameDifficulty.level1: 3,
        GameDifficulty.level2: 2,
      });
      expect(recommendedDifficulty(store, game), GameDifficulty.level3);
    });

    test('1 estrela no nível 1 mantém o 1 como sugestão', () async {
      final store = await withStars({GameDifficulty.level1: 1});
      expect(recommendedDifficulty(store, game), GameDifficulty.level1);
    });

    test('tudo aberto: o último', () async {
      final store = await withStars({
        for (final d in GameDifficulty.values) d: 3,
      });
      expect(recommendedDifficulty(store, game), GameDifficulty.level6);
    });
  });

  group('pontuação na Área dos pais', () {
    test('o Jogo da Memória conta jogadas', () {
      expect(game.scoreText(1), '1 jogada');
      expect(game.scoreText(6), '6 jogadas');
    });

    test('um jogo de responder conta erros', () {
      final quiz = findGameById('which-letter')!;
      expect(quiz.scoreText(0), '0 erros');
      expect(quiz.scoreText(1), '1 erro');
      expect(quiz.scoreText(3), '3 erros');
    });
  });
}
