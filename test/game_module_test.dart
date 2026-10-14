import 'dart:ui' show Color;
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:miagames/modules/game_module.dart';
import 'package:miagames/modules/game_registry.dart';

void main() {
  final memory = findGameById('memory')!;

  test('cada dificuldade do Jogo da Memória tem um texto próprio', () {
    for (final difficulty in memory.difficulties) {
      expect(
        memory.hintFor(difficulty),
        isNot(difficulty.description),
        reason: 'o nível ${difficulty.label} deveria dizer o que traz',
      );
    }
  });

  test('sem texto próprio, usa a descrição genérica da dificuldade', () {
    const game = GameModule(
      id: 'x',
      displayName: 'X',
      iconAsset: 'x.svg',
      accentColor: Color(0xFF000000),
      ageRange: [3, 6],
      skills: [],
      difficulties: [GameDifficulty.easy],
      assetPath: 'x.html',
    );
    expect(game.hintFor(GameDifficulty.easy), GameDifficulty.easy.description);
  });

  // Os textos do app e o alcance real dos números (memory-logic.js) não podem
  // se desencontrar: o app diria "até 50" e o jogo sortearia outra coisa.
  test('os textos de dificuldade batem com maxNumber do jogo', () {
    final logic = File(
      'assets/games/memory/memory-logic.js',
    ).readAsStringSync();
    final max = {
      for (final m in RegExp(
        r'(easy|medium|hard):\s*\{[^}]*maxNumber:\s*(\d+)',
      ).allMatches(logic))
        m[1]!: int.parse(m[2]!),
    };
    expect(max, {'easy': 9, 'medium': 20, 'hard': 50});

    for (final difficulty in GameDifficulty.values) {
      expect(
        memory.hintFor(difficulty),
        contains('até ${max[difficulty.name]}'),
        reason: difficulty.name,
      );
    }
  });

  test('os textos de dificuldade do "Qual é a letra?" batem com o jogo', () {
    final game = findGameById('which-letter')!;
    final logic = File(
      'assets/games/which-letter/which-letter-logic.js',
    ).readAsStringSync();
    final max = {
      for (final m in RegExp(
        r'(easy|medium|hard):\s*\{[^}]*maxNumber:\s*(\d+|null)',
      ).allMatches(logic))
        m[1]!: m[2]!,
    };
    expect(max, {'easy': 'null', 'medium': '20', 'hard': '50'});

    expect(game.hintFor(GameDifficulty.easy), 'Só letras');
    expect(game.hintFor(GameDifficulty.medium), contains('até 20'));
    expect(game.hintFor(GameDifficulty.hard), contains('até 50'));
  });

  test('os textos de dificuldade do "Quantos tem?" batem com o jogo', () {
    final game = findGameById('how-many')!;
    final logic = File(
      'assets/games/how-many/how-many-logic.js',
    ).readAsStringSync();
    final max = {
      for (final m in RegExp(
        r'(easy|medium|hard):\s*\{[^}]*max:\s*(\d+)',
      ).allMatches(logic))
        m[1]!: int.parse(m[2]!),
    };
    expect(max, {'easy': 5, 'medium': 10, 'hard': 20});

    for (final difficulty in GameDifficulty.values) {
      expect(
        game.hintFor(difficulty),
        'Contar de 1 a ${max[difficulty.name]}',
        reason: difficulty.name,
      );
    }
  });

  test('os textos de dificuldade do "Qual sílaba falta?" batem com o jogo', () {
    final game = findGameById('missing-syllable')!;
    final logic = File(
      'assets/games/missing-syllable/missing-syllable-logic.js',
    ).readAsStringSync();
    final config = {
      for (final m in RegExp(
        r'(easy|medium|hard):\s*\{[^}]*syllables:\s*(\d+)[^}]*similar:\s*(true|false)',
      ).allMatches(logic))
        m[1]!: (int.parse(m[2]!), m[3] == 'true'),
    };
    expect(config, {
      'easy': (2, false),
      'medium': (2, true),
      'hard': (3, true),
    });

    expect(game.hintFor(GameDifficulty.easy), 'Palavras de 2 sílabas');
    expect(game.hintFor(GameDifficulty.medium), 'Sílabas parecidas');
    expect(game.hintFor(GameDifficulty.hard), 'Palavras de 3 sílabas');
  });

  test('cada jogo tem id único, ilustração e conta erros ou jogadas', () {
    final ids = gameRegistry.map((g) => g.id).toList();
    expect(ids.toSet().length, ids.length);
    for (final game in gameRegistry) {
      expect(File(game.iconAsset).existsSync(), isTrue, reason: game.id);
      expect(File(game.assetPath).existsSync(), isTrue, reason: game.id);
      expect(['jogadas', 'erros'], contains(game.scoreLabel), reason: game.id);
    }
  });
}
