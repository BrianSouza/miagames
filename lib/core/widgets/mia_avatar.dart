import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../modules/outfits.dart';

/// As poses da gatinha Mia (desenhadas em tool/mia.py).
enum MiaPose { happy, wave, cheer, think }

/// A Mia, mascote do app. É decorativa: leitores de tela a ignoram.
class MiaAvatar extends StatelessWidget {
  const MiaAvatar({
    super.key,
    this.pose = MiaPose.happy,
    this.size = 96,
    this.outfits = const [],
  });

  final MiaPose pose;
  final double size;

  /// O que ela veste: camadas transparentes por cima da pose (a cabeça fica no mesmo lugar
  /// em todas as poses)
  final List<Outfit> outfits;

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: SizedBox(
        width: size,
        height: size,
        child: Stack(
          children: [
            SvgPicture.asset(
              'assets/images/mia/mia_${pose.name}.svg',
              width: size,
              height: size,
            ),
            for (final outfit in outfits)
              SvgPicture.asset(outfit.asset, width: size, height: size),
          ],
        ),
      ),
    );
  }
}

/// A Mia "entra pulando": cresce com um quique rápido, no lugar de uma
/// segunda tela de abertura depois do splash.
class MiaPopIn extends StatelessWidget {
  const MiaPopIn({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.4, end: 1),
      duration: const Duration(milliseconds: 550),
      curve: Curves.elasticOut,
      builder: (context, scale, child) => Transform.scale(
        scale: scale,
        alignment: Alignment.bottomCenter,
        child: child,
      ),
      child: child,
    );
  }
}
