import 'package:flutter/material.dart';
import 'game_module.dart';

final List<GameModule> gameRegistry = [
  const GameModule(
    id: 'memory',
    displayName: 'Jogo da Memória',
    iconAsset: 'assets/images/memory_game.svg',
    accentColor: Color(0xFF4ECDC4),
    ageRange: [3, 6],
    skills: ['Letras', 'Números', 'Memória'],
    assetPath: 'assets/games/memory/index.html',
    // Mantenha em sincronia com LEVELS em memory-logic.js (pares e maxNumber)
    difficultyHints: {
      GameDifficulty.level1: 'Letras e números até 5 · 4 pares',
      GameDifficulty.level2: 'Letras e números até 9 · 6 pares',
      GameDifficulty.level3: 'Letras e números até 15 · 8 pares',
      GameDifficulty.level4: 'Letras e números até 20 · 10 pares',
      GameDifficulty.level5: 'Letras e números até 30 · 12 pares',
      GameDifficulty.level6: 'Letras e números até 50 · 14 pares',
    },
  ),
  const GameModule(
    id: 'which-letter',
    displayName: 'Qual é a letra?',
    iconAsset: 'assets/images/which_letter.svg',
    accentColor: Color(0xFFFF6B6B),
    ageRange: [4, 6],
    skills: ['Letras', 'Números', 'Escuta'],
    assetPath: 'assets/games/which-letter/index.html',
    scoreLabel: 'erros',
    scoreLabelSingular: 'erro',
    // Mantenha em sincronia com LEVELS em which-letter-logic.js
    difficultyHints: {
      GameDifficulty.level1: 'Primeiras letras (A a M)',
      GameDifficulty.level2: 'Todas as letras',
      GameDifficulty.level3: 'Letras e números até 10',
      GameDifficulty.level4: 'Letras e números até 20, figuras parecidas',
      GameDifficulty.level5: 'Até 30, 5 figuras',
      GameDifficulty.level6: 'Até 50, 6 figuras',
    },
  ),
  const GameModule(
    id: 'how-many',
    displayName: 'Quantos tem?',
    iconAsset: 'assets/images/how_many.svg',
    accentColor: Color(0xFFFF9F43),
    ageRange: [3, 6],
    skills: ['Contar', 'Números'],
    assetPath: 'assets/games/how-many/index.html',
    scoreLabel: 'erros',
    scoreLabelSingular: 'erro',
    // Mantenha em sincronia com LEVELS em how-many-logic.js
    difficultyHints: {
      GameDifficulty.level1: 'Contar de 1 a 3',
      GameDifficulty.level2: 'Contar de 1 a 5',
      GameDifficulty.level3: 'Contar de 1 a 10',
      GameDifficulty.level4: 'Contar de 1 a 15',
      GameDifficulty.level5: 'Contar de 1 a 20',
      GameDifficulty.level6: 'Contar de 1 a 20, 5 respostas',
    },
  ),
  const GameModule(
    id: 'missing-syllable',
    displayName: 'Qual sílaba falta?',
    iconAsset: 'assets/images/missing_syllable.svg',
    accentColor: Color(0xFFA78BFA),
    ageRange: [5, 6],
    skills: ['Sílabas', 'Leitura'],
    assetPath: 'assets/games/missing-syllable/index.html',
    scoreLabel: 'erros',
    scoreLabelSingular: 'erro',
    // Mantenha em sincronia com LEVELS em missing-syllable-logic.js
    difficultyHints: {
      GameDifficulty.level1: 'Palavras de 2 sílabas, falta a última',
      GameDifficulty.level2: 'Palavras de 2 sílabas',
      GameDifficulty.level3: 'Sílabas parecidas',
      GameDifficulty.level4: 'Palavras de 3 sílabas',
      GameDifficulty.level5: '3 sílabas, sílabas parecidas',
      GameDifficulty.level6: '3 sílabas, 5 respostas',
    },
  ),
  const GameModule(
    id: 'paint',
    displayName: 'Colorir',
    iconAsset: 'assets/images/paint.svg',
    accentColor: Color(0xFFFF6B9A),
    ageRange: [3, 6],
    skills: ['Letras', 'Contorno', 'Escrita'],
    assetPath: 'assets/games/paint/index.html',
    // Aqui a pontuação são as vezes que o dedo saiu do contorno (quanto menos, melhor)
    scoreLabel: 'saídas',
    scoreLabelSingular: 'saída',
    // Mantenha em sincronia com LEVELS em paint-logic.js
    difficultyHints: {
      GameDifficulty.level1: 'Vogais',
      GameDifficulty.level2: 'Letras de traços retos',
      GameDifficulty.level3: 'Todas as letras',
      GameDifficulty.level4: 'Letras minúsculas',
      GameDifficulty.level5: 'Palavras com desenho',
      GameDifficulty.level6: 'Palavras maiores, pincel fino',
    },
  ),
  // Próximos jogos:
  // GameModule(id: 'number-puzzle', displayName: 'Quebra-Cabeça', ...)
  // GameModule(id: 'color-match',   displayName: 'Mistura de Cores', ...)
  // GameModule(id: 'letter-trace',  displayName: 'Traçar Letras', ...)
];

GameModule? findGameById(String id) =>
    gameRegistry.where((g) => g.id == id).firstOrNull;

List<GameModule> getGamesForAge(int age) => gameRegistry
    .where((g) => g.ageRange[0] <= age && age <= g.ageRange[1])
    .toList();
