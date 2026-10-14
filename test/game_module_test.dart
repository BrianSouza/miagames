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
}
