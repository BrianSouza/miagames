import 'package:flutter/material.dart';

/// Os 6 níveis de um jogo, do 1 ao 6. Cada nível novo só abre quando o anterior
/// rende 2 estrelas (veja `level_progress.dart`).
enum GameDifficulty { level1, level2, level3, level4, level5, level6 }

extension GameDifficultyLabel on GameDifficulty {
  /// Número do nível (1 a 6). O jogo recebe este número em `INIT.level`.
  int get level => index + 1;

  String get label => 'Nível $level';

  /// O que a voz fala ao tocar no nível
  String get spoken => const [
    'Nível um',
    'Nível dois',
    'Nível três',
    'Nível quatro',
    'Nível cinco',
    'Nível seis',
  ][index];

  /// O nível anterior (null no primeiro)
  GameDifficulty? get previous =>
      index == 0 ? null : GameDifficulty.values[index - 1];
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

  /// O que cada nível traz neste jogo (ex.: "Números até 50"), para os pais.
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
    this.difficulties = GameDifficulty.values,
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
      difficultyHints[difficulty] ?? '';
}
