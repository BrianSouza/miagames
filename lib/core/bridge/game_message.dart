import 'dart:convert';

/// Mensagens que um mini-jogo (WebView) envia ao Flutter pelo canal
/// `MiaGamesFlutter`. O JSON vem de dentro da WebView, então qualquer
/// mensagem malformada vira `null` em vez de derrubar a tela.
sealed class GameMessage {
  const GameMessage();

  static GameMessage? parse(String raw) {
    final Object? data;
    try {
      data = jsonDecode(raw);
    } on FormatException {
      return null;
    }
    if (data is! Map<String, dynamic>) return null;

    return switch (data['type']) {
      'NAVIGATE_BACK' => const NavigateBack(),
      'SPEAK' => switch (data['text']) {
        final String text when text.trim().isNotEmpty => Speak(text),
        _ => null,
      },
      'GAME_COMPLETE' => GameComplete.fromJson(data),
      _ => null,
    };
  }
}

/// O jogo pediu para voltar à Home.
class NavigateBack extends GameMessage {
  const NavigateBack();
}

/// O jogo pediu para o Flutter falar um texto (a voz do navegador não
/// funciona na WebView do Android).
class Speak extends GameMessage {
  const Speak(this.text);
  final String text;
}

/// Partida concluída. Só os números que o Flutter salva; jogo e dificuldade
/// vêm da própria tela, não da mensagem.
class GameComplete extends GameMessage {
  const GameComplete({
    required this.stars,
    required this.moves,
    required this.timeSeconds,
  });

  final int stars;
  final int moves;
  final int timeSeconds;

  static GameComplete? fromJson(Map<String, dynamic> data) {
    final stars = data['stars'];
    final moves = data['moves'];
    final time = data['timeSeconds'];
    if (stars is! int || stars < 1 || stars > 3) return null;
    if (moves is! int || moves < 0) return null;
    if (time is! int || time < 0) return null;
    return GameComplete(stars: stars, moves: moves, timeSeconds: time);
  }
}
