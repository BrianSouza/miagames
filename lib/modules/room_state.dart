/// Um móvel já colocado no quarto: qual é e onde fica (o centro dele, em fração do quarto: 0 a 1).
class PlacedFurniture {
  const PlacedFurniture({required this.id, required this.x, required this.y});

  final String id;
  final double x;
  final double y;

  Map<String, Object> toJson() => {'id': id, 'x': x, 'y': y};
}

/// O quarto da Mia como o jogo o salva: os móveis colocados e onde a Mia está.
///
/// O JSON vem de dentro da WebView, então nada dele é confiável: só entram móveis que existem e
/// estão abertos ([allowedIds]), com no máximo [maxItems] peças e posições dentro do quarto.
class RoomLayout {
  const RoomLayout({required this.items, this.miaX, this.miaY});

  /// Quantas peças o quarto aceita (o jogo para antes, em 24).
  static const maxItems = 40;

  static final _idPattern = RegExp(r'^[a-z]+$');

  final List<PlacedFurniture> items;

  /// Onde a Mia está (fração do quarto); `null` se o jogo não mandou.
  final double? miaX;
  final double? miaY;

  /// Lê o quarto de [json]. Devolve `null` se não for um quarto (um quarto vazio é válido: a criança
  /// pode ter tirado tudo). Os móveis fechados ou desconhecidos são ignorados.
  static RoomLayout? fromJson(Object? json, {required Set<String> allowedIds}) {
    if (json is! Map) return null;
    final rawItems = json['items'];
    if (rawItems is! List) return null;

    final items = <PlacedFurniture>[];
    for (final raw in rawItems) {
      if (items.length >= maxItems) break;
      if (raw is! Map) continue;
      final id = raw['id'];
      final x = _fraction(raw['x']);
      final y = _fraction(raw['y']);
      if (id is! String || !_idPattern.hasMatch(id)) continue;
      if (!allowedIds.contains(id) || x == null || y == null) continue;
      items.add(PlacedFurniture(id: id, x: x, y: y));
    }

    final mia = json['mia'];
    return RoomLayout(
      items: items,
      miaX: mia is Map ? _fraction(mia['x']) : null,
      miaY: mia is Map ? _fraction(mia['y']) : null,
    );
  }

  /// Um número finito, trazido para dentro do quarto (0 a 1); `null` se não for número.
  static double? _fraction(Object? value) {
    if (value is! num || !value.isFinite) return null;
    return value.toDouble().clamp(0.0, 1.0);
  }

  Map<String, Object> toJson() => {
    'items': [for (final item in items) item.toJson()],
    if (miaX != null && miaY != null) 'mia': {'x': miaX!, 'y': miaY!},
  };
}
