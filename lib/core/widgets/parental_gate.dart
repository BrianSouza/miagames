import 'dart:math';

import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';

/// Pergunta de adulto: uma soma com resultado entre 10 e 18, com três
/// opções. Crianças de 3 a 6 anos não leem a pergunta nem fazem a conta,
/// e chutar acerta só 1 vez em 3 (errar fecha o bloqueio).
@immutable
class ParentalChallenge {
  const ParentalChallenge(this.a, this.b, this.options);

  factory ParentalChallenge.random(Random random) {
    final a = 5 + random.nextInt(5); // 5..9
    final b = 5 + random.nextInt(5); // 5..9
    final answer = a + b;
    final options = <int>{answer};
    while (options.length < 3) {
      final delta = 1 + random.nextInt(3);
      options.add(random.nextBool() ? answer + delta : answer - delta);
    }
    return ParentalChallenge(a, b, options.toList()..shuffle(random));
  }

  final int a;
  final int b;
  final List<int> options;

  int get answer => a + b;
}

/// Mostra o bloqueio e devolve `true` só se a resposta estiver certa.
Future<bool> showParentalGate(BuildContext context, {Random? random}) async {
  final challenge = ParentalChallenge.random(random ?? Random());
  final result = await showDialog<bool>(
    context: context,
    builder: (ctx) => _ParentalGateDialog(challenge: challenge),
  );
  return result ?? false;
}

class _ParentalGateDialog extends StatelessWidget {
  const _ParentalGateDialog({required this.challenge});

  final ParentalChallenge challenge;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return AlertDialog(
      title: const Text('Área dos pais'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Para continuar, responda:',
            style: text.bodyMedium?.copyWith(color: AppColors.textSecond),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Quanto é ${challenge.a} + ${challenge.b}?',
            style: text.headlineSmall?.copyWith(
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Row(
            children: [
              for (final option in challenge.options)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(
                          AppSpacing.touchTarget,
                        ),
                      ),
                      onPressed: () =>
                          Navigator.pop(context, option == challenge.answer),
                      child: Text(
                        '$option',
                        style: text.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Cancelar'),
        ),
      ],
    );
  }
}
