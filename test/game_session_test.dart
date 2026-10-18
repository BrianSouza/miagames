import 'package:flutter_test/flutter_test.dart';
import 'package:miagames/core/bridge/game_session.dart';
import 'package:miagames/core/storage/progress_store.dart';
import 'package:miagames/modules/game_module.dart';
import 'package:miagames/modules/game_registry.dart';

import 'fake_narrator.dart';
import 'test_helpers.dart';

void main() {
  late ProgressStore store;
  late FakeNarrator narrator;
  late int backs;
  late GameSession session;

  setUp(() async {
    store = await memoryStore();
    narrator = FakeNarrator();
    backs = 0;
    session = GameSession(
      game: gameRegistry.first,
      difficulty: GameDifficulty.level2,
      narrator: narrator,
      store: store,
      onNavigateBack: () => backs++,
    );
  });

  test('INIT leva dificuldade, preferência de som e recorde', () async {
    expect(session.initMessage(), {
      'type': 'INIT',
      'gameId': 'memory',
      'level': 2,
      'sound': true,
      'best': null,
    });

    await store.setSoundEnabled(false);
    await store.saveResult(
      gameId: 'memory',
      difficulty: GameDifficulty.level2,
      stars: 2,
      moves: 11,
      timeSeconds: 40,
    );

    expect(session.initMessage()['sound'], isFalse);
    expect(session.initMessage()['best'], {'stars': 2, 'moves': 11});
  });

  test(
    'GAME_COMPLETE salva o resultado no jogo e dificuldade da tela',
    () async {
      // gameId/difficulty da mensagem são ignorados: valem os da tela
      await session.handle(
        '{"type":"GAME_COMPLETE","gameId":"outro","difficulty":"hard",'
        '"stars":3,"moves":8,"timeSeconds":25}',
      );

      final record = store.record('memory', GameDifficulty.level2);
      expect(record?.stars, 3);
      expect(record?.moves, 8);
      expect(store.record('memory', GameDifficulty.level3), isNull);
    },
  );

  test('SPEAK fala pelo narrador e NAVIGATE_BACK volta', () async {
    await session.handle('{"type":"SPEAK","text":"Gato"}');
    await session.handle('{"type":"NAVIGATE_BACK"}');

    expect(narrator.spoken, ['Gato']);
    expect(backs, 1);
  });

  test('mensagens inválidas são ignoradas', () async {
    await session.handle('lixo');
    await session.handle('{"type":"GAME_COMPLETE","stars":9}');

    expect(narrator.spoken, isEmpty);
    expect(backs, 0);
    expect(store.record('memory', GameDifficulty.level2), isNull);
  });
}
