import 'dart:convert';

import '../../modules/furniture.dart';
import '../../modules/game_module.dart';
import '../../modules/outfit_progress.dart';
import '../../modules/room_state.dart';
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
      'level': difficulty.level,
      'sound': store.soundEnabled,
      // o que a Mia veste: os jogos desenham as camadas por cima dela
      'outfit': wornOutfits(store).map((o) => o.id).toList(),
      'best': best == null ? null : {'stars': best.stars, 'moves': best.moves},
      if (game.freePlay) ..._roomConfig(),
    };
  }

  /// O que só um jogo livre (o quarto) recebe: os móveis, com o que está aberto, e o quarto salvo.
  /// Quem decide o que está aberto é o Flutter; o jogo só desenha o que vem `open`.
  Map<String, Object?> _roomConfig() {
    final total = totalStars(store);
    return {
      'totalStars': total,
      'furniture': [
        for (final item in furniture)
          {
            'id': item.id,
            'name': item.name,
            'stars': item.stars,
            'open': item.stars <= total,
          },
      ],
      'state': _savedRoom(total)?.toJson(),
    };
  }

  /// O quarto salvo, só com os móveis que ainda estão abertos (apagar o progresso os fecha de novo).
  RoomLayout? _savedRoom(int total) {
    final raw = store.gameState(game.id);
    if (raw == null) return null;
    try {
      return RoomLayout.fromJson(
        jsonDecode(raw),
        allowedIds: _openFurnitureIds(total),
      );
    } on FormatException {
      return null; // dado corrompido não derruba o app
    }
  }

  Set<String> _openFurnitureIds(int total) => {
    for (final item in unlockedFurniture(total)) item.id,
  };

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
      case SaveState(:final state):
        // só o jogo livre guarda estado; o quarto é conferido (e filtrado) antes de salvar
        if (!game.freePlay) break;
        final layout = RoomLayout.fromJson(
          state,
          allowedIds: _openFurnitureIds(totalStars(store)),
        );
        if (layout != null) {
          await store.setGameState(game.id, jsonEncode(layout.toJson()));
        }
      case null:
        break;
    }
  }
}
