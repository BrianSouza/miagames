import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:miagames/modules/game_module.dart';
import 'package:miagames/modules/game_registry.dart';
import 'package:miagames/modules/outfit_progress.dart';
import 'package:miagames/modules/outfits.dart';
import 'package:miagames/screens/wardrobe_screen.dart';

import 'test_helpers.dart';

void main() {
  group('os acessórios', () {
    test('ids únicos e as estrelas só crescem, na ordem em que abrem', () {
      expect(outfits.map((o) => o.id).toSet().length, outfits.length);
      final stars = outfits.map((o) => o.stars).toList();
      expect(stars, [...stars]..sort());
      expect(
        stars.toSet().length,
        stars.length,
        reason: 'dois itens abrindo juntos',
      );
    });

    test('o último item é alcançável: pede menos que o máximo de estrelas', () {
      final max = gameRegistry.length * GameDifficulty.values.length * 3;
      expect(outfits.last.stars, lessThan(max));
      expect(outfits.first.stars, greaterThan(0));
    });

    test(
      'cada item tem desenho no app e nos jogos, e não sobra desenho sem item',
      () {
        for (final dir in ['assets/images/mia', 'assets/games/_shared/img']) {
          for (final o in outfits) {
            expect(
              File('$dir/outfit_${o.id}.svg').existsSync(),
              isTrue,
              reason: '$dir ${o.id}',
            );
          }
          final files = Directory(dir)
              .listSync()
              .map((f) => f.path.split('/').last)
              .where((n) => n.startsWith('outfit_'))
              .map((n) => n.replaceAll('outfit_', '').replaceAll('.svg', ''))
              .toSet();
          expect(files, outfits.map((o) => o.id).toSet(), reason: dir);
        }
      },
    );

    test('há itens nos 3 espaços', () {
      for (final slot in OutfitSlot.values) {
        expect(
          outfits.where((o) => o.slot == slot),
          isNotEmpty,
          reason: slot.name,
        );
      }
    });
  });

  group('abrir por estrelas', () {
    test('nenhuma estrela, nenhum item', () {
      expect(unlockedOutfits(0), isEmpty);
    });

    test('cada limiar abre o seu item, e só ele', () {
      for (final (i, o) in outfits.indexed) {
        expect(unlockedOutfits(o.stars).length, i + 1, reason: o.name);
        expect(unlockedOutfits(o.stars - 1).length, i, reason: o.name);
      }
    });

    test('quantas estrelas faltam', () {
      final flower = findOutfit('flower')!;
      expect(starsMissing(flower, 0), flower.stars);
      expect(starsMissing(flower, flower.stars), 0);
      expect(starsMissing(flower, 999), 0);
    });

    test('a fala de um item fechado: singular e plural', () {
      final crown = findOutfit('crown')!;
      expect(
        WardrobeScreen.lockedSpeech(crown, 5),
        'Faltam 5 estrelas para ganhar coroa.',
      );
      expect(
        WardrobeScreen.lockedSpeech(crown, 1),
        'Falta 1 estrela para ganhar coroa.',
      );
    });
  });

  group('vestir', () {
    final flower = findOutfit('flower')!; // cabeça
    final party = findOutfit('party')!; // cabeça
    final glasses = findOutfit('glasses')!; // rosto

    test('vestir um item de outro espaço soma', () {
      expect(wear(['flower'], glasses), ['flower', 'glasses']);
    });

    test('vestir um item do mesmo espaço troca o anterior', () {
      expect(wear(['flower', 'glasses'], party), ['glasses', 'party']);
    });

    test('tirar um item tira só ele', () {
      expect(takeOff(['flower', 'glasses'], flower), ['glasses']);
      expect(takeOff(['glasses'], flower), ['glasses']);
    });

    test(
      'dressFrom ignora ids que não existem e repete de espaço (vale o último)',
      () {
        expect(dressFrom(['nada', 'flower', 'party']).map((o) => o.id), [
          'party',
        ]);
      },
    );
  });

  group('o que a Mia veste no aparelho', () {
    Future<dynamic> withStars(int stars) async {
      final store = await memoryStore();
      await store.saveResult(
        gameId: 'memory',
        difficulty: GameDifficulty.level1,
        stars: stars,
        moves: 4,
        timeSeconds: 10,
      );
      return store;
    }

    test('as estrelas de todos os jogos e níveis se somam', () async {
      final store = await memoryStore();
      expect(totalStars(store), 0);
      await store.saveResult(
        gameId: 'memory',
        difficulty: GameDifficulty.level1,
        stars: 3,
        moves: 4,
        timeSeconds: 1,
      );
      await store.saveResult(
        gameId: 'memory',
        difficulty: GameDifficulty.level2,
        stars: 2,
        moves: 8,
        timeSeconds: 1,
      );
      await store.saveResult(
        gameId: 'paint',
        difficulty: GameDifficulty.level1,
        stars: 1,
        moves: 20,
        timeSeconds: 1,
      );
      expect(totalStars(store), 6);
    });

    test('um recorde melhor substitui o pior (não soma duas vezes)', () async {
      final store = await withStars(1);
      await store.saveResult(
        gameId: 'memory',
        difficulty: GameDifficulty.level1,
        stars: 3,
        moves: 4,
        timeSeconds: 1,
      );
      expect(totalStars(store), 3);
    });

    test('só os itens abertos aparecem na Mia', () async {
      final store = await withStars(3);
      await store.setWornOutfitIds(['flower', 'crown']);
      expect(wornOutfits(store).map((o) => o.id), ['flower']);
    });

    test('apagar o progresso fecha os itens, e eles saem da Mia', () async {
      final store = await withStars(3);
      await store.setWornOutfitIds(['flower']);
      expect(wornOutfits(store), isNotEmpty);

      await store.clearProgress();

      expect(wornOutfits(store), isEmpty);
    });

    test('a escolha sobrevive a reabrir o app', () async {
      final store = await withStars(3);
      await store.setWornOutfitIds(['flower']);
      expect(store.wornOutfitIds, ['flower']);
    });
  });
}
