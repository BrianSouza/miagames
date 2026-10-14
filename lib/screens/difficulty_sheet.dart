import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../core/storage/progress_store.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_spacing.dart';
import '../core/widgets/mia_avatar.dart';
import '../core/widgets/star_rating.dart';
import '../modules/game_module.dart';
import '../modules/recommended_difficulty.dart';

/// Folha inferior com os 3 níveis, em botões grandes. A Mia sugere o próximo
/// nível (o botão "respira" por alguns segundos, com a carinha dela ao lado).
class DifficultySheet extends StatelessWidget {
  const DifficultySheet({
    super.key,
    required this.game,
    required this.store,
    required this.onSelect,
  });

  final GameModule game;
  final ProgressStore store;
  final void Function(GameDifficulty) onSelect;

  @override
  Widget build(BuildContext context) {
    final suggested = recommendedDifficulty(store, game);
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.textLight,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const MiaAvatar(size: 72),
              const SizedBox(width: AppSpacing.sm),
              SvgPicture.asset(game.iconAsset, width: 64, height: 64),
              const SizedBox(width: AppSpacing.md),
              Flexible(
                child: Text(
                  game.displayName,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          for (final diff in game.difficulties)
            _LevelButton(
              game: game,
              difficulty: diff,
              best: store.record(game.id, diff),
              suggested: diff == suggested,
              onTap: () => onSelect(diff),
            ),
          const SizedBox(height: AppSpacing.sm),
        ],
      ),
    );
  }
}

class _LevelButton extends StatefulWidget {
  const _LevelButton({
    required this.game,
    required this.difficulty,
    required this.best,
    required this.suggested,
    required this.onTap,
  });

  final GameModule game;
  final GameDifficulty difficulty;
  final GameRecord? best;
  final bool suggested;
  final VoidCallback onTap;

  @override
  State<_LevelButton> createState() => _LevelButtonState();
}

class _LevelButtonState extends State<_LevelButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 700),
  );

  @override
  void initState() {
    super.initState();
    // Só algumas vezes: chama a atenção sem ficar piscando para sempre
    if (widget.suggested) _pulse.repeat(reverse: true, count: 6);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final game = widget.game;
    final diff = widget.difficulty;
    final best = widget.best;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: AnimatedBuilder(
        animation: _pulse,
        builder: (context, child) =>
            Transform.scale(scale: 1 + 0.03 * _pulse.value, child: child),
        child: Material(
          color: widget.suggested ? game.tile : AppColors.surface,
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          child: InkWell(
            onTap: widget.onTap,
            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
            child: Container(
              // Alvo grande: dedos de 5 anos
              constraints: const BoxConstraints(minHeight: 88),
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                border: Border.all(
                  color: game.accentColor,
                  width: widget.suggested ? 4 : 2,
                ),
              ),
              child: Row(
                children: [
                  LevelBars(
                    level: diff.level,
                    color: AppColors.textPrimary,
                    scale: 1.6,
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          diff.label,
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(
                                fontWeight: FontWeight.w800,
                                color: AppColors.textPrimary,
                              ),
                        ),
                        Text(
                          game.hintFor(diff),
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: AppColors.textSecond),
                        ),
                      ],
                    ),
                  ),
                  // Recorde nesta dificuldade (só depois da 1ª partida)
                  if (best != null) StarRating(stars: best.stars, size: 28),
                  if (widget.suggested)
                    const Padding(
                      padding: EdgeInsets.only(left: AppSpacing.sm),
                      child: MiaAvatar(size: 44),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
