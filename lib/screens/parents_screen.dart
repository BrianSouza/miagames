import 'package:flutter/material.dart';

import '../core/storage/progress_store.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_spacing.dart';
import '../core/widgets/star_rating.dart';
import '../modules/game_module.dart';
import '../modules/game_registry.dart';

/// Área dos pais: liga/desliga voz e sons, mostra o progresso e permite
/// apagá-lo. Só é aberta depois do bloqueio parental.
class ParentsScreen extends StatelessWidget {
  const ParentsScreen({super.key, required this.store});

  final ProgressStore store;

  Future<void> _confirmClear(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Apagar progresso?'),
        content: const Text(
          'Os recordes e as estrelas de todos os jogos serão apagados. '
          'Isso não pode ser desfeito.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.errorText),
            child: const Text('Apagar'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await store.clearProgress();
    if (!context.mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Progresso apagado')));
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Área dos pais')),
      body: ListenableBuilder(
        listenable: store,
        builder: (context, _) => ListView(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
          children: [
            _SectionTitle('Som'),
            SwitchListTile(
              title: const Text('Voz'),
              subtitle: const Text(
                'Fala o nome dos jogos, das cartas e comemora os acertos',
              ),
              value: store.voiceEnabled,
              onChanged: store.setVoiceEnabled,
            ),
            SwitchListTile(
              title: const Text('Efeitos sonoros'),
              subtitle: const Text('Sons ao virar cartas, acertar e vencer'),
              value: store.soundEnabled,
              onChanged: store.setSoundEnabled,
            ),
            const Divider(height: AppSpacing.xl),
            _SectionTitle('Progresso'),
            for (final game in gameRegistry) ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.md,
                  AppSpacing.sm,
                  AppSpacing.md,
                  0,
                ),
                child: Text(
                  game.displayName,
                  style: text.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              for (final diff in game.difficulties)
                _RecordTile(
                  game: game,
                  difficulty: diff,
                  record: store.record(game.id, diff),
                ),
            ],
            Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: OutlinedButton.icon(
                onPressed: () => _confirmClear(context),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.errorText,
                  minimumSize: const Size.fromHeight(AppSpacing.touchTarget),
                ),
                icon: const Icon(Icons.delete_outline_rounded),
                label: const Text('Apagar progresso'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title);

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.sm,
        AppSpacing.md,
        AppSpacing.xs,
      ),
      child: Text(
        title.toUpperCase(),
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
          color: AppColors.textSecond,
          fontWeight: FontWeight.w700,
          letterSpacing: 1,
        ),
      ),
    );
  }
}

class _RecordTile extends StatelessWidget {
  const _RecordTile({
    required this.game,
    required this.difficulty,
    required this.record,
  });

  final GameModule game;
  final GameDifficulty difficulty;
  final GameRecord? record;

  @override
  Widget build(BuildContext context) {
    final r = record;
    return ListTile(
      title: Text(difficulty.label),
      subtitle: Text(
        r == null
            ? 'Ainda não jogou'
            : 'Recorde: ${game.scoreText(r.moves)} · '
                  '${r.timesPlayed} ${r.timesPlayed == 1 ? 'partida' : 'partidas'}',
      ),
      trailing: r == null ? null : StarRating(stars: r.stars),
    );
  }
}
