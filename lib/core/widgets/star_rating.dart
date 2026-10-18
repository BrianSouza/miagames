import 'package:flutter/material.dart';

/// Estrelas de desempenho (0 a [max]): conquistadas em amarelo, o resto em cinza.
class StarRating extends StatelessWidget {
  const StarRating({
    super.key,
    required this.stars,
    this.max = 3,
    this.size = 20,
  });

  final int stars;
  final int max;
  final double size;

  static const earned = Color(0xFFF5B700);
  static const missing = Color(0xFFDFE6E9);

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$stars de $max estrelas',
      excludeSemantics: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < max; i++)
            Icon(
              Icons.star_rounded,
              size: size,
              color: i < stars ? earned : missing,
            ),
        ],
      ),
    );
  }
}

/// Nível de dificuldade em barras crescentes (1 a 3), como sinal de celular.
class LevelBars extends StatelessWidget {
  const LevelBars({
    super.key,
    required this.level,
    required this.color,
    this.scale = 1,
  });

  final int level;
  final Color color;

  /// Tamanho relativo das barras (1 = o padrão)
  final double scale;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        for (var i = 1; i <= 3; i++)
          Container(
            width: 7 * scale,
            height: (6.0 + i * 6) * scale,
            margin: EdgeInsets.only(right: 3 * scale),
            decoration: BoxDecoration(
              color: i <= level ? color : const Color(0xFFDFE6E9),
              borderRadius: BorderRadius.circular(2 * scale),
            ),
          ),
      ],
    );
  }
}
