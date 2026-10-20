/// Onde o acessório fica na Mia. Cada espaço tem no máximo um item vestido.
enum OutfitSlot { hat, face, neck }

/// Um acessório da Mia. O desenho é `outfit_<id>.svg` (em assets/images/mia/ para o app e em
/// assets/games/_shared/img/ para os jogos), gerado por `tool/mia.py`.
class Outfit {
  const Outfit({
    required this.id,
    required this.slot,
    required this.name,
    required this.stars,
  });

  final String id;
  final OutfitSlot slot;

  /// O nome, também o que a voz fala
  final String name;

  /// Quantas estrelas (somadas, de todos os jogos e níveis) abrem o item
  final int stars;

  String get asset => 'assets/images/mia/outfit_$id.svg';
}

/// Os acessórios, na ordem em que abrem. As estrelas somadas chegam a 90 (5 jogos × 6 níveis ×
/// 3 estrelas): o último item pede 72, o que só vem depois de muito jogo.
const outfits = <Outfit>[
  Outfit(id: 'flower', slot: OutfitSlot.hat, name: 'Florzinha', stars: 3),
  Outfit(id: 'party', slot: OutfitSlot.hat, name: 'Chapéu de festa', stars: 7),
  Outfit(id: 'glasses', slot: OutfitSlot.face, name: 'Óculos', stars: 12),
  Outfit(id: 'tiara', slot: OutfitSlot.hat, name: 'Tiara', stars: 18),
  Outfit(id: 'scarf', slot: OutfitSlot.neck, name: 'Cachecol', stars: 26),
  Outfit(id: 'crown', slot: OutfitSlot.hat, name: 'Coroa', stars: 35),
  Outfit(
    id: 'sunglasses',
    slot: OutfitSlot.face,
    name: 'Óculos escuros',
    stars: 46,
  ),
  Outfit(id: 'medal', slot: OutfitSlot.neck, name: 'Medalha', stars: 58),
  Outfit(
    id: 'pirate',
    slot: OutfitSlot.hat,
    name: 'Chapéu de pirata',
    stars: 72,
  ),
];

Outfit? findOutfit(String id) => outfits.where((o) => o.id == id).firstOrNull;

/// Os itens que [totalStars] estrelas já abriram.
List<Outfit> unlockedOutfits(int totalStars) =>
    outfits.where((o) => o.stars <= totalStars).toList();

/// Quantas estrelas faltam para abrir [outfit] (0 se já abriu).
int starsMissing(Outfit outfit, int totalStars) =>
    outfit.stars > totalStars ? outfit.stars - totalStars : 0;

/// A lista de [ids] vestidos, sem repetir espaço (o último de cada espaço vale) e só com
/// os itens que existem.
List<Outfit> dressFrom(Iterable<String> ids) {
  final bySlot = <OutfitSlot, Outfit>{};
  for (final id in ids) {
    final outfit = findOutfit(id);
    if (outfit != null) bySlot[outfit.slot] = outfit;
  }
  return bySlot.values.toList();
}

/// Veste [outfit]: troca o que estava no mesmo espaço. Devolve os ids vestidos.
List<String> wear(Iterable<String> worn, Outfit outfit) => [
  for (final id in worn)
    if (findOutfit(id)?.slot != outfit.slot) id,
  outfit.id,
];

/// Tira [outfit]. Devolve os ids vestidos.
List<String> takeOff(Iterable<String> worn, Outfit outfit) => [
  for (final id in worn)
    if (id != outfit.id) id,
];
