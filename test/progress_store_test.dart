import 'package:flutter_test/flutter_test.dart';
import 'package:miagames/core/storage/progress_store.dart';
import 'package:miagames/modules/game_module.dart';

import 'test_helpers.dart';

void main() {
  Future<bool> play(ProgressStore store, int stars, int moves) =>
      store.saveResult(
        gameId: 'memory',
        difficulty: GameDifficulty.easy,
        stars: stars,
        moves: moves,
        timeSeconds: 30,
      );

  test(
    'a primeira partida vira o recorde, sem contar como novo recorde',
    () async {
      final store = await memoryStore();

      expect(await play(store, 2, 10), isFalse);

      final record = store.record('memory', GameDifficulty.easy)!;
      expect(record.stars, 2);
      expect(record.moves, 10);
      expect(record.timesPlayed, 1);
      expect(store.record('memory', GameDifficulty.hard), isNull);
    },
  );

  test('resultado melhor substitui o recorde', () async {
    final store = await memoryStore();
    await play(store, 2, 10);

    expect(await play(store, 3, 12), isTrue, reason: 'mais estrelas');
    expect(
      await play(store, 3, 8),
      isTrue,
      reason: 'mesmas estrelas, menos jogadas',
    );

    final record = store.record('memory', GameDifficulty.easy)!;
    expect((record.stars, record.moves, record.timesPlayed), (3, 8, 3));
  });

  test('resultado pior mantém o recorde, mas conta a partida', () async {
    final store = await memoryStore();
    await play(store, 3, 6);

    expect(await play(store, 1, 30), isFalse);

    final record = store.record('memory', GameDifficulty.easy)!;
    expect((record.stars, record.moves, record.timesPlayed), (3, 6, 2));
  });

  test('o progresso sobrevive a reabrir o app', () async {
    final store = await memoryStore();
    await play(store, 3, 6);
    await store.setSoundEnabled(false);

    final reopened = await ProgressStore.load();
    expect(reopened.record('memory', GameDifficulty.easy)?.stars, 3);
    expect(reopened.soundEnabled, isFalse);
  });

  test('apagar o progresso mantém as preferências', () async {
    final store = await memoryStore();
    await play(store, 3, 6);
    await store.setVoiceEnabled(false);

    await store.clearProgress();

    expect(store.record('memory', GameDifficulty.easy), isNull);
    expect(store.voiceEnabled, isFalse);
  });

  test('preferências começam ligadas', () async {
    final store = await memoryStore();
    expect(store.soundEnabled, isTrue);
    expect(store.voiceEnabled, isTrue);
  });

  test('dado corrompido não derruba o app', () async {
    final store = await memoryStore({
      'progress.memory.easy': 'não é json',
      'progress.memory.medium': '{"stars":"três"}',
    });
    expect(store.record('memory', GameDifficulty.easy), isNull);
    expect(store.record('memory', GameDifficulty.medium), isNull);
  });

  test('notifica quem está ouvindo', () async {
    final store = await memoryStore();
    var notified = 0;
    store.addListener(() => notified++);

    await play(store, 3, 6);
    await store.setSoundEnabled(false);
    await store.clearProgress();

    expect(notified, 3);
  });
}
