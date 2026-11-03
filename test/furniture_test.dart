import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:miagames/modules/furniture.dart';
import 'package:miagames/modules/game_module.dart';
import 'package:miagames/modules/game_registry.dart';

/// As estrelas que existem de verdade: os jogos com níveis, 6 níveis × 3 estrelas.
int get maxStars =>
    gameRegistry.fold(0, (sum, g) => sum + g.difficulties.length * 3);

void main() {
  group('o catálogo', () {
    test('ids únicos e só de letras minúsculas (viram arquivo e JSON)', () {
      final ids = furniture.map((f) => f.id).toList();
      expect(ids.toSet().length, ids.length);
      for (final id in ids) {
        expect(id, matches(RegExp(r'^[a-z]+$')));
      }
      for (final f in furniture) {
        expect(f.name.trim(), isNotEmpty, reason: f.id);
      }
    });

    test(
      'os 3 primeiros já vêm abertos, para brincar logo; o resto abre pelas estrelas',
      () {
        final free = furniture.where((f) => f.stars == 0).toList();
        expect(free.length, 3);
        expect(furniture.take(3).every((f) => f.stars == 0), isTrue);
        expect(unlockedFurniture(0).map((f) => f.id), ['bed', 'rug', 'plant']);
      },
    );

    test(
      'as estrelas crescem sem repetir depois dos livres, e o último é alcançável',
      () {
        final needed = furniture.skip(3).map((f) => f.stars).toList();
        for (var i = 1; i < needed.length; i++) {
          expect(
            needed[i],
            greaterThan(needed[i - 1]),
            reason: furniture[i + 3].id,
          );
        }
        expect(needed.first, greaterThan(0));
        expect(furniture.last.stars, lessThan(maxStars));
        // 8 jogos com níveis × 6 níveis × 3 estrelas (o quarto não tem níveis)
        expect(maxStars, 8 * 6 * 3);
      },
    );

    test('há móveis de sobra para a brincadeira durar', () {
      expect(furniture.length, greaterThanOrEqualTo(12));
    });
  });

  group('abrir pelas estrelas', () {
    test('cada limite abre o móvel certo, e um a menos não abre', () {
      for (final f in furniture) {
        expect(unlockedFurniture(f.stars), contains(f), reason: f.id);
        if (f.stars > 0) {
          expect(
            unlockedFurniture(f.stars - 1),
            isNot(contains(f)),
            reason: '${f.id} com ${f.stars - 1}',
          );
        }
      }
    });

    test('mais estrelas nunca fecham um móvel', () {
      var previous = 0;
      for (var stars = 0; stars <= maxStars; stars++) {
        final count = unlockedFurniture(stars).length;
        expect(
          count,
          greaterThanOrEqualTo(previous),
          reason: '$stars estrelas',
        );
        previous = count;
      }
      expect(unlockedFurniture(maxStars).length, furniture.length);
    });

    test('quantas estrelas faltam', () {
      final lamp = findFurniture('lamp')!;
      expect(furnitureStarsMissing(lamp, 0), lamp.stars);
      expect(furnitureStarsMissing(lamp, lamp.stars - 1), 1);
      expect(furnitureStarsMissing(lamp, lamp.stars), 0);
      expect(furnitureStarsMissing(lamp, 999), 0);
    });

    test('findFurniture acha pelo id e devolve null se não existe', () {
      expect(findFurniture('bed')?.name, 'Caminha');
      expect(findFurniture('nada'), isNull);
    });
  });

  group('os desenhos', () {
    final dir = Directory('assets/games/mia-room/img');

    test(
      'todo móvel tem desenho (SVG, sem <text>) e não sobra desenho sem móvel',
      () {
        for (final f in furniture) {
          final file = File('${dir.path}/${f.id}.svg');
          expect(
            file.existsSync(),
            isTrue,
            reason: 'falta o desenho de ${f.id}',
          );
          final svg = file.readAsStringSync();
          expect(svg, contains('viewBox'), reason: f.id);
          expect(
            svg,
            isNot(contains('<text')),
            reason: '${f.id}: o flutter_svg não desenha texto',
          );
        }
        final drawn = dir
            .listSync()
            .whereType<File>()
            .map((f) => f.uri.pathSegments.last.replaceAll('.svg', ''))
            .where((name) => name != 'room')
            .toSet();
        expect(drawn, furniture.map((f) => f.id).toSet());
      },
    );

    test(
      'o jogo tem o ícone e está no registro como jogo livre, sem níveis',
      () {
        expect(File('assets/images/mia_room.svg').existsSync(), isTrue);
        final room = findGameById('mia-room')!;
        expect(room.freePlay, isTrue);
        expect(room.difficulties, isEmpty);
        expect(File(room.assetPath).existsSync(), isTrue);
        expect(GameDifficulty.values.length, 6);
      },
    );
  });
}
