import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:miagames/app.dart';

void main() {
  testWidgets('HomeScreen renders game list', (tester) async {
    await tester.pumpWidget(const MiaGamesApp());
    expect(find.text('🎮 MiaGames'), findsOneWidget);
    expect(find.text('Jogo da Memória'), findsOneWidget);
  });
}
