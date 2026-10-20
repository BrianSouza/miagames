"""Gera as ilustrações SVG do app (sem dependências).

Uso: python3 tool/generate_illustrations.py

- assets/images/memory_game.svg  → ícone do jogo da memória na Home
- assets/images/which_letter.svg → ícone do "Qual é a letra?"
- assets/games/missing-syllable/img/*.svg → desenhos das palavras do "Qual sílaba falta?" (tool/words_art.py)
- assets/images/mia/*.svg        → a gatinha Mia em 4 poses e os acessórios outfit_*.svg (Flutter)
- assets/games/_shared/img/*.svg → as mesmas poses para os jogos (web)
- tool/brand/*.svg               → fontes do ícone do app e do splash (veja tool/render_brand.js)

Tudo é desenhado com traços e formas (sem <text>): o flutter_svg não desenha
texto, e assim o ícone não depende de nenhuma fonte.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mia import POSES, OUTFITS, head_svg, mono_svg, outfit_svg
from words_art import WORDS, VIEWBOX as WORD_VIEWBOX

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

TEAL, TEAL_DARK = '#4ECDC4', '#3AB5AD'
BLUE = '#1565C0'


def stroke(d, color, width=7):
    return (f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" '
            'stroke-linecap="round" stroke-linejoin="round"/>')


# "?" da carta virada para baixo
question_mark = (
    stroke('M28 42 Q28 28 40 28 Q52 28 52 40 Q52 48 40 54 L40 60', '#fff', 6)
    + '<circle cx="40" cy="73" r="3.6" fill="#fff"/>'
)

icon = (
    # carta virada para baixo (atrás, inclinada para a esquerda)
    '<g transform="rotate(-12 40 60)">'
    f'<rect x="12" y="24" width="56" height="72" rx="10" fill="{TEAL_DARK}"/>'
    + question_mark +
    '</g>'
    # carta virada para cima (na frente, inclinada para a direita)
    '<g transform="rotate(10 78 56)">'
    '<rect x="50" y="20" width="56" height="72" rx="10" fill="#fff" stroke="#D9E2E5" stroke-width="2"/>'
    + stroke('M66 62 L78 32 L90 62 M70.5 52 L85.5 52', BLUE, 6.5)
    + '</g>'
)

path = os.path.join(ROOT, 'assets/images/memory_game.svg')
with open(path, 'w') as f:
    f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">{icon}</svg>\n')
print('ícone do jogo gerado:', os.path.relpath(path, ROOT))


# ── Mia, a gatinha mascote ───────────────────────────────────────────────────
def write(rel, text):
    full = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w') as f:
        f.write(text)
    return rel


for pose, svg in POSES.items():
    write(f'assets/images/mia/mia_{pose}.svg', svg)
    write(f'assets/games/_shared/img/mia_{pose}.svg', svg)
print('Mia gerada:', ', '.join(POSES))

write('tool/brand/mia_head.svg', head_svg())
write('tool/brand/mia_mono.svg', mono_svg())
print('fontes do ícone gerados em tool/brand/')


# ── Ícone do "Qual é a letra?": uma letra num cartão e um alto-falante ────────
which_letter = (
    '<rect x="14" y="20" width="62" height="80" rx="12" fill="#fff" stroke="#D9E2E5" stroke-width="2"/>'
    # o "B" grande
    + stroke('M32 38 L32 82 M32 38 H48 Q60 38 60 50 Q60 60 48 60 H32 M48 60 Q62 60 62 71 Q62 82 48 82 H32', BLUE, 7)
    # alto-falante com ondas
    + '<g transform="translate(72 52)">'
    '<path d="M0 12 H8 L20 2 V34 L8 24 H0 Z" fill="#E76F7F"/>'
    + stroke('M26 10 Q34 18 26 26', '#E76F7F', 4.5)
    + stroke('M31 3 Q45 18 31 33', '#E76F7F', 4.5)
    + '</g>'
)
write('assets/images/which_letter.svg',
      f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">{which_letter}</svg>\n')
print('ícone gerado: assets/images/which_letter.svg')


# ── "Quantos tem?": os objetos que a criança conta (100x100) e o ícone ────────
def star_path(cx, cy, outer, inner):
    import math
    pts = []
    for i in range(10):
        r = outer if i % 2 == 0 else inner
        a = -math.pi / 2 + i * math.pi / 5
        pts.append(f'{cx + r * math.cos(a):.1f} {cy + r * math.sin(a):.1f}')
    return 'M' + ' L'.join(pts) + ' Z'


def wedge(cx, cy, r, start_deg, end_deg, color):
    import math
    a0, a1 = math.radians(start_deg), math.radians(end_deg)
    x0, y0 = cx + r * math.cos(a0), cy + r * math.sin(a0)
    x1, y1 = cx + r * math.cos(a1), cy + r * math.sin(a1)
    return f'<path d="M{cx} {cy} L{x0:.1f} {y0:.1f} A{r} {r} 0 0 1 {x1:.1f} {y1:.1f} Z" fill="{color}"/>'


def face(cx, cy, spread=9, color='#2D3436'):
    """Olhinhos e sorriso: os objetos ganham uma carinha amigável"""
    return (f'<circle cx="{cx - spread}" cy="{cy}" r="3.4" fill="{color}"/>'
            f'<circle cx="{cx + spread}" cy="{cy}" r="3.4" fill="{color}"/>'
            + stroke(f'M{cx - 6} {cy + 8} Q{cx} {cy + 14} {cx + 6} {cy + 8}', color, 3))


OBJECTS = {
    'star': (
        f'<path d="{star_path(50, 53, 44, 19)}" fill="#FFC93C" stroke="#F5A700" stroke-width="4" stroke-linejoin="round"/>'
        + face(50, 54, 8)
    ),
    'ball': (
        '<circle cx="50" cy="50" r="42" fill="#fff"/>'
        + wedge(50, 50, 42, -90, -30, '#FF6B6B') + wedge(50, 50, 42, -30, 30, '#FFE66D')
        + wedge(50, 50, 42, 30, 90, '#54A0FF') + wedge(50, 50, 42, 90, 150, '#FF6B6B')
        + wedge(50, 50, 42, 150, 210, '#FFE66D') + wedge(50, 50, 42, 210, 270, '#54A0FF')
        + '<circle cx="50" cy="50" r="42" fill="none" stroke="#2D3436" stroke-width="3"/>'
        '<circle cx="50" cy="50" r="9" fill="#fff" stroke="#2D3436" stroke-width="3"/>'
    ),
    'apple': (
        '<path d="M50 30 C32 16 8 32 14 60 C20 86 40 94 50 86 C60 94 80 86 86 60 C92 32 68 16 50 30 Z" '
        'fill="#E53935" stroke="#B71C1C" stroke-width="3.5" stroke-linejoin="round"/>'
        '<ellipse cx="30" cy="48" rx="6" ry="10" fill="#fff" opacity="0.45" transform="rotate(20 30 48)"/>'
        + stroke('M50 30 Q52 18 60 10', '#6D4C41', 5)
        + '<path d="M54 22 Q68 8 82 18 Q68 32 54 22 Z" fill="#2ED573" stroke="#1B9E52" stroke-width="3" stroke-linejoin="round"/>'
    ),
    'fish': (
        '<path d="M74 50 L96 30 Q92 50 96 70 Z" fill="#F57C00" stroke="#E65100" stroke-width="3" stroke-linejoin="round"/>'
        '<ellipse cx="46" cy="50" rx="34" ry="24" fill="#FF9F43" stroke="#E65100" stroke-width="3.5"/>'
        + stroke('M52 30 Q58 50 52 70', '#F57C00', 4)
        + '<circle cx="30" cy="44" r="6.5" fill="#fff"/><circle cx="31" cy="44" r="3.4" fill="#2D3436"/>'
        + stroke('M20 58 Q28 64 36 58', '#2D3436', 3)
    ),
    'flower': (
        stroke('M50 56 L50 94', '#2ED573', 7)
        + '<ellipse cx="66" cy="78" rx="14" ry="7" fill="#2ED573" transform="rotate(-25 66 78)"/>'
        + ''.join(
            f'<circle cx="{50 + 20 * __import__("math").cos(__import__("math").radians(a)):.1f}" '
            f'cy="{36 + 20 * __import__("math").sin(__import__("math").radians(a)):.1f}" r="15" '
            'fill="#FF9FF3" stroke="#D63FC3" stroke-width="3"/>'
            for a in (-90, -18, 54, 126, 198))
        + '<circle cx="50" cy="36" r="12" fill="#FFE66D" stroke="#F5A700" stroke-width="3"/>'
    ),
}
for name, art in OBJECTS.items():
    write(f'assets/games/how-many/img/{name}.svg',
          f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{art}</svg>\n')
print('objetos gerados:', ', '.join(OBJECTS))

# ícone: três estrelinhas e o número 3
how_many_icon = (
    f'<path d="{star_path(34, 40, 22, 9.5)}" fill="#FFC93C" stroke="#F5A700" stroke-width="3" stroke-linejoin="round"/>'
    f'<path d="{star_path(74, 34, 22, 9.5)}" fill="#FFC93C" stroke="#F5A700" stroke-width="3" stroke-linejoin="round"/>'
    f'<path d="{star_path(54, 72, 22, 9.5)}" fill="#FFC93C" stroke="#F5A700" stroke-width="3" stroke-linejoin="round"/>'
    '<circle cx="92" cy="88" r="22" fill="#fff" stroke="#D9E2E5" stroke-width="2"/>'
    + stroke('M82 77 H98 L89 89 Q101 89 101 99 Q101 108 91 108 Q85 108 82 104', '#C2185B', 5.5)
)
write('assets/images/how_many.svg',
      f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">{how_many_icon}</svg>\n')
print('ícone gerado: assets/images/how_many.svg')


# ── "Qual sílaba falta?": um desenho por palavra ──────────────────────────────
for word, art in WORDS.items():
    box = WORD_VIEWBOX.get(word, '0 0 100 100')
    write(f'assets/games/missing-syllable/img/{word}.svg',
          f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box}">{art()}</svg>\n')
print(f'{len(WORDS)} desenhos de palavras gerados')


# ── Ícone do "Qual sílaba falta?": o desenho de uma casa e a palavra com a lacuna ──
missing_icon = (
    '<g transform="translate(26 2) scale(0.68)">'
    + WORDS['casa']() +
    '</g>'
    # "CA" numa caixa branca (letras desenhadas com traços) e a lacuna tracejada
    + '<rect x="8" y="70" width="48" height="40" rx="9" fill="#fff" stroke="#D9E2E5" stroke-width="2"/>'
    + stroke('M30 83 Q18 80 18 90 Q18 100 30 97', BLUE, 5.5)
    + stroke('M33 99 L39 80 L45 99 M35.5 92.5 H42.5', BLUE, 5.5)
    + '<rect x="64" y="70" width="48" height="40" rx="9" fill="none" stroke="#90A4AE" stroke-width="3.5" stroke-dasharray="6 5"/>'
    + stroke('M80 84 Q80 78 88 78 Q96 78 96 85 Q96 90 88 93 V98', '#90A4AE', 4.5)
    + '<circle cx="88" cy="105" r="2.6" fill="#90A4AE"/>'
)
write('assets/images/missing_syllable.svg',
      f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">{missing_icon}</svg>\n')
print('ícone gerado: assets/images/missing_syllable.svg')


# ── Ícone do "Colorir": uma letra pintada e um pincel ────────────────────────
paint_icon = (
    '<rect x="10" y="14" width="76" height="92" rx="14" fill="#fff" stroke="#D9E2E5" stroke-width="2"/>'
    # o "A" contornado de azul, com o miolo pintado até a metade
    + stroke('M26 96 L48 34 L70 96 M34 76 H62', '#DDE6F2', 15)
    + '<path d="M26 96 L40 56 M34 76 H44" fill="none" stroke="#FF6B9A" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>'
    + stroke('M26 96 L48 34 L70 96 M34 76 H62', BLUE, 3.5)
    # o pincel
    + '<g transform="rotate(35 92 40)">'
    '<rect x="86" y="4" width="12" height="40" rx="6" fill="#FFC93C" stroke="#D99A00" stroke-width="2.5"/>'
    '<rect x="85" y="40" width="14" height="14" rx="2" fill="#B0BEC5" stroke="#78909C" stroke-width="2.5"/>'
    '<path d="M86 54 H98 L96 70 Q92 78 88 70 Z" fill="#FF6B9A" stroke="#C2185B" stroke-width="2.5" stroke-linejoin="round"/>'
    '</g>'
)
write('assets/images/paint.svg',
      f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">{paint_icon}</svg>\n')
print('ícone gerado: assets/images/paint.svg')


# ── Ícone do "Montar a palavra": a bola, "BO" encaixado e a peça "LA" sendo arrastada ──
build_icon = (
    '<g transform="translate(6 0) scale(0.62)">' + WORDS['bola']() + '</g>'
    # a peça "BO" já no lugar (caixa verde)
    + '<rect x="8" y="72" width="48" height="38" rx="9" fill="#EAFFF4" stroke="#2ED573" stroke-width="3"/>'
    + stroke('M16 82 V100 M16 82 H23 Q29 82 29 87 Q29 92 23 92 H16 M23 92 Q31 92 31 96 Q31 100 23 100 H16', BLUE, 4.5)
    + '<ellipse cx="44" cy="91" rx="7" ry="9.5" fill="none" stroke="#1565C0" stroke-width="4.5"/>'
    # a lacuna que falta (tracejada) e, por cima dela, a peça "LA" levantada
    + '<rect x="64" y="72" width="48" height="38" rx="9" fill="none" stroke="#90A4AE" stroke-width="3.5" stroke-dasharray="6 5"/>'
    + '<g transform="rotate(-9 90 56)">'
    '<rect x="72" y="52" width="40" height="36" rx="9" fill="#000" opacity=".15"/>'
    '<rect x="70" y="46" width="40" height="36" rx="9" fill="#fff" stroke="#D9E2E5" stroke-width="2"/>'
    + stroke('M80 54 V74 H90', BLUE, 4.5)
    + stroke('M92 74 L97 54 L102 74 M94 68 H100', BLUE, 4.5)
    + '</g>'
)
write('assets/images/build_word.svg',
      f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">{build_icon}</svg>\n')
print('ícone gerado: assets/images/build_word.svg')


# ── Ícone do "Na caixa certa": duas caixas (letras e números) e uma peça a caminho ──
sort_icon = (
    # a caixa das letras, com um "A"
    '<rect x="8" y="58" width="48" height="50" rx="10" fill="#E3F0FF" stroke="#54A0FF" stroke-width="3.5"/>'
    + stroke('M20 96 L32 68 L44 96 M24 88 H40', BLUE, 5)
    # a caixa dos números, com um "3"
    + '<rect x="64" y="58" width="48" height="50" rx="10" fill="#FDE4EF" stroke="#FF6B9A" stroke-width="3.5"/>'
    + stroke('M78 70 H96 L87 82 Q99 82 99 92 Q99 102 87 102 Q81 102 78 98', '#C2185B', 5)
    # uma peça levantada ("B"), a caminho da caixa das letras
    + '<g transform="rotate(-10 36 26)">'
    '<rect x="21" y="14" width="34" height="34" rx="8" fill="#000" opacity=".15" transform="translate(2 5)"/>'
    '<rect x="21" y="9" width="34" height="34" rx="8" fill="#fff" stroke="#D9E2E5" stroke-width="2"/>'
    + stroke('M32 18 V34 M32 18 H38 Q43 18 43 22.5 Q43 27 38 27 H32 M38 27 Q44 27 44 31 Q44 34 38 34 H32', '#2D3436', 3.6)
    + '</g>'
)
write('assets/images/sort_box.svg',
      f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">{sort_icon}</svg>\n')
print('ícone gerado: assets/images/sort_box.svg')


# ── Ícone do "Quebra-cabeça": a bola em quatro peças, uma delas levantada ──────
puzzle_icon = (
    # o quadro, com três peças no lugar (a bola cortada em quatro) e o lugar tracejado da quarta
    '<g transform="translate(10 12) scale(1.0)">'
    '<clipPath id="pz"><rect x="0" y="0" width="100" height="100" rx="14"/></clipPath>'
    '<g clip-path="url(#pz)">'
    '<rect width="100" height="100" fill="#BFE6FF"/>'
    '<g transform="scale(1)">' + WORDS['bola']() + '</g>'
    '</g>'
    # a peça de baixo à direita sai do quadro (cobre o canto com o fundo e fica tracejada)
    '<rect x="50" y="50" width="50" height="50" fill="#fff"/>'
    '<rect x="52" y="52" width="46" height="46" fill="none" stroke="#90A4AE" stroke-width="3.5" stroke-dasharray="6 5"/>'
    '<line x1="50" y1="0" x2="50" y2="100" stroke="#fff" stroke-width="3"/>'
    '<line x1="0" y1="50" x2="100" y2="50" stroke="#fff" stroke-width="3"/>'
    '<rect x="0" y="0" width="100" height="100" rx="14" fill="none" stroke="#D9E2E5" stroke-width="2"/>'
    '</g>'
    # a peça levantada, com sombra (um pedaço da bola)
    '<g transform="rotate(8 92 92)">'
    '<rect x="72" y="74" width="40" height="40" rx="8" fill="#000" opacity=".15" transform="translate(2 5)"/>'
    '<clipPath id="pz2"><rect x="72" y="70" width="40" height="40" rx="8"/></clipPath>'
    '<g clip-path="url(#pz2)"><rect x="72" y="70" width="40" height="40" fill="#BFE6FF"/>'
    # o quarto de baixo à direita da bola (de 50,50 a 100,100), reduzido a 80% e levado para a peça
    '<g transform="translate(32 30) scale(0.8)">' + WORDS['bola']() + '</g></g>'
    '<rect x="72" y="70" width="40" height="40" rx="8" fill="none" stroke="#fff" stroke-width="3"/>'
    '</g>'
)
write('assets/images/puzzle.svg',
      f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">{puzzle_icon}</svg>\n')
print('ícone gerado: assets/images/puzzle.svg')


# ── Acessórios da Mia (camadas transparentes, no quadro da Mia) ───────────────
for outfit_id in OUTFITS:
    svg = outfit_svg(outfit_id)
    write(f'assets/images/mia/outfit_{outfit_id}.svg', svg)
    write(f'assets/games/_shared/img/outfit_{outfit_id}.svg', svg)
print(f'{len(OUTFITS)} acessórios da Mia gerados')
