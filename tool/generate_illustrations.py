"""Gera as ilustrações SVG do app (sem dependências).

Uso: python3 tool/generate_illustrations.py

- assets/images/memory_game.svg  → ícone do jogo da memória na Home
- assets/images/mia/*.svg        → a gatinha Mia em 4 poses (Flutter)
- assets/games/_shared/img/*.svg → as mesmas poses para os jogos (web)
- tool/brand/*.svg               → fontes do ícone do app e do splash (veja tool/render_brand.js)

Tudo é desenhado com traços e formas (sem <text>): o flutter_svg não desenha
texto, e assim o ícone não depende de nenhuma fonte.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mia import POSES, head_svg, mono_svg

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
