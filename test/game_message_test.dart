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

    test('GAME_COMPLETE traz os dados da partida', () {
      final message = GameMessage.parse(
        '{"type":"GAME_COMPLETE","moves":7,"stars":3}',
      );
      expect(
        message,
        isA<GameComplete>().having((m) => m.data['stars'], 'stars', 3),
      );
    });

    test('mensagens malformadas viram null em vez de erro', () {
      for (final raw in [
        'não é json',
        '[1, 2]',
        '{"type":"DESCONHECIDO"}',
        '{"type":"SPEAK"}',
        '{"type":"SPEAK","text":"   "}',
        '{"type":"SPEAK","text":42}',
      ]) {
        expect(GameMessage.parse(raw), isNull, reason: raw);
      }
    });
  });
}
