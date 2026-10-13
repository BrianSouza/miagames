import 'package:miagames/core/audio/narrator.dart';

/// Narrador de teste: guarda o que seria falado.
class FakeNarrator implements Narrator {
  final List<String> spoken = [];
  int stops = 0;

  @override
  Future<void> speak(String text) async => spoken.add(text);

  @override
  Future<void> stop() async => stops++;
}
