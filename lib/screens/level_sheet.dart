import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../core/storage/progress_store.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_spacing.dart';
import '../core/widgets/mia_avatar.dart';
import '../core/widgets/star_rating.dart';
import '../modules/game_module.dart';
import '../modules/level_progress.dart';
import '../modules/outfits.dart';

/// Folha inferior com a trilha de 6 níveis do jogo. Cada nível novo abre com 2
/// estrelas no anterior; os fechados mostram um cadeado. A Mia sugere o nível mais
/// alto aberto (o botão "respira" por alguns segundos, com a carinha dela).
class LevelSheet extends StatelessWidget {
  const LevelSheet({
    super.key,
    required this.game,
    required this.store,
    required this.onSelect,
    required this.onLocked,
    this.outfits = const [],
  });

  final GameModule game;
  final ProgressStore store;

  /// O que a Mia veste (aparece no topo da folha)
  final List<Outfit> outfits;
  final void Function(GameDifficulty) onSelect;

  /// A criança tocou num nível fechado
  final void Function(GameDifficulty) onLocked;

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
              MiaAvatar(size: 72, outfits: outfits),
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
          LayoutBuilder(
            builder: (context, box) {
              // 2 colunas no celular, 3 em telas largas
              final columns = box.maxWidth >= 560 ? 3 : 2;
              const gap = AppSpacing.md;
              final width = (box.maxWidth - gap * (columns - 1)) / columns;
              return Wrap(
                spacing: gap,
                runSpacing: gap,
                children: [
                  for (final diff in game.difficulties)
                    SizedBox(
                      width: width,
                      child: _LevelTile(
                        key: ValueKey('level-${diff.level}'),
                        game: game,
                        difficulty: diff,
                        best: store.record(game.id, diff),
                        locked: !isUnlocked(store, game, diff),
                        suggested: diff == suggested,
                        onTap: () => onSelect(diff),
                        onLocked: () => onLocked(diff),
                      ),
                    ),
                ],
              );
            },
          ),
          const SizedBox(height: AppSpacing.sm),
        ],
      ),
    );
  }
}

class _LevelTile extends StatefulWidget {
  const _LevelTile({
    super.key,
    required this.game,
    required this.difficulty,
    required this.best,
    required this.locked,
    required this.suggested,
    required this.onTap,
    required this.onLocked,
  });

  final GameModule game;
  final GameDifficulty difficulty;
  final GameRecord? best;
  final bool locked;
  final bool suggested;
  final VoidCallback onTap;
  final VoidCallback onLocked;

  @override
  State<_LevelTile> createState() => _LevelTileState();
}

class _LevelTileState extends State<_LevelTile> with TickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 700),
  );
  late final AnimationController _shake = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 400),
  );

  @override
  void initState() {
    super.initState();
    // Só algumas vezes: chama a atenção sem ficar piscando para sempre
    if (widget.suggested && !widget.locked) {
      _pulse.repeat(reverse: true, count: 6);
    }
  }

  @override
  void dispose() {
    _pulse.dispose();
    _shake.dispose();
    super.dispose();
  }

  void _tap() {
    if (widget.locked) {
      _shake.forward(from: 0); // balança de leve: "ainda não", sem susto
      widget.onLocked();
    } else {
      widget.onTap();
    }
  }

  @override
  Widget build(BuildContext context) {
    final game = widget.game;
    final diff = widget.difficulty;
    final locked = widget.locked;
    final stars = widget.best?.stars ?? 0;

    return Semantics(
      button: true,
      label: locked
          ? '${diff.label}, fechado'
          : '${diff.label}, $stars de 3 estrelas',
      excludeSemantics: true,
      child: AnimatedBuilder(
        animation: Listenable.merge([_pulse, _shake]),
        builder: (context, child) => Transform.translate(
          offset: Offset(
            8 * math.sin(_shake.value * math.pi * 4) * (1 - _shake.value),
            0,
          ),
          child: Transform.scale(scale: 1 + 0.04 * _pulse.value, child: child),
        ),
        child: Material(
          color: locked
              ? const Color(0xFFECEFF1)
              : (widget.suggested ? game.tile : AppColors.surface),
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          child: InkWell(
            onTap: _tap,
            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
            child: Container(
              // Alvo grande: dedos de 5 anos
              constraints: const BoxConstraints(minHeight: 116),
              alignment: Alignment.center,
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                border: Border.all(
                  color: locked ? const Color(0xFFCFD8DC) : game.accentColor,
                  width: widget.suggested && !locked ? 4 : 2,
                ),
              ),
              child: Stack(
                children: [
                  Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (locked)
                            const Icon(
                              Icons.lock_rounded,
                              size: 34,
                              color: Color(0xFF90A4AE),
                            ),
                          if (locked) const SizedBox(width: AppSpacing.xs),
                          Text(
                            '${diff.level}',
                            style: TextStyle(
                              fontSize: 44,
                              height: 1,
                              fontWeight: FontWeight.w800,
                              color: locked
                                  ? const Color(0xFF90A4AE)
                                  : AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      if (!locked) StarRating(stars: stars, size: 26),
                      if (!locked)
                        Padding(
                          padding: const EdgeInsets.only(top: AppSpacing.xs),
                          child: Text(
                            game.hintFor(diff),
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.labelSmall
                                ?.copyWith(color: AppColors.textSecond),
                          ),
                        ),
                    ],
                  ),
                  if (widget.suggested && !locked)
                    const Positioned(
                      top: 0,
                      right: 0,
                      child: MiaAvatar(size: 36),
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
