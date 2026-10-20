import 'package:flutter/material.dart';
import '../core/audio/narrator.dart';
import '../core/storage/progress_store.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_spacing.dart';
import '../core/widgets/game_tile.dart';
import '../core/widgets/level_unlocked_dialog.dart';
import '../core/widgets/mia_avatar.dart';
import '../core/widgets/parental_gate.dart';
import '../modules/game_module.dart';
import '../modules/game_registry.dart';
import '../modules/level_progress.dart';
import '../modules/outfit_progress.dart';
import '../modules/outfits.dart';
import 'level_sheet.dart';
import 'wardrobe_screen.dart';
import 'game_screen.dart';
import 'parents_screen.dart';

/// O que a Mia diz quando a criança toca nela
const miaGreeting = 'Oi! Vamos brincar?';

/// Tela inicial: a Mia acena e os jogos do [gameRegistry] são cartões grandes.
/// Nomes de jogos e dificuldades são falados ao toque, para quem ainda não
/// sabe ler.
/// Como abrir a tela de um jogo. Os testes trocam por uma tela falsa (a WebView
/// não roda neles).
typedef GameScreenBuilder =
    Widget Function(
      BuildContext context,
      GameModule game,
      GameDifficulty difficulty,
    );

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.narrator,
    required this.store,
    this.gameBuilder,
  });

  final Narrator narrator;
  final ProgressStore store;
  final GameScreenBuilder? gameBuilder;

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

  Future<void> _openWardrobe(BuildContext context) => Navigator.push<void>(
    context,
    MaterialPageRoute(
      builder: (_) => WardrobeScreen(narrator: narrator, store: store),
    ),
  );

  /// Abre o jogo no nível escolhido. Ao voltar, se um nível novo abriu, a Mia comemora
  /// e a criança pode seguir direto para ele.
  Future<void> _openGame(
    BuildContext context,
    GameModule game,
    GameDifficulty difficulty,
  ) async {
    final before = unlockedCount(store, game);
    final outfitsBefore = unlockedOutfits(totalStars(store)).length;
    await Navigator.push<void>(
      context,
      MaterialPageRoute(
        builder: (ctx) =>
            gameBuilder?.call(ctx, game, difficulty) ??
            GameScreen(
              game: game,
              difficulty: difficulty,
              narrator: narrator,
              store: store,
            ),
      ),
    );
    if (!context.mounted) return;

    // Um nível novo abriu? A Mia comemora e a criança pode seguir direto para ele.
    if (unlockedCount(store, game) > before) {
      final opened = game.difficulties[unlockedCount(store, game) - 1];
      narrator.speak(levelUnlockedSpeech(opened));
      final playNow = await showLevelUnlockedDialog(
        context,
        difficulty: opened,
        outfits: wornOutfits(store),
      );
      if (playNow && context.mounted) {
        narrator.speak(opened.spoken);
        await _openGame(context, game, opened);
        return; // o jogo seguinte cuida dos acessórios que ganhar
      }
    }

    // As estrelas somadas abriram um acessório? A Mia o ganha e a criança pode vestir.
    final earned = unlockedOutfits(totalStars(store)).skip(outfitsBefore);
    for (final outfit in earned) {
      if (!context.mounted) return;
      narrator.speak(outfitUnlockedSpeech(outfit));
      final wearNow = await showOutfitUnlockedDialog(
        context,
        outfit: outfit,
        worn: wornOutfits(store),
      );
      if (wearNow) {
        await store.setWornOutfitIds(wear(store.wornOutfitIds, outfit));
      }
    }
  }

  void _showLevelPicker(BuildContext context, GameModule game) {
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
      builder: (ctx) => LevelSheet(
        game: game,
        store: store,
        outfits: wornOutfits(store),
        onLocked: (diff) => narrator.speak(
          'Ganhe duas estrelas no ${diff.previous!.spoken.toLowerCase()} para abrir este.',
        ),
        onSelect: (diff) {
          narrator.speak(diff.spoken);
          Navigator.pop(ctx);
          _openGame(context, game, diff);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      // A Mia da Home se atualiza quando o guarda-roupa muda (a Home fica atrás dele)
      body: SafeArea(
        child: ListenableBuilder(
          listenable: store,
          builder: (context, _) => LayoutBuilder(
            builder: (context, box) {
              // Celular e tablet em pé: 2 colunas; telas largas (paisagem): 4
              final columns = box.maxWidth >= 840 ? 4 : 2;
              final narrow = box.maxWidth < 400;
              return CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: _Header(
                      narrow: narrow,
                      outfits: wornOutfits(store),
                      onGreeting: () => narrator.speak(miaGreeting),
                      onWardrobe: () => _openWardrobe(context),
                      onParentsArea: () => _openParentsArea(context),
                    ),
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.md,
                      AppSpacing.sm,
                      AppSpacing.md,
                      AppSpacing.xl,
                    ),
                    sliver: SliverGrid(
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: columns,
                        crossAxisSpacing: AppSpacing.md,
                        mainAxisSpacing: AppSpacing.lg,
                        childAspectRatio: narrow ? 0.78 : 0.85,
                      ),
                      delegate: SliverChildBuilderDelegate(
                        (ctx, i) => GameTile(
                          game: gameRegistry[i],
                          onTap: () =>
                              _showLevelPicker(context, gameRegistry[i]),
                        ),
                        childCount: gameRegistry.length,
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.narrow,
    required this.outfits,
    required this.onGreeting,
    required this.onWardrobe,
    required this.onParentsArea,
  });

  final bool narrow;
  final List<Outfit> outfits;
  final VoidCallback onGreeting;
  final VoidCallback onWardrobe;
  final VoidCallback onParentsArea;

  @override
  Widget build(BuildContext context) {
    final wardrobeButton = IconButton.filledTonal(
      onPressed: onWardrobe,
      tooltip: 'Vestir a Mia',
      iconSize: 30,
      constraints: const BoxConstraints(minWidth: 56, minHeight: 56),
      icon: const Icon(Icons.checkroom_rounded),
    );
    final parentsButton = IconButton(
      onPressed: onParentsArea,
      tooltip: 'Área dos pais',
      iconSize: 26,
      constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
      color: AppColors.textSecond,
      icon: const Icon(Icons.settings_rounded),
    );
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.sm,
        AppSpacing.xs,
        0,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          GestureDetector(
            onTap: onGreeting,
            child: MiaPopIn(
              child: MiaAvatar(
                pose: MiaPose.wave,
                size: narrow ? 96 : 128,
                outfits: outfits,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: _SpeechBubble(onTap: onGreeting, compact: narrow),
            ),
          ),
          // Os botões: o guarda-roupa é da criança (grande e alegre); a engrenagem é discreta e longe do
          // dedo dela, e o bloqueio parental protege. Em tela estreita ficam um sobre o outro,
          // para sobrar espaço para o balão da Mia.
          if (narrow)
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [wardrobeButton, parentsButton],
            )
          else ...[
            wardrobeButton,
            Align(alignment: Alignment.topRight, child: parentsButton),
          ],
        ],
      ),
    );
  }
}

/// Balão de fala da Mia. Tocar nele repete a saudação em voz alta.
class _SpeechBubble extends StatelessWidget {
  const _SpeechBubble({required this.onTap, required this.compact});

  final VoidCallback onTap;

  /// Tela estreita: sem o alto-falante e com letra menor, para a frase caber
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: miaGreeting,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: Row(
          children: [
            CustomPaint(
              size: const Size(12, 20),
              painter: _BubbleTailPainter(),
            ),
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm + 2,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                  boxShadow: const [
                    BoxShadow(color: Color(0x1A000000), offset: Offset(0, 3)),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        miaGreeting,
                        style:
                            (compact
                                    ? Theme.of(context).textTheme.titleMedium
                                    : Theme.of(context).textTheme.titleLarge)
                                ?.copyWith(
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.textPrimary,
                                ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (!compact) ...[
                      const SizedBox(width: AppSpacing.xs),
                      const Icon(
                        Icons.volume_up_rounded,
                        color: AppColors.textSecond,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BubbleTailPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()
      ..moveTo(size.width, 0)
      ..lineTo(0, size.height / 2)
      ..lineTo(size.width, size.height)
      ..close();
    canvas.drawPath(path, Paint()..color = Colors.white);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
