import 'dart:io';
import 'dart:ui' show Color;

import 'package:flutter_test/flutter_test.dart';
import 'package:miagames/modules/game_module.dart';
import 'package:miagames/modules/game_registry.dart';

/// Lê a tabela `var LEVELS = [ {...}, ... ];` de um arquivo de regras (JS) e devolve
/// uma lista de mapas chave → valor, um por nível.
List<Map<String, String>> levelsOf(String file) {
  final source = File(file).readAsStringSync();
  final table = RegExp(
    r'var LEVELS = \[(.*?)\];',
    dotAll: true,
  ).firstMatch(source)!.group(1)!;
  return [
    for (final object in RegExp(r'\{([^}]*)\}').allMatches(table))
      {
        for (final pair in RegExp(
          r'(\w+):\s*([\w.]+)',
        ).allMatches(object.group(1)!))
          pair.group(1)!: pair.group(2)!,
      },
  ];
}

void main() {
  final memory = findGameById('memory')!;

  test('os níveis vão do 1 ao 6, com nome e voz', () {
    expect(GameDifficulty.values.map((d) => d.level), [1, 2, 3, 4, 5, 6]);
    expect(GameDifficulty.level3.label, 'Nível 3');
    expect(GameDifficulty.level3.spoken, 'Nível três');
    expect(GameDifficulty.level1.previous, isNull);
    expect(GameDifficulty.level4.previous, GameDifficulty.level3);
  });

  test('todo jogo tem os 6 níveis e um texto para cada um', () {
    for (final game in gameRegistry) {
      expect(game.difficulties, GameDifficulty.values, reason: game.id);
      for (final difficulty in game.difficulties) {
        expect(
          game.hintFor(difficulty),
          isNotEmpty,
          reason: '${game.id} ${difficulty.label}',
        );
      }
    }
  });

  test('sem texto próprio, a dica fica vazia', () {
    const game = GameModule(
      id: 'x',
      displayName: 'X',
      iconAsset: 'x.svg',
      accentColor: Color(0xFF000000),
      ageRange: [3, 6],
      skills: [],
      assetPath: 'x.html',
    );
    expect(game.hintFor(GameDifficulty.level1), '');
  });

  // Os textos do app e o que o jogo faz de verdade não podem se desencontrar: o app
  // diria "até 50" e o jogo sortearia outra coisa.
  group('os textos de nível batem com a tabela LEVELS do jogo', () {
    test('Jogo da Memória: pares e alcance dos números', () {
      final levels = levelsOf('assets/games/memory/memory-logic.js');
      expect(levels.length, 6);
      for (final difficulty in GameDifficulty.values) {
        final level = levels[difficulty.index];
        expect(
          memory.hintFor(difficulty),
          'Letras e números até ${level['maxNumber']} · ${level['pairs']} pares',
          reason: difficulty.label,
        );
      }
    });

    test('Qual é a letra?: alcance dos números e quantidade de figuras', () {
      final game = findGameById('which-letter')!;
      final levels = levelsOf(
        'assets/games/which-letter/which-letter-logic.js',
      );
      expect(levels.length, 6);
      for (final difficulty in GameDifficulty.values) {
        final level = levels[difficulty.index];
        final hint = game.hintFor(difficulty);
        if (level['maxNumber'] != 'null') {
          expect(
            hint,
            contains('${level['maxNumber']}'),
            reason: difficulty.label,
          );
        } else {
          expect(hint, isNot(contains('números')), reason: difficulty.label);
        }
        if (difficulty.level >= 5) {
          expect(
            hint,
            contains('${level['options']} figuras'),
            reason: difficulty.label,
          );
        }
      }
      expect(levels.map((l) => l['firstLetters']).toList(), [
        'true',
        'false',
        'false',
        'false',
        'false',
        'false',
      ]);
      expect(game.hintFor(GameDifficulty.level1), contains('A a M'));
    });

    test('Quantos tem?: até quantos objetos', () {
      final game = findGameById('how-many')!;
      final levels = levelsOf('assets/games/how-many/how-many-logic.js');
      expect(levels.length, 6);
      for (final difficulty in GameDifficulty.values) {
        expect(
          game.hintFor(difficulty),
          startsWith('Contar de 1 a ${levels[difficulty.index]['max']}'),
          reason: difficulty.label,
        );
      }
    });

    test('Qual sílaba falta?: sílabas da palavra, parecidas e respostas', () {
      final game = findGameById('missing-syllable')!;
      final levels = levelsOf(
        'assets/games/missing-syllable/missing-syllable-logic.js',
      );
      expect(levels.length, 6);
      for (final difficulty in GameDifficulty.values) {
        final level = levels[difficulty.index];
        final hint = game.hintFor(difficulty);
        if (level['similar'] == 'false') {
          expect(
            hint,
            contains('${level['syllables']} sílabas'),
            reason: difficulty.label,
          );
        }
        if (level['options'] == '5') {
          expect(hint, contains('5 respostas'), reason: difficulty.label);
        }
        if (level['blank'] == 'last') {
          expect(hint, contains('última'), reason: difficulty.label);
        }
      }
    });
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
