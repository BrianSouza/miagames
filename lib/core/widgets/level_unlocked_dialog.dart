import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../modules/furniture.dart';
import '../../modules/game_module.dart';
import '../../modules/outfits.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import 'mia_avatar.dart';

/// "Nível 3 aberto!": a Mia comemora quando a criança abre um nível novo.
/// Devolve `true` se ela quiser jogar o nível agora.
Future<bool> showLevelUnlockedDialog(
  BuildContext context, {
  required GameDifficulty difficulty,
  List<Outfit> outfits = const [],
}) async {
  final play = await showDialog<bool>(
    context: context,
    builder: (_) =>
        _LevelUnlockedDialog(difficulty: difficulty, outfits: outfits),
  );
  return play ?? false;
}

/// "A Mia ganhou a coroa!": um acessório novo abriu. Devolve `true` se a criança quiser vesti-lo agora.
Future<bool> showOutfitUnlockedDialog(
  BuildContext context, {
  required Outfit outfit,
  List<Outfit> worn = const [],
}) async {
  final wear = await showDialog<bool>(
    context: context,
    builder: (_) => _OutfitUnlockedDialog(outfit: outfit, worn: worn),
  );
  return wear ?? false;
}

/// "O quarto da Mia ganhou o abajur!": um móvel novo abriu. Devolve `true` se a criança quiser
/// ir ver o móvel no quarto agora.
Future<bool> showFurnitureUnlockedDialog(
  BuildContext context, {
  required Furniture item,
}) async {
  final see = await showDialog<bool>(
    context: context,
    builder: (_) => _FurnitureUnlockedDialog(item: item),
  );
  return see ?? false;
}

/// O que a voz diz ao ganhar um móvel
String furnitureUnlockedSpeech(Furniture item) =>
    'Parabéns! O quarto da Mia ganhou: ${item.name.toLowerCase()}!';

/// O que a voz diz ao ganhar um acessório
String outfitUnlockedSpeech(Outfit outfit) =>
    'Parabéns! A Mia ganhou ${outfit.name.toLowerCase()}!';

/// O que a voz diz ao abrir um nível
String levelUnlockedSpeech(GameDifficulty difficulty) =>
    'Parabéns! Você abriu o ${difficulty.spoken.toLowerCase()}!';

class _LevelUnlockedDialog extends StatelessWidget {
  const _LevelUnlockedDialog({required this.difficulty, required this.outfits});

  final GameDifficulty difficulty;
  final List<Outfit> outfits;

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
            MiaPopIn(
              child: MiaAvatar(
                pose: MiaPose.cheer,
                size: 140,
                outfits: outfits,
              ),
            ),
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

class _OutfitUnlockedDialog extends StatelessWidget {
  const _OutfitUnlockedDialog({required this.outfit, required this.worn});

  final Outfit outfit;
  final List<Outfit> worn;

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
            // a Mia já com o item novo (e o que mais ela vestia)
            MiaPopIn(
              child: MiaAvatar(
                pose: MiaPose.cheer,
                size: 160,
                outfits: dressFrom([...worn.map((o) => o.id), outfit.id]),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'A Mia ganhou: ${outfit.name}!',
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
                child: const Icon(Icons.checkroom_rounded, size: 52),
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

class _FurnitureUnlockedDialog extends StatelessWidget {
  const _FurnitureUnlockedDialog({required this.item});

  final Furniture item;

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
            // o móvel novo, grande, num círculo (o desenho é o mesmo que a criança arrasta no quarto)
            MiaPopIn(
              child: Container(
                width: 160,
                height: 160,
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                child: SvgPicture.asset(
                  'assets/games/mia-room/img/${item.id}.svg',
                  semanticsLabel: item.name,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'O quarto da Mia ganhou: ${item.name}!',
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
                child: const Icon(Icons.bedroom_child_rounded, size: 52),
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
