import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';

/// As ilustrações são SVG gerados por `tool/generate_illustrations.py`.
/// O flutter_svg não desenha `<text>`: um texto num SVG some do app sem erro.
void main() {
  final svgs = [
    ...Directory('assets/images').listSync(recursive: true),
    ...Directory('assets/games/_shared/img').listSync(recursive: true),
  ].whereType<File>().where((f) => f.path.endsWith('.svg')).toList();

  test('há ilustrações para conferir', () {
    expect(svgs.length, greaterThanOrEqualTo(5));
  });

  for (final file in svgs) {
    test('${file.path}: SVG válido, sem <text>', () {
      final svg = file.readAsStringSync();
      expect(svg, contains('<svg '));
      expect(svg, contains('viewBox='));
      expect(
        svg,
        isNot(contains('<text')),
        reason: 'flutter_svg não desenha texto',
      );
    });
  }

  test('a Mia tem as 4 poses, no app e nos jogos', () {
    for (final pose in ['happy', 'wave', 'cheer', 'think']) {
      expect(
        File('assets/images/mia/mia_$pose.svg').existsSync(),
        isTrue,
        reason: pose,
      );
      expect(
        File('assets/games/_shared/img/mia_$pose.svg').existsSync(),
        isTrue,
        reason: pose,
      );
    }
  });

  group('ícone e splash', () {
    ({int width, int height, int colorType}) png(String path) {
      final bytes = File(path).readAsBytesSync();
      final data = ByteData.sublistView(
        Uint8List.fromList(bytes.sublist(0, 26)),
      );
      expect(bytes.sublist(1, 4), 'PNG'.codeUnits, reason: '$path não é PNG');
      return (
        width: data.getUint32(16),
        height: data.getUint32(20),
        colorType: bytes[25],
      );
    }

    test('o ícone tem 1024x1024', () {
      for (final f in ['icon', 'icon_foreground', 'icon_mono']) {
        final p = png('assets/icon/$f.png');
        expect((p.width, p.height), (1024, 1024), reason: f);
      }
    });

    test('a camada da frente e a monocromática têm transparência', () {
      // tipo de cor 6 = RGBA: sem canal alfa a máscara do Android cortaria um quadrado
      expect(png('assets/icon/icon_foreground.png').colorType, 6);
      expect(png('assets/icon/icon_mono.png').colorType, 6);
    });

    test('as imagens do splash são quadradas e existem', () {
      for (final f in ['splash_mia', 'splash_android12']) {
        final p = png('assets/splash/$f.png');
        expect(p.width, p.height, reason: f);
        expect(p.width, greaterThanOrEqualTo(960), reason: f);
      }
    });
  });
}
