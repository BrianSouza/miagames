import '../core/storage/progress_store.dart';
import 'game_module.dart';

/// Estrelas que um nível precisa render para abrir o seguinte.
const unlockStars = 2;

/// O nível está aberto? O 1 sempre está; cada um dos outros abre quando o
/// anterior rendeu [unlockStars] estrelas ou mais.
bool isUnlocked(
  ProgressStore store,
  GameModule game,
  GameDifficulty difficulty,
) {
  final previous = difficulty.previous;
  if (previous == null || !game.difficulties.contains(difficulty)) {
    return game.difficulties.isNotEmpty &&
        difficulty == game.difficulties.first;
  }
  return (store.record(game.id, previous)?.stars ?? 0) >= unlockStars;
}

/// Quantos níveis estão abertos (de 1 até o total do jogo).
int unlockedCount(ProgressStore store, GameModule game) =>
    game.difficulties.where((d) => isUnlocked(store, game, d)).length;

/// O nível que a Mia sugere: o mais alto que já está aberto. Com todos abertos e
/// feitos, é o último.
GameDifficulty recommendedDifficulty(ProgressStore store, GameModule game) {
  var best = game.difficulties.first;
  for (final difficulty in game.difficulties) {
    if (isUnlocked(store, game, difficulty)) best = difficulty;
  }
  return best;
}
