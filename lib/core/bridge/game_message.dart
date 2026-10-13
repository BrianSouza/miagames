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
      'GAME_COMPLETE' => GameComplete(data),
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

/// Partida concluída — base para salvar progresso no futuro.
class GameComplete extends GameMessage {
  const GameComplete(this.data);
  final Map<String, dynamic> data;
}
