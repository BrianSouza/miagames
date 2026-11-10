import 'package:flutter_test/flutter_test.dart';
import 'package:miagames/modules/room_state.dart';

void main() {
  const open = {'bed', 'rug', 'lamp'};

  RoomLayout? read(Object? json, {Set<String> allowed = open}) =>
      RoomLayout.fromJson(json, allowedIds: allowed);

  group('lê o quarto salvo', () {
    test('móveis e a Mia, em frações do quarto', () {
      final room = read({
        'items': [
          {'id': 'bed', 'x': 0.25, 'y': 0.6},
          {'id': 'lamp', 'x': 0.9, 'y': 0.1},
        ],
        'mia': {'x': 0.5, 'y': 0.7},
      })!;

      expect(room.items.map((i) => i.id), ['bed', 'lamp']);
      expect(room.items.first.x, 0.25);
      expect(room.items.first.y, 0.6);
      expect(room.miaX, 0.5);
      expect(room.miaY, 0.7);
    });

    test('um quarto vazio é válido (a criança pode ter tirado tudo)', () {
      final room = read({'items': []})!;
      expect(room.items, isEmpty);
      expect(room.miaX, isNull);
    });

    test('o que não é um quarto vira null', () {
      for (final bad in [
        null,
        42,
        'texto',
        <Object>[],
        {'items': 'x'},
        {'mia': {}},
      ]) {
        expect(read(bad), isNull, reason: '$bad');
      }
    });

    test('móveis fechados ou que não existem são ignorados', () {
      final room = read({
        'items': [
          {'id': 'bed', 'x': 0.1, 'y': 0.1},
          {'id': 'tent', 'x': 0.2, 'y': 0.2}, // existe, mas está fechado
          {'id': 'fantasma', 'x': 0.3, 'y': 0.3},
        ],
      })!;
      expect(room.items.map((i) => i.id), ['bed']);
    });

    test('ids que não são só a-z não passam (viram nome de arquivo)', () {
      final room = read(
        {
          'items': [
            {'id': '../bed', 'x': 0.1, 'y': 0.1},
            {'id': 'Bed', 'x': 0.1, 'y': 0.1},
            {'id': 'be d', 'x': 0.1, 'y': 0.1},
            {'id': 42, 'x': 0.1, 'y': 0.1},
            {'id': null, 'x': 0.1, 'y': 0.1},
            {'id': 'bed', 'x': 0.1, 'y': 0.1},
          ],
        },
        allowed: {'bed', '../bed', 'Bed', 'be d'},
      )!;
      expect(room.items.map((i) => i.id), ['bed']);
    });

    test(
      'posições fora do quarto são trazidas para dentro; o que não é número, descartado',
      () {
        final room = read({
          'items': [
            {'id': 'bed', 'x': -3, 'y': 7},
            {'id': 'rug', 'x': 'meio', 'y': 0.5},
            {'id': 'lamp', 'x': 0.5},
            {'id': 'bed', 'x': double.nan, 'y': 0.5},
            {'id': 'bed', 'x': double.infinity, 'y': 0.5},
          ],
          'mia': {'x': 9, 'y': -9},
        })!;
        expect(room.items, hasLength(1));
        expect(room.items.single.x, 0.0);
        expect(room.items.single.y, 1.0);
        expect(room.miaX, 1.0);
        expect(room.miaY, 0.0);
      },
    );

    test('entradas que não são mapas são puladas, sem derrubar o resto', () {
      final room = read({
        'items': [
          'bed',
          null,
          42,
          [1, 2],
          {'id': 'bed', 'x': 0.5, 'y': 0.5},
        ],
      })!;
      expect(room.items, hasLength(1));
    });

    test('no máximo ${RoomLayout.maxItems} peças', () {
      final many = {
        'items': [
          for (var i = 0; i < 100; i++) {'id': 'bed', 'x': 0.5, 'y': 0.5},
        ],
      };
      expect(read(many)!.items, hasLength(RoomLayout.maxItems));
    });

    test('a Mia só vale com as duas posições', () {
      expect(
        read({
          'items': [],
          'mia': {'x': 0.5},
        })!.miaX,
        0.5,
      );
      final room = read({
        'items': [],
        'mia': {'x': 0.5},
      })!;
      // sem y, a Mia não vai para o JSON
      expect(room.toJson().containsKey('mia'), isFalse);
    });
  });

  group('toJson', () {
    test('ida e volta devolve o mesmo quarto', () {
      final json = {
        'items': [
          {'id': 'bed', 'x': 0.25, 'y': 0.6},
          {'id': 'rug', 'x': 0.5, 'y': 0.8},
        ],
        'mia': {'x': 0.4, 'y': 0.7},
      };
      final room = read(json)!;
      expect(room.toJson(), json);
      expect(read(room.toJson())!.toJson(), json);
    });
  });
}
