import 'narrator.dart';

/// Narrador que respeita a preferência "Voz" da Área dos pais.
class ConfigurableNarrator implements Narrator {
  ConfigurableNarrator(this._inner, {required bool Function() isEnabled})
    : _isEnabled = isEnabled;

  final Narrator _inner;
  final bool Function() _isEnabled;

  @override
  Future<void> speak(String text) async {
    if (_isEnabled()) await _inner.speak(text);
  }

  @override
  Future<void> stop() => _inner.stop();
}
