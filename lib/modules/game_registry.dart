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
    difficulties: [
      GameDifficulty.easy,
      GameDifficulty.medium,
      GameDifficulty.hard,
    ],
    assetPath: 'assets/games/memory/index.html',
    // Mantenha em sincronia com `maxNumber` em memory-logic.js
    difficultyHints: {
      GameDifficulty.easy: 'Letras e números até 9',
      GameDifficulty.medium: 'Letras e números até 20',
      GameDifficulty.hard: 'Letras e números até 50',
    },
  ),
  const GameModule(
    id: 'which-letter',
    displayName: 'Qual é a letra?',
    iconAsset: 'assets/images/which_letter.svg',
    accentColor: Color(0xFFFF6B6B),
    ageRange: [4, 6],
    skills: ['Letras', 'Números', 'Escuta'],
    difficulties: [
      GameDifficulty.easy,
      GameDifficulty.medium,
      GameDifficulty.hard,
    ],
    assetPath: 'assets/games/which-letter/index.html',
    scoreLabel: 'erros',
    scoreLabelSingular: 'erro',
    // Mantenha em sincronia com `maxNumber` em which-letter-logic.js
    difficultyHints: {
      GameDifficulty.easy: 'Só letras',
      GameDifficulty.medium: 'Letras e números até 20',
      GameDifficulty.hard: 'Letras e números até 50',
    },
  ),
  const GameModule(
    id: 'how-many',
    displayName: 'Quantos tem?',
    iconAsset: 'assets/images/how_many.svg',
    accentColor: Color(0xFFFF9F43),
    ageRange: [3, 6],
    skills: ['Contar', 'Números'],
    difficulties: [
      GameDifficulty.easy,
      GameDifficulty.medium,
      GameDifficulty.hard,
    ],
    assetPath: 'assets/games/how-many/index.html',
    scoreLabel: 'erros',
    scoreLabelSingular: 'erro',
    // Mantenha em sincronia com `max` em how-many-logic.js
    difficultyHints: {
      GameDifficulty.easy: 'Contar de 1 a 5',
      GameDifficulty.medium: 'Contar de 1 a 10',
      GameDifficulty.hard: 'Contar de 1 a 20',
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
