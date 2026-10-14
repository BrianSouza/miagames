import '../../modules/game_module.dart';
import '../audio/narrator.dart';
import '../storage/progress_store.dart';
import 'game_message.dart';

/// Ponte de uma partida entre o Flutter e o mini-jogo, sem depender da
/// WebView: monta a configuração inicial e trata as mensagens recebidas.
class GameSession {
  GameSession({
    required this.game,
    required this.difficulty,
    required this.narrator,
    required this.store,
    required this.onNavigateBack,
  });

  final GameModule game;
  final GameDifficulty difficulty;
  final Narrator narrator;
  final ProgressStore store;
  final void Function() onNavigateBack;

  /// Enviado ao jogo em `window.handleFlutterMessage(...)` ao carregar.
  Map<String, Object?> initMessage() {
    final best = store.record(game.id, difficulty);
    return {
      'type': 'INIT',
      'gameId': game.id,
      'difficulty': difficulty.name,
      'sound': store.soundEnabled,
      'best': best == null ? null : {'stars': best.stars, 'moves': best.moves},
    };
  }

  Future<void> handle(String raw) async {
    switch (GameMessage.parse(raw)) {
      case NavigateBack():
        onNavigateBack();
      case Speak(:final text):
        await narrator.speak(text);
      case GameComplete(:final stars, :final moves, :final timeSeconds):
        await store.saveResult(
          gameId: game.id,
          difficulty: difficulty,
          stars: stars,
          moves: moves,
          timeSeconds: timeSeconds,
        );
      case null:
        break;
    }
  }
}
