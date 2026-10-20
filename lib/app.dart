import 'package:flutter/material.dart';
import 'core/audio/narrator.dart';
import 'core/storage/progress_store.dart';
import 'core/theme/app_theme.dart';
import 'screens/home_screen.dart';

class MiaGamesApp extends StatelessWidget {
  const MiaGamesApp({
    super.key,
    required this.narrator,
    required this.store,
    this.gameBuilder,
  });

  /// Injetados para que os testes usem um narrador falso (sem motor de voz)
  /// e um armazenamento em memória.
  final Narrator narrator;
  final ProgressStore store;

  /// Só para testes: troca a tela do jogo (a WebView não roda neles)
  final GameScreenBuilder? gameBuilder;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MiaGames',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: HomeScreen(
        narrator: narrator,
        store: store,
        gameBuilder: gameBuilder,
      ),
    );
  }
}
