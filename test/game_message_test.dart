import 'package:flutter_test/flutter_test.dart';
import 'package:miagames/core/bridge/game_message.dart';

void main() {
  group('GameMessage.parse', () {
    test('NAVIGATE_BACK', () {
      expect(
        GameMessage.parse('{"type":"NAVIGATE_BACK"}'),
        isA<NavigateBack>(),
      );
    });

    test('SPEAK traz o texto', () {
      final message = GameMessage.parse('{"type":"SPEAK","text":"Gato"}');
      expect(message, isA<Speak>().having((m) => m.text, 'text', 'Gato'));
    });

    test('GAME_COMPLETE traz estrelas, jogadas e tempo', () {
      final message = GameMessage.parse(
        '{"type":"GAME_COMPLETE","moves":7,"stars":3,"timeSeconds":42}',
      );
      expect(
        message,
        isA<GameComplete>()
            .having((m) => m.stars, 'stars', 3)
            .having((m) => m.moves, 'moves', 7)
            .having((m) => m.timeSeconds, 'timeSeconds', 42),
      );
    });

    test('SAVE_STATE traz o estado do jogo', () {
      final message = GameMessage.parse(
        '{"type":"SAVE_STATE","state":{"items":[{"id":"bed","x":0.5,"y":0.5}]}}',
      );
      expect(
        message,
        isA<SaveState>().having((m) => m.state['items'], 'items', [
          {'id': 'bed', 'x': 0.5, 'y': 0.5},
        ]),
      );
    });

    test(
      'SAVE_STATE: sem estado, com estado que não é um mapa, ou grande demais, vira null',
      () {
        final big = List.filled(SaveState.maxEncodedLength, 'x').join();
        for (final raw in [
          '{"type":"SAVE_STATE"}',
          '{"type":"SAVE_STATE","state":null}',
          '{"type":"SAVE_STATE","state":[1,2]}',
          '{"type":"SAVE_STATE","state":"texto"}',
          '{"type":"SAVE_STATE","state":{"lixo":"$big"}}',
        ]) {
          expect(
            GameMessage.parse(raw),
            isNull,
            reason: raw.length > 80 ? 'estado grande' : raw,
          );
        }
      },
    );

    test('mensagens malformadas viram null em vez de erro', () {
      for (final raw in [
        'não é json',
        '[1, 2]',
        '{"type":"DESCONHECIDO"}',
        '{"type":"SPEAK"}',
        '{"type":"SPEAK","text":"   "}',
        '{"type":"SPEAK","text":42}',
        '{"type":"GAME_COMPLETE","stars":5,"moves":7,"timeSeconds":1}',
        '{"type":"GAME_COMPLETE","stars":2,"moves":-1,"timeSeconds":1}',
        '{"type":"GAME_COMPLETE","stars":"3","moves":7,"timeSeconds":1}',
      ]) {
        expect(GameMessage.parse(raw), isNull, reason: raw);
      }
    });
  });
}
