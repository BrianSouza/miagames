import '../core/storage/progress_store.dart';
import 'game_module.dart';

/// O nível que a Mia sugere: o primeiro em que a criança ainda não tem as 3
/// estrelas. Com todos já dominados, o mais difícil.
GameDifficulty recommendedDifficulty(ProgressStore store, GameModule game) {
  for (final difficulty in game.difficulties) {
    final record = store.record(game.id, difficulty);
    if (record == null || record.stars < 3) return difficulty;
  }
  return game.difficulties.last;
}
