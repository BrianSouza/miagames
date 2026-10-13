import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';

/// Narração por voz.
///
/// Crianças de 3 a 6 anos ainda não leem: falar o nome do jogo, da
/// dificuldade e de cada carta é o que torna o app navegável sem texto.
abstract class Narrator {
  /// Fala [text], interrompendo qualquer fala anterior.
  Future<void> speak(String text);

  Future<void> stop();
}

/// Narrador real, com o text-to-speech do aparelho em pt-BR.
class TtsNarrator implements Narrator {
  TtsNarrator() : _tts = FlutterTts();

  final FlutterTts _tts;
  Future<void>? _setup;

  Future<void> _configure() async {
    await _tts.setLanguage('pt-BR');
    await _tts.setSpeechRate(0.45);
    await _tts.setPitch(1.1);
  }

  @override
  Future<void> speak(String text) async {
    try {
      await (_setup ??= _configure());
      await _tts.stop();
      await _tts.speak(text);
    } catch (error) {
      // Sem motor de voz no aparelho o jogo continua funcionando, só sem som.
      debugPrint('Narrator: falha ao falar "$text": $error');
    }
  }

  @override
  Future<void> stop() async {
    try {
      await _tts.stop();
    } catch (_) {}
  }
}
