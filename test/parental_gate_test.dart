import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:miagames/core/widgets/parental_gate.dart';

void main() {
  test('desafio: soma de 10 a 18 com três opções distintas e uma certa', () {
    for (var seed = 0; seed < 200; seed++) {
      final c = ParentalChallenge.random(Random(seed));
      expect(c.a, inInclusiveRange(5, 9));
      expect(c.b, inInclusiveRange(5, 9));
      expect(c.answer, inInclusiveRange(10, 18));
      expect(c.options.toSet(), hasLength(3));
      expect(c.options, contains(c.answer));
    }
  });

  Future<bool?> runGate(
    WidgetTester tester, {
    required bool answerRight,
  }) async {
    bool? result;
    final challenge = ParentalChallenge.random(Random(7));
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => TextButton(
            onPressed: () async =>
                result = await showParentalGate(context, random: Random(7)),
            child: const Text('abrir'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('abrir'));
    await tester.pumpAndSettle();

    expect(
      find.text('Quanto é ${challenge.a} + ${challenge.b}?'),
      findsOneWidget,
    );
    final option = answerRight
        ? challenge.answer
        : challenge.options.firstWhere((o) => o != challenge.answer);
    await tester.tap(find.text('$option'));
    await tester.pumpAndSettle();
    return result;
  }

  testWidgets('resposta certa libera', (tester) async {
    expect(await runGate(tester, answerRight: true), isTrue);
  });

  testWidgets('resposta errada bloqueia', (tester) async {
    expect(await runGate(tester, answerRight: false), isFalse);
  });
}
