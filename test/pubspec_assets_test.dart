import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:miagames/modules/game_registry.dart';

/// O Flutter não inclui subpastas de `assets:` sozinho. Uma pasta esquecida no
/// pubspec funciona nos testes de navegador e quebra só no aparelho. Este teste
/// segue os arquivos que cada jogo carrega (scripts, estilos, fontes, imagens)
/// e confere que a pasta de cada um está declarada.
void main() {
  final declared = RegExp(r'^\s*-\s+(assets/\S+)\s*$', multiLine: true)
      .allMatches(File('pubspec.yaml').readAsStringSync())
      .map((m) => m.group(1)!)
      .toSet();

  bool isDeclared(String file) {
    final dir = file.substring(0, file.lastIndexOf('/') + 1);
    return declared.contains(dir) || declared.contains(file);
  }

  String resolve(String from, String ref) {
    final parts = from.split('/')..removeLast();
    for (final part in ref.split('/')) {
      if (part == '..') {
        parts.removeLast();
      } else if (part != '.' && part.isNotEmpty) {
        parts.add(part);
      }
    }
    return parts.join('/');
  }

  List<String> refsOf(String file) {
    final text = File(file).readAsStringSync();
    final pattern = file.endsWith('.css')
        ? RegExp(r'''url\(\s*['"]?([^'")]+)['"]?\s*\)''')
        : RegExp(r'''(?:src|href)="([^"]+)"''');
    return pattern
        .allMatches(text)
        .map((m) => m.group(1)!)
        .where((r) => !r.startsWith('http') && !r.startsWith('data:'))
        .toList();
  }

  // Imagens e fontes carregadas pelo JS (e não pelo HTML) não aparecem ao seguir o
  // HTML: por isso, toda pasta de assets/games que tenha arquivos precisa estar declarada.
  test('toda pasta de assets/games com arquivos está declarada', () {
    final dirs = Directory('assets/games')
        .listSync(recursive: true)
        .whereType<File>()
        .map((f) => f.path.substring(0, f.path.lastIndexOf('/') + 1))
        .toSet();
    expect(dirs.length, greaterThan(4));
    for (final dir in dirs) {
      expect(declared, contains(dir), reason: 'declare $dir em flutter.assets');
    }
  });

  for (final game in gameRegistry) {
    test(
      '${game.id}: todos os arquivos que o jogo carrega estão declarados',
      () {
        final pending = [game.assetPath];
        final seen = <String>{};
        while (pending.isNotEmpty) {
          final file = pending.removeLast();
          if (!seen.add(file)) continue;

          expect(File(file).existsSync(), isTrue, reason: '$file não existe');
          expect(
            isDeclared(file),
            isTrue,
            reason: '$file: declare a pasta em flutter.assets no pubspec.yaml',
          );
          if (file.endsWith('.html') || file.endsWith('.css')) {
            pending.addAll(refsOf(file).map((r) => resolve(file, r)));
          }
        }
        expect(seen.length, greaterThan(3));
      },
    );

    test('${game.id}: o ícone do jogo está declarado', () {
      expect(File(game.iconAsset).existsSync(), isTrue);
      expect(isDeclared(game.iconAsset), isTrue);
    });
  }
}
