import 'package:flutter/material.dart';
import 'game_module.dart';

final List<GameModule> gameRegistry = [
  const GameModule(
    id:          'memory',
    displayName: 'Jogo da Memória',
    icon:        '🧠',
    accentColor: Color(0xFF4ECDC4),
    ageRange:    [3, 6],
    skills:      ['Memória', 'Atenção', 'Concentração'],
    difficulties: [
      GameDifficulty.easy,
      GameDifficulty.medium,
      GameDifficulty.hard,
    ],
    assetPath: 'assets/games/memory/index.html',
  ),
  // Próximos jogos:
  // GameModule(id: 'number-puzzle', displayName: 'Quebra-Cabeça', ...)
  // GameModule(id: 'color-match',   displayName: 'Mistura de Cores', ...)
  // GameModule(id: 'letter-trace',  displayName: 'Traçar Letras', ...)
];

GameModule? findGameById(String id) {
  try {
    return gameRegistry.firstWhere((g) => g.id == id);
  } catch (_) {
    return null;
  }
}

List<GameModule> getGamesForAge(int age) =>
    gameRegistry.where((g) => g.ageRange[0] <= age && age <= g.ageRange[1]).toList();
