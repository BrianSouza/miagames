import '../core/storage/progress_store.dart';
import 'game_registry.dart';
import 'outfits.dart';

/// Todas as estrelas ganhas: a soma dos recordes de todos os jogos e níveis.
int totalStars(ProgressStore store) => [
  for (final game in gameRegistry)
    for (final difficulty in game.difficulties)
      store.record(game.id, difficulty)?.stars ?? 0,
].fold(0, (sum, stars) => sum + stars);

/// O que a Mia está vestindo: só itens que já estão abertos (apagar o progresso fecha os itens
/// de novo, e eles saem dela).
List<Outfit> wornOutfits(ProgressStore store) {
  final total = totalStars(store);
  // os fechados saem ANTES de resolver o espaço: um item fechado não pode tirar o aberto do lugar
  return dressFrom(
    store.wornOutfitIds.where((id) {
      final outfit = findOutfit(id);
      return outfit != null && outfit.stars <= total;
    }),
  );
}
