import 'package:flutter/material.dart';
import '../../modules/game_module.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import 'mia_avatar.dart';

/// "Nível 3 aberto!": a Mia comemora quando a criança abre um nível novo.
/// Devolve `true` se ela quiser jogar o nível agora.
Future<bool> showLevelUnlockedDialog(
  BuildContext context, {
  required GameDifficulty difficulty,
}) async {
  final play = await showDialog<bool>(
    context: context,
    builder: (_) => _LevelUnlockedDialog(difficulty: difficulty),
  );
  return play ?? false;
}

/// O que a voz diz ao abrir um nível
String levelUnlockedSpeech(GameDifficulty difficulty) =>
    'Parabéns! Você abriu o ${difficulty.spoken.toLowerCase()}!';

class _LevelUnlockedDialog extends StatelessWidget {
  const _LevelUnlockedDialog({required this.difficulty});

  final GameDifficulty difficulty;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppColors.background,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const MiaPopIn(child: MiaAvatar(pose: MiaPose.cheer, size: 140)),
            const SizedBox(height: AppSpacing.sm),
            Text(
              '${difficulty.label} aberto!',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            SizedBox(
              width: 96,
              height: 96,
              child: FilledButton(
                onPressed: () => Navigator.pop(context, true),
                style: FilledButton.styleFrom(
                  shape: const CircleBorder(),
                  backgroundColor: const Color(0xFF0B7A73),
                ),
                child: const Icon(Icons.play_arrow_rounded, size: 56),
              ),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              style: TextButton.styleFrom(minimumSize: const Size(96, 56)),
              child: const Icon(
                Icons.home_rounded,
                size: 32,
                color: AppColors.textSecond,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
