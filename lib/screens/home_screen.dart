import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../core/audio/narrator.dart';
import '../core/storage/progress_store.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_spacing.dart';
import '../core/widgets/parental_gate.dart';
import '../core/widgets/star_rating.dart';
import '../modules/game_module.dart';
import '../modules/game_registry.dart';
import 'game_screen.dart';
import 'parents_screen.dart';

/// Tela inicial: lista os jogos do [gameRegistry] e abre o seletor de
/// dificuldade. Nomes de jogos e dificuldades são falados ao toque,
/// para quem ainda não sabe ler.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.narrator, required this.store});

  final Narrator narrator;
  final ProgressStore store;

  /// A Área dos pais fica atrás de uma pergunta que crianças pequenas
  /// não conseguem responder.
  Future<void> _openParentsArea(BuildContext context) async {
    final allowed = await showParentalGate(context);
    if (!allowed || !context.mounted) return;
    await Navigator.push<void>(
      context,
      MaterialPageRoute(builder: (_) => ParentsScreen(store: store)),
    );
  }

  void _showDifficultyPicker(BuildContext context, GameModule game) {
    narrator.speak(game.displayName);
    showModalBottomSheet<void>(
      context: context,
      // Deixa a folha usar a altura que precisar (e rolar) em telas baixas
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppSpacing.radiusXl),
        ),
      ),
      builder: (ctx) => _DifficultySheet(
        game: game,
        store: store,
        onSelect: (diff) {
          narrator.speak(diff.label);
          Navigator.pop(ctx);
          Navigator.push<void>(
            context,
            MaterialPageRoute(
              builder: (_) => GameScreen(
                game: game,
                difficulty: diff,
                narrator: narrator,
                store: store,
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _Header(onParentsArea: () => _openParentsArea(context)),
            Expanded(
              child: GridView.builder(
                padding: const EdgeInsets.all(AppSpacing.md),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: AppSpacing.md,
                  mainAxisSpacing: AppSpacing.md,
                  // Altura fixa: com proporção, o card ficava baixo demais
                  // para o conteúdo em telas estreitas (320px)
                  mainAxisExtent: 220,
                ),
                itemCount: gameRegistry.length,
                itemBuilder: (ctx, i) => _GameCard(
                  game: gameRegistry[i],
                  onTap: () => _showDifficultyPicker(context, gameRegistry[i]),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.onParentsArea});

  final VoidCallback onParentsArea;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.lg,
        AppSpacing.sm,
        AppSpacing.sm,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: _title(context)),
          IconButton(
            onPressed: onParentsArea,
            tooltip: 'Área dos pais',
            iconSize: 28,
            color: AppColors.textSecond,
            icon: const Icon(Icons.settings_rounded),
          ),
        ],
      ),
    );
  }

  Widget _title(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'MiaGames',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          'Escolha um jogo para começar!',
          style: Theme.of(
            context,
          ).textTheme.bodyMedium?.copyWith(color: AppColors.textSecond),
        ),
      ],
    );
  }
}

class _GameCard extends StatelessWidget {
  final GameModule game;
  final VoidCallback onTap;

  const _GameCard({required this.game, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: game.displayName,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
            boxShadow: [
              BoxShadow(
                color: game.accentColor.withValues(alpha: 0.25),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SvgPicture.asset(game.iconAsset, width: 88, height: 88),
              const SizedBox(height: AppSpacing.md),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                child: Text(
                  game.displayName,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Wrap(
                spacing: 4,
                runSpacing: 4,
                alignment: WrapAlignment.center,
                children: game.skills.take(2).map((skill) {
                  return Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: game.accentColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                    ),
                    child: Text(
                      skill,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        // texto escuro: a cor do jogo sobre o fundo claro dela não tem contraste
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DifficultySheet extends StatelessWidget {
  final GameModule game;
  final ProgressStore store;
  final void Function(GameDifficulty) onSelect;

  const _DifficultySheet({
    required this.game,
    required this.store,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
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
          SvgPicture.asset(game.iconAsset, width: 64, height: 64),
          const SizedBox(height: AppSpacing.sm),
          Text(
            game.displayName,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Escolha a dificuldade:',
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: AppColors.textSecond),
          ),
          const SizedBox(height: AppSpacing.lg),
          ...game.difficulties.map((diff) => _difficultyButton(context, diff)),
          const SizedBox(height: AppSpacing.md),
        ],
      ),
    );
  }

  Widget _difficultyButton(BuildContext context, GameDifficulty diff) {
    final best = store.record(game.id, diff);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: SizedBox(
        width: double.infinity,
        child: OutlinedButton(
          onPressed: () => onSelect(diff),
          style: OutlinedButton.styleFrom(
            // Altura mínima de toque, mas pode crescer se o texto quebrar
            minimumSize: const Size.fromHeight(AppSpacing.touchTarget),
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            side: BorderSide(color: game.accentColor, width: 2),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            ),
          ),
          child: Row(
            children: [
              LevelBars(level: diff.level, color: AppColors.textPrimary),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      diff.label,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      diff.description,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: AppColors.textSecond,
                      ),
                    ),
                  ],
                ),
              ),
              // Recorde nesta dificuldade (só depois da 1ª partida)
              if (best != null) StarRating(stars: best.stars),
            ],
          ),
        ),
      ),
    );
  }
}
