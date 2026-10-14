import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../modules/game_module.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';

/// Cartão grande e colorido de um jogo na Home: ilustração, nome e um
/// alto-falante (tocar fala o nome). Sem etiquetas de texto: quem tem 5 anos
/// escolhe pela figura. Encolhe um pouco ao ser tocado.
class GameTile extends StatefulWidget {
  const GameTile({super.key, required this.game, required this.onTap});

  final GameModule game;
  final VoidCallback onTap;

  @override
  State<GameTile> createState() => _GameTileState();
}

class _GameTileState extends State<GameTile> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (_pressed != value) setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    final game = widget.game;
    return Semantics(
      button: true,
      label: game.displayName,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: widget.onTap,
        onTapDown: (_) => _setPressed(true),
        onTapUp: (_) => _setPressed(false),
        onTapCancel: () => _setPressed(false),
        child: AnimatedScale(
          scale: _pressed ? 0.94 : 1,
          duration: const Duration(milliseconds: 140),
          curve: Curves.easeOutBack,
          child: LayoutBuilder(
            builder: (context, box) {
              // O texto cresce com o cartão (de 16 a 26)
              final fontSize = (box.maxWidth / 8).clamp(16.0, 26.0);
              return Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      game.tile,
                      Color.lerp(game.tile, game.accentColor, 0.35)!,
                    ],
                  ),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
                  boxShadow: [
                    BoxShadow(
                      color: game.accentColor.withValues(alpha: 0.4),
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Expanded(
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(AppSpacing.sm),
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                        child: SvgPicture.asset(
                          game.iconAsset,
                          fit: BoxFit.contain,
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      game.displayName,
                      style: TextStyle(
                        fontSize: fontSize,
                        fontWeight: FontWeight.w800,
                        height: 1.1,
                        color: AppColors.textPrimary,
                      ),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    const Icon(
                      Icons.volume_up_rounded,
                      size: 24,
                      color: AppColors.textPrimary,
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
