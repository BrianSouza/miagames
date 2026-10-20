import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../modules/game_module.dart';

/// Melhor resultado de um jogo numa dificuldade.
@immutable
class GameRecord {
  const GameRecord({
    required this.stars,
    required this.moves,
    required this.timeSeconds,
    required this.timesPlayed,
  });

  final int stars;
  final int moves;
  final int timeSeconds;
  final int timesPlayed;

  /// Mesma regra do jogo (memory-logic.js → isNewRecord): mais estrelas
  /// vencem; com as mesmas estrelas, menos jogadas.
  bool isBeatenBy({required int stars, required int moves}) =>
      stars != this.stars ? stars > this.stars : moves < this.moves;

  Map<String, dynamic> toJson() => {
    'stars': stars,
    'moves': moves,
    'timeSeconds': timeSeconds,
    'timesPlayed': timesPlayed,
  };

  static GameRecord? fromJson(Object? json) {
    if (json is! Map<String, dynamic>) return null;
    final stars = json['stars'];
    final moves = json['moves'];
    final time = json['timeSeconds'];
    final played = json['timesPlayed'];
    if (stars is! int || moves is! int || time is! int || played is! int) {
      return null;
    }
    return GameRecord(
      stars: stars,
      moves: moves,
      timeSeconds: time,
      timesPlayed: played,
    );
  }
}

/// Progresso (recordes por jogo e dificuldade) e preferências do app,
/// salvos no aparelho com shared_preferences.
///
/// É um [ChangeNotifier]: a Home e a Área dos pais se atualizam sozinhas
/// quando um recorde é salvo ou uma preferência muda.
class ProgressStore extends ChangeNotifier {
  ProgressStore(this._prefs);

  static Future<ProgressStore> load() async =>
      ProgressStore(await SharedPreferences.getInstance());

  final SharedPreferences _prefs;

  static const _soundKey = 'settings.sound';
  static const _voiceKey = 'settings.voice';
  static const _progressPrefix = 'progress.';
  static const _outfitKey = 'outfit.worn';

  static String _recordKey(String gameId, GameDifficulty difficulty) =>
      '$_progressPrefix$gameId.${difficulty.name}';

  // ── Preferências ────────────────────────────────────────────────────────────

  /// Efeitos sonoros dos jogos.
  bool get soundEnabled => _prefs.getBool(_soundKey) ?? true;

  /// Narração por voz.
  bool get voiceEnabled => _prefs.getBool(_voiceKey) ?? true;

  Future<void> setSoundEnabled(bool value) async {
    await _prefs.setBool(_soundKey, value);
    notifyListeners();
  }

  Future<void> setVoiceEnabled(bool value) async {
    await _prefs.setBool(_voiceKey, value);
    notifyListeners();
  }

  // ── Guarda-roupa ────────────────────────────────────────────────────────────

  /// Os ids dos acessórios que a Mia veste (veja `outfit_progress.dart`, que só mostra os abertos).
  List<String> get wornOutfitIds =>
      _prefs.getStringList(_outfitKey) ?? const [];

  Future<void> setWornOutfitIds(List<String> ids) async {
    await _prefs.setStringList(_outfitKey, ids);
    notifyListeners();
  }

  // ── Progresso ───────────────────────────────────────────────────────────────

  GameRecord? record(String gameId, GameDifficulty difficulty) {
    final raw = _prefs.getString(_recordKey(gameId, difficulty));
    if (raw == null) return null;
    try {
      return GameRecord.fromJson(jsonDecode(raw));
    } on FormatException {
      return null; // dado corrompido não derruba o app
    }
  }

  /// Registra uma partida concluída e devolve `true` se ela bateu o recorde.
  /// A primeira partida vira o recorde, mas não conta como "novo recorde".
  Future<bool> saveResult({
    required String gameId,
    required GameDifficulty difficulty,
    required int stars,
    required int moves,
    required int timeSeconds,
  }) async {
    final previous = record(gameId, difficulty);
    final beaten =
        previous != null && previous.isBeatenBy(stars: stars, moves: moves);
    final keepNew = previous == null || beaten;

    final updated = GameRecord(
      stars: keepNew ? stars : previous.stars,
      moves: keepNew ? moves : previous.moves,
      timeSeconds: keepNew ? timeSeconds : previous.timeSeconds,
      timesPlayed: (previous?.timesPlayed ?? 0) + 1,
    );
    await _prefs.setString(
      _recordKey(gameId, difficulty),
      jsonEncode(updated.toJson()),
    );
    notifyListeners();
    return beaten;
  }

  /// Apaga todos os recordes (as preferências continuam).
  Future<void> clearProgress() async {
    final keys = _prefs.getKeys().where((k) => k.startsWith(_progressPrefix));
    for (final key in keys.toList()) {
      await _prefs.remove(key);
    }
    notifyListeners();
  }
}
