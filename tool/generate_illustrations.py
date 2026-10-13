"""Gera as ilustrações SVG do app (estilo único, flat, sem dependências).

Uso: python3 tool/generate_illustrations.py

- assets/games/memory/img/<animal>.svg  → cartas do Jogo da Memória
- assets/images/memory_game.svg          → ícone do jogo na Home
"""
import math
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

def eyes(y=46, dx=13, r=4.5, cx=50):
    s = ''
    for x in (cx - dx, cx + dx):
        s += f'<circle cx="{x}" cy="{y}" r="{r}" fill="#2D2A26"/>'
        s += f'<circle cx="{x+1.5}" cy="{y-1.6}" r="{r*0.32:.2f}" fill="#fff"/>'
    return s

def smile(y=66, w=7, color="#2D2A26"):
    return (f'<path d="M{50-w} {y} Q{50-w/2} {y+5} 50 {y} Q{50+w/2} {y+5} {50+w} {y}" '
            f'fill="none" stroke="{color}" stroke-width="2.4" stroke-linecap="round"/>')

def cheeks(y=58, dx=22, color="#F59AA0"):
    return ''.join(f'<ellipse cx="{50+s*dx}" cy="{y}" rx="5" ry="3" fill="{color}" opacity=".55"/>' for s in (-1, 1))

def whiskers(y=60):
    s = ''
    for side in (-1, 1):
        for dy in (-3, 3):
            x1, x2 = 50 + side*12, 50 + side*30
            s += f'<line x1="{x1}" y1="{y+dy/2}" x2="{x2}" y2="{y+dy*1.6}" stroke="#5A524B" stroke-width="1.6" stroke-linecap="round"/>'
    return s

A = {}

A['cachorro'] = (
  '<ellipse cx="22" cy="48" rx="11" ry="22" fill="#8B5A2B" transform="rotate(18 22 48)"/>'
  '<ellipse cx="78" cy="48" rx="11" ry="22" fill="#8B5A2B" transform="rotate(-18 78 48)"/>'
  '<circle cx="50" cy="52" r="30" fill="#D49A5C"/>'
  '<ellipse cx="62" cy="40" rx="9" ry="8" fill="#F1D7B5"/>'
  '<ellipse cx="50" cy="64" rx="16" ry="12" fill="#F1D7B5"/>'
  + eyes(46) +
  '<ellipse cx="50" cy="58" rx="6" ry="4.5" fill="#2D2A26"/>'
  + smile(66, 6) +
  '<path d="M47 69 Q50 78 53 69 Z" fill="#E86A7A"/>'
)

A['gato'] = (
  '<path d="M24 40 L28 14 L44 30 Z" fill="#F4A261"/><path d="M28 36 L30 21 L39 30 Z" fill="#F59AA0"/>'
  '<path d="M76 40 L72 14 L56 30 Z" fill="#F4A261"/><path d="M72 36 L70 21 L61 30 Z" fill="#F59AA0"/>'
  '<circle cx="50" cy="54" r="29" fill="#F4A261"/>'
  '<path d="M50 26 L46 36 M50 26 L54 36 M43 27 L44 34 M57 27 L56 34" stroke="#D97B2E" stroke-width="2.4" stroke-linecap="round"/>'
  '<ellipse cx="50" cy="65" rx="13" ry="9" fill="#FBE3C8"/>'
  + eyes(50) +
  '<path d="M46 59 L54 59 L50 63 Z" fill="#E86A7A"/>'
  + smile(65, 6) + whiskers(62)
)

A['rato'] = (
  '<circle cx="24" cy="32" r="17" fill="#9EA3A8"/><circle cx="24" cy="32" r="10" fill="#F59AA0"/>'
  '<circle cx="76" cy="32" r="17" fill="#9EA3A8"/><circle cx="76" cy="32" r="10" fill="#F59AA0"/>'
  '<ellipse cx="50" cy="58" rx="27" ry="26" fill="#B8BCC0"/>'
  '<ellipse cx="50" cy="70" rx="12" ry="8" fill="#E3E5E7"/>'
  + eyes(53, 11, 4) +
  '<circle cx="50" cy="66" r="4" fill="#E86A7A"/>'
  + smile(71, 5) + whiskers(67) + cheeks(62, 20)
)

A['coelho'] = (
  '<ellipse cx="36" cy="22" rx="8" ry="20" fill="#EDE6DD"/><ellipse cx="36" cy="22" rx="4" ry="14" fill="#F59AA0"/>'
  '<ellipse cx="64" cy="22" rx="8" ry="20" fill="#EDE6DD"/><ellipse cx="64" cy="22" rx="4" ry="14" fill="#F59AA0"/>'
  '<circle cx="50" cy="60" r="27" fill="#EDE6DD"/>'
  + eyes(56, 11, 4) +
  '<path d="M46 65 L54 65 L50 69 Z" fill="#E86A7A"/>'
  '<rect x="46.5" y="71" width="7" height="7" rx="1.5" fill="#fff" stroke="#CFC6BA" stroke-width="1"/>'
  '<line x1="50" y1="71" x2="50" y2="78" stroke="#CFC6BA" stroke-width="1"/>'
  + cheeks(66, 18) + whiskers(68)
)

A['raposa'] = (
  '<path d="M20 44 L22 12 L44 30 Z" fill="#E8743B"/><path d="M22 18 L23 12 L30 18 Z" fill="#2D2A26"/>'
  '<path d="M80 44 L78 12 L56 30 Z" fill="#E8743B"/><path d="M78 18 L77 12 L70 18 Z" fill="#2D2A26"/>'
  '<path d="M18 40 Q50 20 82 40 L50 86 Z" fill="#E8743B"/>'
  '<path d="M20 44 Q36 52 50 86 Q30 70 20 44 Z" fill="#FFF4E8"/>'
  '<path d="M80 44 Q64 52 50 86 Q70 70 80 44 Z" fill="#FFF4E8"/>'
  + eyes(46, 13, 4) +
  '<ellipse cx="50" cy="78" rx="5" ry="4" fill="#2D2A26"/>'
)

A['urso'] = (
  '<circle cx="24" cy="28" r="12" fill="#8D5A3B"/><circle cx="24" cy="28" r="6" fill="#C99A6E"/>'
  '<circle cx="76" cy="28" r="12" fill="#8D5A3B"/><circle cx="76" cy="28" r="6" fill="#C99A6E"/>'
  '<circle cx="50" cy="54" r="31" fill="#8D5A3B"/>'
  '<ellipse cx="50" cy="66" rx="15" ry="12" fill="#D9B48F"/>'
  + eyes(48) +
  '<ellipse cx="50" cy="61" rx="6" ry="4.5" fill="#2D2A26"/>'
  + smile(69, 5)
)

A['panda'] = (
  '<circle cx="24" cy="28" r="12" fill="#2D2A26"/><circle cx="76" cy="28" r="12" fill="#2D2A26"/>'
  '<circle cx="50" cy="54" r="31" fill="#F7F7F5"/>'
  '<ellipse cx="37" cy="48" rx="9" ry="11" fill="#2D2A26" transform="rotate(-25 37 48)"/>'
  '<ellipse cx="63" cy="48" rx="9" ry="11" fill="#2D2A26" transform="rotate(25 63 48)"/>'
  '<circle cx="37" cy="48" r="3.6" fill="#fff"/><circle cx="63" cy="48" r="3.6" fill="#fff"/>'
  '<circle cx="37.6" cy="48.6" r="2" fill="#2D2A26"/><circle cx="62.4" cy="48.6" r="2" fill="#2D2A26"/>'
  '<ellipse cx="50" cy="62" rx="5.5" ry="4" fill="#2D2A26"/>'
  + smile(68, 5) + cheeks(62, 21)
)

A['coala'] = (
  '<circle cx="20" cy="38" r="17" fill="#9AA5AE"/><circle cx="20" cy="38" r="10" fill="#E3E7EA"/>'
  '<circle cx="80" cy="38" r="17" fill="#9AA5AE"/><circle cx="80" cy="38" r="10" fill="#E3E7EA"/>'
  '<ellipse cx="50" cy="56" rx="29" ry="28" fill="#AEB8C0"/>'
  + eyes(48, 14, 4) +
  '<ellipse cx="50" cy="60" rx="8" ry="11" fill="#3E3A36"/>'
  '<ellipse cx="48" cy="55" rx="2" ry="3" fill="#6A645E"/>'
  + smile(74, 5) + cheeks(62, 21)
)

A['tigre'] = (
  '<circle cx="25" cy="30" r="11" fill="#F39C34"/><circle cx="25" cy="30" r="5" fill="#2D2A26"/>'
  '<circle cx="75" cy="30" r="11" fill="#F39C34"/><circle cx="75" cy="30" r="5" fill="#2D2A26"/>'
  '<circle cx="50" cy="54" r="31" fill="#F39C34"/>'
  '<path d="M50 23 L46 33 L54 33 Z M38 26 L41 34 M62 26 L59 34" fill="#2D2A26" stroke="#2D2A26" stroke-width="2.6" stroke-linecap="round"/>'
  '<path d="M19 50 L29 52 M20 58 L29 58 M81 50 L71 52 M80 58 L71 58" stroke="#2D2A26" stroke-width="2.8" stroke-linecap="round"/>'
  '<ellipse cx="50" cy="66" rx="17" ry="12" fill="#FFF4E8"/>'
  + eyes(47) +
  '<path d="M45 60 L55 60 L50 65 Z" fill="#E86A7A"/>'
  + smile(68, 5)
)

lion_mane = ''.join(
  f'<circle cx="{50+33*math.cos(a):.1f}" cy="{52+33*math.sin(a):.1f}" r="11" fill="#C0762A"/>'
  for a in [i*2*3.14159/12 for i in range(12)])
A['leao'] = (
  '<circle cx="50" cy="52" r="36" fill="#C0762A"/>' + lion_mane +
  '<circle cx="31" cy="30" r="8" fill="#F2C14E"/><circle cx="69" cy="30" r="8" fill="#F2C14E"/>'
  '<circle cx="50" cy="55" r="27" fill="#F2C14E"/>'
  '<ellipse cx="50" cy="66" rx="13" ry="9" fill="#FBE3B0"/>'
  + eyes(50, 11, 4) +
  '<path d="M45 60 L55 60 L50 65 Z" fill="#8B4A2B"/>'
  + smile(67, 5)
)

def write(path, body, view_box='0 0 100 100'):
    with open(os.path.join(ROOT, path), 'w') as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}">{body}</svg>\n')


for name, body in A.items():
    write(f'assets/games/memory/img/{name}.svg', body)

# Ícone do jogo: uma carta fechada atrás e uma aberta com o gato na frente
write('assets/images/memory_game.svg', (
    '<g transform="rotate(-12 40 60)">'
    '<rect x="12" y="24" width="56" height="72" rx="10" fill="#3AB5AD"/>'
    '<text x="40" y="72" font-family="sans-serif" font-size="32" font-weight="900" '
    'fill="#fff" fill-opacity=".8" text-anchor="middle">?</text></g>'
    '<g transform="rotate(10 78 56)">'
    '<rect x="50" y="20" width="56" height="72" rx="10" fill="#fff" stroke="#D9E2E5" stroke-width="2"/>'
    '<g transform="translate(55 32) scale(.46)">' + A['gato'] + '</g></g>'
), view_box='0 0 120 120')

print(f'{len(A)} animais + ícone do jogo gerados')
