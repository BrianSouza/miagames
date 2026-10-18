import 'package:flutter_test/flutter_test.dart';
import 'package:miagames/core/audio/configurable_narrator.dart';

import 'fake_narrator.dart';

void main() {
  test('só fala quando a voz está ligada', () async {
    final inner = FakeNarrator();
    var enabled = true;
    final narrator = ConfigurableNarrator(inner, isEnabled: () => enabled);

    await narrator.speak('Gato');
    enabled = false;
    await narrator.speak('Rato');

    expect(inner.spoken, ['Gato']);
  });
}
