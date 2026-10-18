"""Desenhos das palavras do "Qual sílaba falta?" (quadro de 100x100, só formas e traços).

Cada função devolve o conteúdo de um <svg>. O nome da chave é o id da palavra:
assets/games/missing-syllable/img/<id>.svg.
"""
import math

DARK = '#2D3436'


def S(d, color, width=3.5, extra=''):
    return (f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" '
            f'stroke-linecap="round" stroke-linejoin="round"{extra}/>')


def shape(d, fill, line, width=3.5):
    return f'<path d="{d}" fill="{fill}" stroke="{line}" stroke-width="{width}" stroke-linejoin="round"/>'


def circle(cx, cy, r, fill, line=None, width=3.5):
    stroke = f' stroke="{line}" stroke-width="{width}"' if line else ''
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"{stroke}/>'


def ellipse(cx, cy, rx, ry, fill, line=None, width=3.5, extra=''):
    stroke = f' stroke="{line}" stroke-width="{width}"' if line else ''
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}"{stroke}{extra}/>'


def rect(x, y, w, h, fill, line=None, rx=0, width=3.5):
    stroke = f' stroke="{line}" stroke-width="{width}" stroke-linejoin="round"' if line else ''
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"{stroke}/>'


def eyes(cx, cy, spread, r=3.6):
    return circle(cx - spread, cy, r, DARK) + circle(cx + spread, cy, r, DARK)


def pentagon(cx, cy, r, rot=-90):
    pts = []
    for i in range(5):
        a = math.radians(rot + i * 72)
        pts.append(f'{cx + r * math.cos(a):.1f} {cy + r * math.sin(a):.1f}')
    return 'M' + ' L'.join(pts) + ' Z'


def star5(cx, cy, outer, inner):
    pts = []
    for i in range(10):
        r = outer if i % 2 == 0 else inner
        a = -math.pi / 2 + i * math.pi / 5
        pts.append(f'{cx + r * math.cos(a):.1f} {cy + r * math.sin(a):.1f}')
    return 'M' + ' L'.join(pts) + ' Z'


def soccer_ball():
    spokes = ''.join(
        S(f'M{50 + 14 * math.cos(math.radians(a)):.1f} {50 + 14 * math.sin(math.radians(a)):.1f} '
          f'L{50 + 28 * math.cos(math.radians(a)):.1f} {50 + 28 * math.sin(math.radians(a)):.1f}', DARK, 3)
        for a in (-90, -18, 54, 126, 198))
    patches = ''.join(
        f'<path d="{pentagon(50 + 42 * math.cos(math.radians(a)), 50 + 42 * math.sin(math.radians(a)), 13, a + 180)}" fill="{DARK}"/>'
        for a in (-90, -18, 54, 126, 198))
    return ('<defs><clipPath id="c"><circle cx="50" cy="50" r="42"/></clipPath></defs>'
            '<circle cx="50" cy="50" r="42" fill="#fff"/>'
            f'<g clip-path="url(#c)">{patches}</g>'
            f'<path d="{pentagon(50, 50, 14)}" fill="{DARK}"/>' + spokes +
            f'<circle cx="50" cy="50" r="42" fill="none" stroke="{DARK}" stroke-width="3.5"/>')


def house():
    return (rect(14, 44, 72, 46, '#FFD59A', '#C27A2C', 3)
            + rect(68, 18, 12, 22, '#B71C1C', '#8E1414', 2, 3)
            + shape('M6 48 L50 12 L94 48 Z', '#E53935', '#B71C1C')
            + rect(41, 62, 18, 28, '#8D5A2B', '#5D3A1A', 3, 3)
            + circle(55, 77, 1.8, '#FFD93B')
            + rect(20, 54, 16, 14, '#B3E5FC', '#4FA3D1', 2, 3) + rect(64, 54, 16, 14, '#B3E5FC', '#4FA3D1', 2, 3)
            + S('M28 54 V68 M20 61 H36', '#4FA3D1', 2.5) + S('M72 54 V68 M64 61 H80', '#4FA3D1', 2.5))


def duck():
    return (ellipse(46, 66, 34, 22, '#FFD93B', '#E0A800')
            + shape('M18 60 Q10 52 14 46 Q22 52 28 58 Z', '#FFD93B', '#E0A800')
            + circle(66, 36, 18, '#FFD93B', '#E0A800')
            + shape('M80 32 Q98 32 96 42 Q88 48 78 44 Z', '#FF9F43', '#E65100', 3)
            + circle(70, 30, 3.6, DARK) + circle(71, 29, 1.2, '#fff')
            + ellipse(44, 66, 15, 10, '#FFE680', '#E0A800', 3)
            + S('M40 88 L40 94 M52 88 L52 94', '#FF9F43', 4))


def frog():
    return (ellipse(50, 62, 40, 28, '#5DBB63', '#2E7D32')
            + circle(30, 34, 14, '#5DBB63', '#2E7D32') + circle(70, 34, 14, '#5DBB63', '#2E7D32')
            + circle(30, 33, 9, '#fff', None) + circle(70, 33, 9, '#fff', None)
            + circle(31, 34, 4.8, DARK) + circle(69, 34, 4.8, DARK)
            + S('M24 66 Q50 88 76 66', DARK, 4)
            + circle(44, 54, 1.8, DARK) + circle(56, 54, 1.8, DARK)
            + circle(24, 62, 5, '#FF9AA2') + circle(76, 62, 5, '#FF9AA2'))


def cow():
    return (shape('M30 22 Q24 8 34 6 Q36 16 38 22 Z', '#F5E6C8', '#B89B5E', 3)
            + shape('M70 22 Q76 8 66 6 Q64 16 62 22 Z', '#F5E6C8', '#B89B5E', 3)
            + ellipse(14, 40, 12, 7, '#fff', DARK, 3, ' transform="rotate(-20 14 40)"')
            + ellipse(86, 40, 12, 7, '#fff', DARK, 3, ' transform="rotate(20 86 40)"')
            + ellipse(50, 50, 31, 36, '#fff', DARK)
            + ellipse(36, 34, 11, 12, DARK) + ellipse(68, 28, 8, 8, DARK)
            + ellipse(50, 76, 22, 15, '#F8B4C0', DARK, 3)
            + circle(42, 76, 2.8, DARK) + circle(58, 76, 2.8, DARK)
            + circle(38, 54, 4, DARK) + circle(62, 54, 4, DARK))


def table():
    return (rect(10, 34, 80, 12, '#C68642', '#8D5A2B', 3)
            + rect(18, 46, 64, 8, '#A9702F', None)
            + rect(18, 46, 9, 44, '#C68642', '#8D5A2B', 2, 3) + rect(73, 46, 9, 44, '#C68642', '#8D5A2B', 2, 3))


def suitcase():
    return (S('M38 32 V22 Q38 14 46 14 H54 Q62 14 62 22 V32', '#6D4C41', 5.5)
            + rect(12, 30, 76, 56, '#E53935', '#B71C1C', 10)
            + rect(26, 30, 8, 56, '#FFC93C', None) + rect(66, 30, 8, 56, '#FFC93C', None)
            + rect(43, 50, 14, 10, '#FFC93C', '#D99A00', 2, 2.5)
            + circle(24, 90, 3.5, DARK) + circle(76, 90, 3.5, DARK))


def boot():
    return (shape('M30 10 H56 V54 L80 62 Q94 66 94 80 V88 H30 Z', '#8D5A2B', '#5D3A1A')
            + rect(30, 10, 26, 10, '#D7A86E', '#5D3A1A', 2, 3)
            + rect(26, 82, 70, 10, '#3E2723', None, 4)
            + S('M38 34 H50 M38 44 H50', '#D7A86E', 3))


def kite():
    return (shape('M50 6 L80 38 L50 74 L20 38 Z', '#FF6B6B', DARK, 3)
            + '<path d="M50 6 L80 38 L50 38 Z" fill="#FFE66D"/>'
            + '<path d="M50 74 L20 38 L50 38 Z" fill="#54A0FF"/>'
            + '<path d="M50 74 L80 38 L50 38 Z" fill="#2ED573"/>'
            + S('M50 6 V74 M20 38 H80', DARK, 2.5)
            + shape('M50 6 L80 38 L50 74 L20 38 Z', 'none', DARK, 3.5)
            + S('M50 74 Q38 82 50 88 Q62 94 50 99', '#6D4C41', 3)
            + circle(44, 84, 4, '#FF6B6B') + circle(56, 92, 4, '#FFE66D'))


def mouth():
    return (shape('M12 44 Q50 28 88 44 Q70 82 50 82 Q30 82 12 44 Z', '#7B1E1E', '#E53935', 6)
            + rect(33, 42, 34, 10, '#fff', None, 3)
            + ellipse(50, 72, 15, 8, '#FF8A95'))


def cup():
    return (S('M60 6 L54 46', '#E53935', 5)
            + shape('M24 18 H76 L70 88 H30 Z', '#E3F6FF', '#4FA3D1')
            + shape('M27 42 H73 L70 88 H30 Z', '#6EC6FF', '#4FA3D1')
            + S('M36 52 L38 76', '#fff', 4, ' opacity="0.7"'))


def cake():
    return (ellipse(50, 90, 42, 5, '#E0E0E0')
            + rect(12, 58, 76, 30, '#F8B4C0', '#D6728A', 6)
            + rect(24, 38, 52, 22, '#FFE0A3', '#D9A441', 6)
            + shape('M24 44 Q30 54 36 44 Q42 54 48 44 Q54 54 60 44 Q66 54 72 44 L76 44 L76 38 L24 38 Z', '#fff', '#D9A441', 2.5)
            + rect(46, 18, 8, 20, '#54A0FF', '#2F6FBF', 2, 2.5)
            + shape('M50 4 Q58 12 50 18 Q42 12 50 4 Z', '#FFB300', '#E65100', 2.5)
            + circle(32, 68, 3.5, '#E53935') + circle(50, 74, 3.5, '#E53935') + circle(68, 68, 3.5, '#E53935'))


def mouse():
    return (circle(26, 30, 16, '#B0BEC5', '#78909C') + circle(26, 30, 9, '#F8B4C0')
            + circle(74, 30, 16, '#B0BEC5', '#78909C') + circle(74, 30, 9, '#F8B4C0')
            + circle(50, 56, 30, '#B0BEC5', '#78909C')
            + ellipse(50, 68, 16, 12, '#ECEFF1', None)
            + eyes(50, 50, 11, 3.8) + circle(50, 66, 5, '#E76F7F')
            + S('M50 71 V74 M50 74 Q44 80 40 76 M50 74 Q56 80 60 76', DARK, 2.5)
            + S('M34 66 L12 62 M34 72 L14 78 M66 66 L88 62 M66 72 L86 78', DARK, 2, ' opacity="0.5"'))


def bell():
    return (circle(50, 9, 5.5, '#D99A00')
            + shape('M50 12 C32 12 28 32 28 48 C28 64 20 68 14 76 H86 C80 68 72 64 72 48 C72 32 68 12 50 12 Z', '#FFC93C', '#D99A00')
            + S('M36 30 Q34 44 36 56', '#FFF3C4', 4)
            + circle(50, 82, 8, '#8D5A2B', '#5D3A1A', 3))


def die():
    pips = ''.join(circle(x, y, 5.5, DARK) for x, y in ((34, 34), (66, 34), (50, 50), (34, 66), (66, 66)))
    return f'<g transform="rotate(10 50 50)">' + rect(14, 14, 72, 72, '#fff', DARK, 14) + pips + '</g>'


def bed():
    return (rect(8, 24, 12, 66, '#8D5A2B', '#5D3A1A', 3, 3) + rect(80, 46, 12, 44, '#8D5A2B', '#5D3A1A', 3, 3)
            + rect(14, 54, 72, 16, '#90CAF9', '#4C8FD1', 5)
            + rect(30, 46, 56, 20, '#FF8A95', '#D6566A', 6)
            + rect(14, 40, 24, 14, '#fff', '#B0BEC5', 6, 3)
            + rect(14, 70, 7, 20, '#8D5A2B', None) + rect(79, 70, 7, 20, '#8D5A2B', None))


def can():
    return (ellipse(50, 78, 28, 9, '#B0BEC5', '#78909C')
            + rect(22, 24, 56, 54, '#E53935', '#B71C1C', 0)
            + rect(22, 40, 56, 22, '#FFF3C4', None)
            + circle(50, 51, 8, '#E53935')
            + ellipse(50, 78, 28, 9, '#E53935', '#B71C1C')
            + ellipse(50, 24, 28, 9, '#CFD8DC', '#78909C')
            + ellipse(50, 24, 16, 4, '#ECEFF1', None))


def candle():
    return (ellipse(50, 90, 32, 6, '#8D6E63', '#5D4037', 3)
            + rect(34, 38, 32, 52, '#FFF3C4', '#D9B84A', 5)
            + shape('M34 50 Q40 60 46 50 L46 38 H34 Z', '#FFE9A0', None, 0)
            + S('M50 38 V30', DARK, 3)
            + shape('M50 4 Q64 18 50 30 Q36 18 50 4 Z', '#FFB300', '#E65100', 3)
            + shape('M50 14 Q56 20 50 26 Q44 20 50 14 Z', '#FFE66D', None, 0))


def banana():
    return (shape('M20 28 Q8 72 54 88 Q78 94 92 78 Q70 82 54 68 Q30 50 36 22 Z', '#FFE066', '#D9A400')
            + S('M24 34 Q18 62 48 78', '#FFF3B0', 3.5)
            + rect(30, 10, 10, 16, '#8D5A2B', '#5D3A1A', 2, 3)
            + circle(90, 78, 3.5, '#5D3A1A'))


def window():
    pane = lambda x, y: rect(x, y, 28, 30, '#B3E5FC', '#4FA3D1', 2, 2.5) + S(f'M{x + 6} {y + 24} L{x + 14} {y + 8}', '#fff', 3.5, ' opacity="0.8"')
    return (rect(12, 10, 76, 78, '#8D5A2B', '#5D3A1A', 6)
            + pane(18, 16) + pane(54, 16) + pane(18, 52) + pane(54, 52)
            + rect(6, 86, 88, 9, '#6D4C41', '#4E342E', 3, 3))


def tomato():
    return (circle(50, 58, 36, '#E53935', '#B71C1C')
            + ellipse(36, 44, 7, 11, '#fff', None, 0, ' opacity="0.4" transform="rotate(25 36 44)"')
            + shape(star5(50, 26, 20, 8), '#2ED573', '#1B9E52', 3)
            + S('M50 26 V12', '#1B9E52', 4))


def shoe():
    return (shape('M14 36 Q14 26 26 26 H44 Q48 44 62 48 L84 54 Q96 58 96 70 V76 H14 Z', '#E53935', '#B71C1C')
            + rect(10, 72, 90, 12, '#5D4037', '#3E2723', 6, 3)
            + S('M34 36 H44 M40 42 H50 M46 48 H56', '#fff', 3.5)
            + S('M14 62 H96', '#B71C1C', 2.5))


def pot():
    return (rect(6, 50, 14, 9, DARK, None, 4) + rect(80, 50, 14, 9, DARK, None, 4)
            + rect(18, 42, 64, 44, '#90A4AE', '#546E7A', 8)
            + shape('M14 44 Q50 14 86 44 Z', '#B0BEC5', '#546E7A')
            + circle(50, 20, 6, DARK)
            + S('M28 56 V76', '#CFD8DC', 4))


def monkey():
    return (circle(16, 50, 14, '#8D5A2B', '#5D3A1A') + circle(16, 50, 8, '#F2C39A')
            + circle(84, 50, 14, '#8D5A2B', '#5D3A1A') + circle(84, 50, 8, '#F2C39A')
            + circle(50, 50, 33, '#8D5A2B', '#5D3A1A')
            + ellipse(38, 48, 13, 15, '#F2C39A') + ellipse(62, 48, 13, 15, '#F2C39A')
            + ellipse(50, 68, 19, 15, '#F2C39A')
            + eyes(50, 46, 12, 3.8)
            + circle(45, 62, 2, DARK) + circle(55, 62, 2, DARK)
            + S('M40 72 Q50 82 60 72', DARK, 3.5))


def owl():
    return (shape('M20 30 L24 8 L42 24 Z', '#A1887F', '#6D4C41', 3) + shape('M80 30 L76 8 L58 24 Z', '#A1887F', '#6D4C41', 3)
            + ellipse(50, 58, 36, 38, '#A1887F', '#6D4C41')
            + ellipse(50, 74, 22, 18, '#EFEBE9', None)
            + S('M42 70 Q44 74 46 70 M54 70 Q56 74 58 70 M48 80 Q50 84 52 80', '#A1887F', 2.5)
            + circle(34, 44, 15, '#fff', '#6D4C41') + circle(66, 44, 15, '#fff', '#6D4C41')
            + circle(34, 44, 7, DARK) + circle(66, 44, 7, DARK)
            + circle(36, 41, 2.2, '#fff') + circle(68, 41, 2.2, '#fff')
            + shape('M44 54 L56 54 L50 66 Z', '#FF9F43', '#E65100', 2.5)
            + ellipse(38, 94, 9, 4, '#FF9F43', None) + ellipse(62, 94, 9, 4, '#FF9F43', None))


def toucan():
    return (S('M10 92 H92', '#8D5A2B', 6)
            + shape('M30 62 L18 92 L36 90 Z', '#263238', '#263238', 3)
            + ellipse(38, 60, 22, 30, '#263238', None)
            + ellipse(36, 52, 12, 13, '#FFF176', None)
            + circle(44, 28, 16, '#263238', None)
            + shape('M54 20 Q90 10 99 34 Q80 44 54 36 Z', '#FF9F43', '#E65100', 3)
            + shape('M80 18 Q96 20 99 34 Q92 38 84 38 Z', '#E53935', None, 0)
            + circle(46, 26, 5, '#fff') + circle(47, 26, 2.4, DARK)
            + S('M40 90 V94 M50 90 V94', '#FF9F43', 4))


def shirt():
    return (shape('M30 12 L8 30 L22 46 L30 40 V90 H70 V40 L78 46 L92 30 L70 12 Q50 28 30 12 Z', '#54A0FF', '#2F6FBF')
            + S('M30 12 Q50 28 70 12', '#2F6FBF', 3.5)
            + S('M50 28 V50', '#2F6FBF', 3) + circle(50, 36, 2.4, '#fff') + circle(50, 46, 2.4, '#fff')
            + S('M30 40 V90 M70 40 V90', '#2F6FBF', 3.5, ' opacity="0.0"'))


def potato():
    return (shape('M16 56 Q8 34 32 22 Q54 12 76 24 Q96 36 88 60 Q80 84 52 86 Q24 90 16 56 Z', '#C69C6D', '#8B6A3E')
            + circle(34, 44, 3.4, '#8B6A3E') + circle(58, 36, 3.4, '#8B6A3E') + circle(66, 60, 3.4, '#8B6A3E')
            + circle(40, 66, 3.4, '#8B6A3E') + circle(24, 58, 2.6, '#8B6A3E')
            + ellipse(30, 32, 7, 4, '#fff', None, 0, ' opacity="0.35" transform="rotate(-20 30 32)"'))


def doll():
    return (circle(26, 52, 14, '#8D5A2B', '#5D3A1A') + circle(74, 52, 14, '#8D5A2B', '#5D3A1A')
            + shape('M14 44 L26 52 L14 60 Z', '#E53935', '#B71C1C', 2.5) + shape('M86 44 L74 52 L86 60 Z', '#E53935', '#B71C1C', 2.5)
            + circle(50, 46, 28, '#F2C39A', '#B9855A')
            + shape('M22 44 Q24 16 50 16 Q76 16 78 44 Q64 30 50 32 Q36 30 22 44 Z', '#8D5A2B', '#5D3A1A')
            + eyes(50, 50, 11, 3.6) + circle(36, 60, 5, '#FF9AA2') + circle(64, 60, 5, '#FF9AA2')
            + S('M42 62 Q50 70 58 62', DARK, 3)
            + shape('M30 74 L70 74 L82 96 L18 96 Z', '#FF6B9A', '#C2185B'))


def camel():
    return (shape('M20 50 Q18 36 30 34 Q38 20 48 34 Q58 20 68 34 Q82 34 80 52 Q80 62 72 64 H28 Q20 62 20 50 Z', '#D9A55B', '#A97A2E')
            + shape('M72 44 Q84 36 86 22 Q86 14 94 14 Q100 16 98 24 Q92 24 92 30 Q90 46 78 60 Z', '#D9A55B', '#A97A2E')
            + circle(92, 20, 2.2, DARK)
            + S('M30 64 V90 M42 64 V90 M60 64 V90 M72 64 V90', '#A97A2E', 6)
            + S('M20 50 Q10 54 10 66', '#A97A2E', 4)
            + rect(0, 90, 100, 6, '#F2D49B', None, 3))


def cat():
    """O gato: a cabeça da Mia, em cinza e sem o laço, para não ser confundido com a mascote"""
    from mia import head
    return head('happy').replace('#F4A261', '#9FA8B3').replace('#DD8A3E', '#7B8794')


# Quadro (viewBox) dos desenhos que não são 100x100
VIEWBOX = {'gato': '30 4 140 140'}

WORDS = {
    'bola': soccer_ball, 'casa': house, 'gato': cat, 'pato': duck, 'sapo': frog, 'vaca': cow,
    'mesa': table, 'mala': suitcase, 'bota': boot, 'pipa': kite, 'boca': mouth, 'copo': cup,
    'bolo': cake, 'rato': mouse, 'sino': bell, 'dado': die, 'cama': bed, 'lata': can,
    'vela': candle, 'banana': banana, 'janela': window, 'tomate': tomato, 'sapato': shoe,
    'panela': pot, 'macaco': monkey, 'coruja': owl, 'tucano': toucan,
    'camisa': shirt, 'batata': potato, 'boneca': doll, 'camelo': camel,
}
