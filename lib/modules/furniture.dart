/// Um móvel (ou objeto) que a criança pode pôr no quarto da Mia. Abre pelas estrelas somadas de
/// todos os jogos, como os acessórios dela (veja `outfits.dart`): ganhar estrelas nunca é gasto.
class Furniture {
  const Furniture({required this.id, required this.name, required this.stars});

  /// Só letras minúsculas (a-z): vira parte do nome do desenho (`img/<id>.svg`) e do JSON salvo.
  final String id;
  final String name;

  /// Quantas estrelas somadas abrem este móvel (0 = já vem aberto).
  final int stars;
}

/// Os móveis, na ordem em que abrem. Os três primeiros já vêm abertos, para a criança começar a
/// brincar na hora; o último pede 78 das 144 estrelas possíveis (8 jogos × 6 níveis × 3 estrelas).
const furniture = <Furniture>[
  Furniture(id: 'bed', name: 'Caminha', stars: 0),
  Furniture(id: 'rug', name: 'Tapete', stars: 0),
  Furniture(id: 'plant', name: 'Vasinho', stars: 0),
  Furniture(id: 'table', name: 'Mesinha', stars: 4),
  Furniture(id: 'lamp', name: 'Abajur', stars: 8),
  Furniture(id: 'chest', name: 'Baú de brinquedos', stars: 13),
  Furniture(id: 'frame', name: 'Quadro', stars: 19),
  Furniture(id: 'shelf', name: 'Estante', stars: 26),
  Furniture(id: 'chair', name: 'Poltrona', stars: 34),
  Furniture(id: 'yarn', name: 'Novelo de lã', stars: 43),
  Furniture(id: 'bowl', name: 'Aquário', stars: 53),
  Furniture(id: 'clock', name: 'Relógio', stars: 64),
  Furniture(id: 'tent', name: 'Cabana', stars: 78),
];

Furniture? findFurniture(String id) =>
    furniture.where((f) => f.id == id).firstOrNull;

/// Os móveis que [totalStars] estrelas já abriram.
List<Furniture> unlockedFurniture(int totalStars) =>
    furniture.where((f) => f.stars <= totalStars).toList();

/// Quantas estrelas faltam para abrir [item] (0 se já abriu).
int furnitureStarsMissing(Furniture item, int totalStars) =>
    item.stars > totalStars ? item.stars - totalStars : 0;
