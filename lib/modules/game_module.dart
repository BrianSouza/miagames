import 'package:flutter/material.dart';

enum GameDifficulty { easy, medium, hard }

extension GameDifficultyLabel on GameDifficulty {
  String get label => switch (this) {
    GameDifficulty.easy => 'Fácil',
    GameDifficulty.medium => 'Médio',
    GameDifficulty.hard => 'Difícil',
  };

  /// Nível em barras (1 a 3). Estrelas ficam reservadas para o desempenho.
  int get level => switch (this) {
    GameDifficulty.easy => 1,
    GameDifficulty.medium => 2,
    GameDifficulty.hard => 3,
  };

  String get description => switch (this) {
    GameDifficulty.easy => 'Perfeito para começar',
    GameDifficulty.medium => 'Um desafio justo',
    GameDifficulty.hard => 'Para os especialistas',
  };
}

class GameModule {
  final String id;
  final String displayName;

  /// Ilustração do jogo (SVG em assets/images/)
  final String iconAsset;
  final Color accentColor;
  final List<int> ageRange;
  final List<String> skills;
  final List<GameDifficulty> difficulties;

  // Path to the game's index.html inside Flutter assets.
  final String assetPath;

  const GameModule({
    required this.id,
    required this.displayName,
    required this.iconAsset,
    required this.accentColor,
    required this.ageRange,
    required this.skills,
    required this.difficulties,
    required this.assetPath,
  });
}
