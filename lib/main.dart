import 'package:flutter/material.dart';
import 'app.dart';
import 'core/audio/configurable_narrator.dart';
import 'core/audio/narrator.dart';
import 'core/storage/progress_store.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final store = await ProgressStore.load();
  final narrator = ConfigurableNarrator(
    TtsNarrator(),
    isEnabled: () => store.voiceEnabled,
  );
  runApp(MiaGamesApp(narrator: narrator, store: store));
}
