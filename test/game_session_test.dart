import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:miagames/core/bridge/game_session.dart';
import 'package:miagames/core/storage/progress_store.dart';
import 'package:miagames/modules/furniture.dart';
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

  test('INIT leva o nível, a preferência de som e o recorde', () async {
    expect(session.initMessage(), {
      'type': 'INIT',
      'gameId': 'memory',
      'level': 2,
      'sound': true,
      'outfit': <String>[],
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

  test('INIT leva o que a Mia está vestindo (só itens abertos)', () async {
    // 3 estrelas abrem a florzinha; a coroa (35) continua fechada
    await store.saveResult(
      gameId: 'memory',
      difficulty: GameDifficulty.level1,
      stars: 3,
      moves: 4,
      timeSeconds: 10,
    );
    await store.setWornOutfitIds(['flower', 'crown']);

    expect(session.initMessage()['outfit'], ['flower']);
  });

  group('quarto da Mia (jogo livre)', () {
    late GameModule roomGame;
    late GameSession room;

    setUp(() {
      roomGame = findGameById('mia-room')!;
      room = GameSession(
        game: roomGame,
        difficulty: GameDifficulty.level1,
        narrator: narrator,
        store: store,
        onNavigateBack: () => backs++,
      );
    });

    Future<void> save(Object state) =>
        room.handle(jsonEncode({'type': 'SAVE_STATE', 'state': state}));

    Map<String, Object?>? saved() {
      final raw = store.gameState('mia-room');
      return raw == null ? null : jsonDecode(raw) as Map<String, Object?>;
    }

    test(
      'INIT leva os móveis, com o que já abriu, as estrelas e o quarto salvo',
      () {
        final init = room.initMessage();

        expect(init['gameId'], 'mia-room');
        expect(init['level'], 1);
        expect(init['totalStars'], 0);
        expect(
          init['state'],
          isNull,
          reason: 'primeira vez: o jogo monta o quarto',
        );
        final items = (init['furniture'] as List).cast<Map<String, Object?>>();
        expect(items.map((f) => f['id']), furniture.map((f) => f.id));
        expect(items.where((f) => f['open'] == true).map((f) => f['id']), [
          'bed',
          'rug',
          'plant',
        ]);
        final lamp = items.firstWhere((f) => f['id'] == 'lamp');
        expect(lamp, {
          'id': 'lamp',
          'name': 'Abajur',
          'stars': 8,
          'open': false,
        });
      },
    );

    test('os outros jogos não recebem móveis nem estado', () {
      final init = session.initMessage();
      expect(init.containsKey('furniture'), isFalse);
      expect(init.containsKey('state'), isFalse);
      expect(init.containsKey('totalStars'), isFalse);
    });

    test('as estrelas ganhas nos outros jogos abrem móveis no INIT', () async {
      await store.saveResult(
        gameId: 'memory',
        difficulty: GameDifficulty.level1,
        stars: 3,
        moves: 4,
        timeSeconds: 10,
      );
      await store.saveResult(
        gameId: 'paint',
        difficulty: GameDifficulty.level1,
        stars: 3,
        moves: 4,
        timeSeconds: 10,
      );

      final init = room.initMessage();
      expect(init['totalStars'], 6);
      final open = (init['furniture'] as List)
          .cast<Map<String, Object?>>()
          .where((f) => f['open'] == true)
          .map((f) => f['id']);
      expect(open, ['bed', 'rug', 'plant', 'table']);
    });

    test('SAVE_STATE guarda o quarto e o INIT seguinte o devolve', () async {
      await save({
        'items': [
          {'id': 'bed', 'x': 0.25, 'y': 0.6},
          {'id': 'rug', 'x': 0.6, 'y': 0.8},
        ],
        'mia': {'x': 0.5, 'y': 0.7},
      });

      expect(saved(), {
        'items': [
          {'id': 'bed', 'x': 0.25, 'y': 0.6},
          {'id': 'rug', 'x': 0.6, 'y': 0.8},
        ],
        'mia': {'x': 0.5, 'y': 0.7},
      });
      expect(room.initMessage()['state'], saved());
    });

    test(
      'só o que passa na conferência é salvo: móveis fechados, ids estranhos e posições fora do quarto',
      () async {
        await save({
          'items': [
            {'id': 'bed', 'x': 4, 'y': -1},
            {'id': 'tent', 'x': 0.5, 'y': 0.5}, // fechado
            {'id': '../bed', 'x': 0.5, 'y': 0.5},
            {'id': 'rug', 'x': 'meio', 'y': 0.5},
          ],
          'lixo': 'qualquer coisa',
        });

        expect(saved(), {
          'items': [
            {'id': 'bed', 'x': 1.0, 'y': 0.0},
          ],
        });
      },
    );

    test(
      'um estado que não é um quarto não apaga o quarto que já estava salvo',
      () async {
        await save({
          'items': [
            {'id': 'bed', 'x': 0.5, 'y': 0.5},
          ],
        });
        final before = store.gameState('mia-room');

        await save({'lixo': 1});
        await room.handle('{"type":"SAVE_STATE","state":[1]}');
        await room.handle('{"type":"SAVE_STATE"}');

        expect(store.gameState('mia-room'), before);
      },
    );

    test('um quarto vazio é salvo (a criança tirou tudo)', () async {
      await save({'items': []});
      expect(saved(), {'items': []});
      expect(room.initMessage()['state'], {'items': []});
    });

    test(
      'móveis que fecham de novo (progresso apagado) saem do quarto ao ler',
      () async {
        await store.saveResult(
          gameId: 'memory',
          difficulty: GameDifficulty.level1,
          stars: 3,
          moves: 4,
          timeSeconds: 10,
        );
        await store.saveResult(
          gameId: 'paint',
          difficulty: GameDifficulty.level1,
          stars: 3,
          moves: 4,
          timeSeconds: 10,
        );
        await save({
          'items': [
            {'id': 'bed', 'x': 0.2, 'y': 0.5},
            {'id': 'table', 'x': 0.7, 'y': 0.5}, // 4 estrelas: aberto com 6
          ],
        });
        expect((saved()!['items'] as List).map((i) => (i as Map)['id']), [
          'bed',
          'table',
        ]);

        await store.clearProgress();

        final shown = room.initMessage()['state'] as Map<String, Object?>;
        expect((shown['items'] as List).map((i) => (i as Map)['id']), ['bed']);
        // e a mesa continua guardada: volta quando as estrelas voltarem
        expect((saved()!['items'] as List).map((i) => (i as Map)['id']), [
          'bed',
          'table',
        ]);
      },
    );

    test('um estado salvo corrompido não derruba o INIT', () async {
      await store.setGameState('mia-room', 'isto não é json {');
      expect(room.initMessage()['state'], isNull);
    });

    test(
      'só o jogo livre guarda estado: nos outros, SAVE_STATE é ignorado',
      () async {
        await session.handle(
          '{"type":"SAVE_STATE","state":{"items":[{"id":"bed","x":0.5,"y":0.5}]}}',
        );
        expect(store.gameState('memory'), isNull);
      },
    );

    test(
      'o quarto nunca grava recorde (não há GAME_COMPLETE para ele)',
      () async {
        await save({
          'items': [
            {'id': 'bed', 'x': 0.5, 'y': 0.5},
          ],
        });
        for (final difficulty in GameDifficulty.values) {
          expect(store.record('mia-room', difficulty), isNull);
        }
      },
    );
  });
}
