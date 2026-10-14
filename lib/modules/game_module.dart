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

  /// O que cada nível traz neste jogo (ex.: "Números até 50"). Se um nível não
  /// tiver texto aqui, o seletor mostra a descrição genérica da dificuldade.
  final Map<GameDifficulty, String> difficultyHints;

  // Path to the game's index.html inside Flutter assets.
  final String assetPath;

  /// Como a pontuação ("moves" do GAME_COMPLETE) é chamada na Área dos pais:
  /// "jogadas" no Jogo da Memória, "erros" nos jogos de responder.
  /// Nos dois, quanto menos, melhor.
  final String scoreLabel;
  final String scoreLabelSingular;

  /// Cor do cartão na Home. Sem ela, usa uma versão clara de [accentColor]
  /// (texto escuro por cima, com bom contraste).
  final Color? tileColor;

  const GameModule({
    required this.id,
    required this.displayName,
    required this.iconAsset,
    required this.accentColor,
    required this.ageRange,
    required this.skills,
    required this.difficulties,
    required this.assetPath,
    this.difficultyHints = const {},
    this.scoreLabel = 'jogadas',
    this.scoreLabelSingular = 'jogada',
    this.tileColor,
  });

  Color get tile =>
      tileColor ?? Color.lerp(accentColor, const Color(0xFFFFFFFF), 0.65)!;

  /// "1 jogada", "6 jogadas", "0 erros"
  String scoreText(int value) =>
      '$value ${value == 1 ? scoreLabelSingular : scoreLabel}';

  String hintFor(GameDifficulty difficulty) =>
      difficultyHints[difficulty] ?? difficulty.description;
}
