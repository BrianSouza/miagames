import 'package:flutter/material.dart';
import '../core/audio/narrator.dart';
import '../core/storage/progress_store.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_spacing.dart';
import '../core/widgets/mia_avatar.dart';
import '../modules/outfit_progress.dart';
import '../modules/outfits.dart';

/// O guarda-roupa da Mia: as estrelas ganhas nos jogos viram acessórios. Tocar num item aberto o
/// veste (ou o tira); os fechados mostram um cadeado e quantas estrelas faltam.
class WardrobeScreen extends StatelessWidget {
  const WardrobeScreen({
    super.key,
    required this.narrator,
    required this.store,
  });

  final Narrator narrator;
  final ProgressStore store;

  /// O que a voz diz ao tocar num item fechado: "Faltam 3 estrelas para a coroa."
  static String lockedSpeech(Outfit outfit, int missing) {
    final stars = missing == 1 ? 'Falta 1 estrela' : 'Faltam $missing estrelas';
    return '$stars para ganhar ${outfit.name.toLowerCase()}.';
  }

  void _tap(Outfit outfit) {
    final total = totalStars(store);
    if (outfit.stars > total) {
      narrator.speak(lockedSpeech(outfit, starsMissing(outfit, total)));
      return;
    }
    final worn = store.wornOutfitIds;
    if (wornOutfits(store).any((o) => o.id == outfit.id)) {
      store.setWornOutfitIds(takeOff(worn, outfit));
    } else {
      narrator.speak(outfit.name);
      store.setWornOutfitIds(wear(worn, outfit));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: ListenableBuilder(
          listenable: store,
          builder: (context, _) {
            final total = totalStars(store);
            final worn = wornOutfits(store);
            return LayoutBuilder(
              builder: (context, box) {
                final wide = box.maxWidth > box.maxHeight;
                final preview = _Preview(total: total, worn: worn, wide: wide);
                final grid = _OutfitGrid(
                  total: total,
                  worn: worn,
                  onTap: _tap,
                  columns: wide
                      ? (box.maxWidth > 1000 ? 4 : 3)
                      : (box.maxWidth > 560 ? 4 : 3),
                );
                return Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(
                        AppSpacing.sm,
                        AppSpacing.sm,
                        AppSpacing.sm,
                        0,
                      ),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: IconButton.filledTonal(
                          onPressed: () => Navigator.pop(context),
                          tooltip: 'Voltar',
                          iconSize: 32,
                          constraints: const BoxConstraints(
                            minWidth: 56,
                            minHeight: 56,
                          ),
                          icon: const Icon(Icons.arrow_back_rounded),
                        ),
                      ),
                    ),
                    Expanded(
                      child: wide
                          ? Row(
                              children: [
                                SizedBox(
                                  width: box.maxWidth * 0.34,
                                  child: preview,
                                ),
                                Expanded(child: grid),
                              ],
                            )
                          : Column(
                              children: [
                                SizedBox(
                                  height: box.maxHeight * 0.3,
                                  child: preview,
                                ),
                                Expanded(child: grid),
                              ],
                            ),
                    ),
                  ],
                );
              },
            );
          },
        ),
      ),
    );
  }
}

/// A Mia vestida e quantas estrelas já ganhou
class _Preview extends StatelessWidget {
  const _Preview({required this.total, required this.worn, required this.wide});

  final int total;
  final List<Outfit> worn;
  final bool wide;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Flexible(
          child: LayoutBuilder(
            builder: (context, box) => MiaAvatar(
              pose: MiaPose.happy,
              outfits: worn,
              size: (wide ? box.maxHeight : box.maxHeight).clamp(80.0, 260.0),
            ),
          ),
        ),
        Semantics(
          label: '$total estrelas ganhas',
          excludeSemantics: true,
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.xs,
            ),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF3C4),
              borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.star_rounded,
                  color: Color(0xFFF5B700),
                  size: 28,
                ),
                const SizedBox(width: AppSpacing.xs),
                Text(
                  '$total',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF7A5300),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _OutfitGrid extends StatelessWidget {
  const _OutfitGrid({
    required this.total,
    required this.worn,
    required this.onTap,
    required this.columns,
  });

  final int total;
  final List<Outfit> worn;
  final void Function(Outfit) onTap;
  final int columns;

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: columns,
      padding: const EdgeInsets.all(AppSpacing.md),
      mainAxisSpacing: AppSpacing.md,
      crossAxisSpacing: AppSpacing.md,
      childAspectRatio: 0.9,
      children: [
        for (final outfit in outfits)
          _OutfitTile(
            key: ValueKey('outfit-${outfit.id}'),
            outfit: outfit,
            locked: outfit.stars > total,
            worn: worn.any((o) => o.id == outfit.id),
            onTap: () => onTap(outfit),
          ),
      ],
    );
  }
}

class _OutfitTile extends StatelessWidget {
  const _OutfitTile({
    super.key,
    required this.outfit,
    required this.locked,
    required this.worn,
    required this.onTap,
  });

  final Outfit outfit;
  final bool locked;
  final bool worn;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final preview = _OutfitPreview(outfit: outfit);
    return Semantics(
      button: true,
      label: locked
          ? '${outfit.name}, fechado, ${outfit.stars} estrelas'
          : (worn ? '${outfit.name}, vestido' : outfit.name),
      excludeSemantics: true,
      child: Material(
        color: locked ? const Color(0xFFECEFF1) : AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          child: Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
              border: Border.all(
                color: worn ? const Color(0xFF0B7A73) : const Color(0xFFCFD8DC),
                width: worn ? 4 : 2,
              ),
            ),
            child: Column(
              children: [
                Expanded(
                  child: Center(
                    // fechado: a Mia em cinza e com um cadeado por cima
                    child: locked
                        ? Stack(
                            alignment: Alignment.center,
                            children: [
                              Opacity(opacity: 0.35, child: preview),
                              const Icon(
                                Icons.lock_rounded,
                                size: 40,
                                color: Color(0xFF78909C),
                              ),
                            ],
                          )
                        : preview,
                  ),
                ),
                if (locked)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.star_rounded,
                        color: Color(0xFFF5B700),
                        size: 22,
                      ),
                      Text(
                        '${outfit.stars}',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: AppColors.textSecond,
                            ),
                      ),
                    ],
                  )
                else
                  Icon(
                    worn ? Icons.check_circle_rounded : Icons.circle_outlined,
                    color: worn ? const Color(0xFF0B7A73) : AppColors.textLight,
                    size: 26,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// A Mia só com [outfit], com zoom na parte onde ele fica (cabeça, rosto ou pescoço), para o
/// acessório aparecer grande na miniatura.
class _OutfitPreview extends StatelessWidget {
  const _OutfitPreview({required this.outfit});

  final Outfit outfit;

  static const _zoom = 2.0;

  /// O ponto da Mia (em frações do desenho) que fica no centro da miniatura
  static Offset _focus(OutfitSlot slot) => switch (slot) {
    OutfitSlot.hat => const Offset(0.55, 0.22),
    OutfitSlot.face => const Offset(0.5, 0.45),
    OutfitSlot.neck => const Offset(0.5, 0.78),
  };

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, box) {
        final side = box.biggest.shortestSide.clamp(48.0, 140.0);
        final focus = _focus(outfit.slot);
        return ClipRRect(
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          child: SizedBox(
            width: side,
            height: side,
            child: Transform(
              alignment: Alignment.center,
              // leva o ponto de interesse para o centro e amplia em volta dele
              transform: Matrix4.identity()
                ..translateByDouble(
                  _zoom * (0.5 - focus.dx) * side,
                  _zoom * (0.5 - focus.dy) * side,
                  0,
                  1,
                )
                ..scaleByDouble(_zoom, _zoom, 1, 1),
              child: MiaAvatar(outfits: [outfit], size: side),
            ),
          ),
        );
      },
    );
  }
}
