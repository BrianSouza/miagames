import 'package:flutter/material.dart';
import 'core/audio/narrator.dart';
import 'core/theme/app_theme.dart';
import 'screens/home_screen.dart';

class MiaGamesApp extends StatelessWidget {
  const MiaGamesApp({super.key, required this.narrator});

  /// Injetado para que os testes usem um narrador falso, sem motor de voz.
  final Narrator narrator;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MiaGames',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: HomeScreen(narrator: narrator),
    );
  }
}
