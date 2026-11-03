"""Móveis do "Quarto da Mia" (quadro de 100x100, só formas e traços, sem <text>).

Cada função devolve o conteúdo de um <svg>. O nome da chave é o id do móvel (o mesmo de
lib/modules/furniture.dart): assets/games/mia-room/img/<id>.svg. Os que ficam no chão levam uma
sombrinha embaixo; os que ficam na parede (quadro, relógio) não.
"""
import math

from words_art import DARK, S, circle, ellipse, rect, shape

WOOD = '#D9964F'
WOOD_DARK = '#8A5A2B'
WOOD_LIGHT = '#F0B974'


def shadow(rx=38, cy=92):
    return f'<ellipse cx="50" cy="{cy}" rx="{rx}" ry="5" fill="#000" opacity=".13"/>'


def bed():
    return (shadow(42)
            + rect(8, 26, 14, 58, WOOD, WOOD_DARK, 5)                     # cabeceira
            + rect(78, 46, 12, 38, WOOD, WOOD_DARK, 5)                    # pé da cama
            + rect(16, 52, 66, 24, '#FFFFFF', '#B0BEC5', 8)               # colchão
            + rect(32, 46, 52, 30, '#FF9FB6', '#D6527A', 8)               # cobertor
            + S('M44 48 V74 M58 48 V74 M72 48 V74', '#FFD1DC', 3)         # listras
            + ellipse(27, 50, 12, 8, '#FFFFFF', '#B0BEC5', 3)             # travesseiro
            + rect(10, 82, 8, 8, WOOD_DARK, None, 2) + rect(80, 82, 8, 8, WOOD_DARK, None, 2))


def rug():
    return (ellipse(50, 56, 46, 26, '#8FD3FE', '#3F8FC7', 4)
            + ellipse(50, 56, 33, 17, '#FFE08A', '#E0A800', 3, ' stroke-dasharray="7 5"')
            + circle(50, 56, 8, '#FF9FB6', '#D6527A', 3)
            + circle(32, 56, 3.5, '#FFFFFF') + circle(68, 56, 3.5, '#FFFFFF')
            + circle(50, 44, 3.5, '#FFFFFF') + circle(50, 68, 3.5, '#FFFFFF'))


def plant():
    leaves = ''.join(
        f'<ellipse cx="{cx}" cy="{cy}" rx="8" ry="19" fill="{fill}" stroke="#2E7D32" stroke-width="3" '
        f'transform="rotate({rot} {cx} {cy})"/>'
        for cx, cy, rot, fill in ((50, 36, 0, '#66D17A'), (34, 42, -35, '#4CC26A'), (66, 42, 35, '#4CC26A')))
    return (shadow(26)
            + leaves
            + shape('M30 58 H70 L64 90 H36 Z', '#E8825A', '#B5552E')      # vaso
            + rect(27, 52, 46, 10, '#F0976F', '#B5552E', 4)
            + S('M40 70 Q50 76 60 70', '#B5552E', 3))


def table():
    return (shadow(40)
            + shape('M26 48 L20 88 H30 L36 54 Z', WOOD, WOOD_DARK, 3)     # pernas
            + shape('M74 48 L80 88 H70 L64 54 Z', WOOD, WOOD_DARK, 3)
            + rect(46, 50, 8, 36, WOOD, WOOD_DARK, 2, 3)
            + ellipse(50, 44, 40, 12, WOOD_LIGHT, WOOD_DARK, 4)           # tampo
            + ellipse(50, 41, 28, 6, '#FFD59A', None)
            # uma xícara em cima
            + rect(40, 24, 16, 14, '#FFFFFF', '#B0BEC5', 4, 3)
            + S('M56 28 Q63 30 56 35', '#B0BEC5', 3)
            + ellipse(48, 25, 8, 2.5, '#A1887F'))


def lamp():
    return (shadow(22)
            + ellipse(50, 50, 40, 40, '#FFF3B0', None, 0, ' opacity=".45"')   # brilho
            + shape('M32 22 H68 L78 52 H22 Z', '#FFD93B', '#E0A800')            # cúpula
            + S('M30 34 H70', '#FFF3B0', 3)
            + rect(46, 52, 8, 26, '#B0BEC5', '#78909C', 3, 3)                   # haste
            + ellipse(50, 84, 20, 7, '#78909C', '#546E7A', 3))


def chest():
    return (shadow(40)
            + rect(14, 46, 72, 40, '#4FA3D1', '#2E78A8', 8)                      # caixa
            + shape('M14 48 Q14 26 50 26 Q86 26 86 48 Z', '#64B5E6', '#2E78A8')  # tampa
            + rect(10, 48, 80, 8, '#FFC93C', '#D99A00', 3, 3)                    # faixa dourada
            + rect(43, 52, 14, 14, '#FFC93C', '#D99A00', 3, 3)                   # fecho
            + circle(50, 58, 2.6, DARK)
            + S('M26 66 L30 78 M74 66 L70 78', '#2E78A8', 3))


def frame():
    return (rect(12, 16, 76, 62, WOOD, WOOD_DARK, 6, 4)
            + rect(20, 24, 60, 46, '#BFE6FF', '#8A5A2B', 3, 2)
            + circle(66, 38, 8, '#FFD93B', '#E0A800', 3)                          # sol
            + shape('M20 70 L40 44 L56 62 L66 52 L80 70 Z', '#66D17A', '#2E7D32', 3)
            + S('M46 12 L50 6 L54 12', '#8A5A2B', 3))


def shelf():
    books = (rect(22, 20, 7, 20, '#FF6B6B', '#C14040', 2, 2.5) + rect(30, 24, 7, 16, '#4FA3D1', '#2E78A8', 2, 2.5)
             + rect(38, 18, 7, 22, '#FFC93C', '#D99A00', 2, 2.5)
             + rect(58, 30, 8, 10, '#A78BFA', '#7C5CD6', 2, 2.5))
    return (shadow(34)
            + rect(14, 10, 72, 80, WOOD, WOOD_DARK, 5, 4)
            + rect(20, 16, 60, 30, WOOD_LIGHT, WOOD_DARK, 2, 3)
            + rect(20, 52, 60, 30, WOOD_LIGHT, WOOD_DARK, 2, 3)
            + books
            + circle(70, 64, 9, '#FFB3C7', '#D6527A', 3)                         # um brinquedo na prateleira de baixo
            + rect(30, 66, 20, 14, '#8FD3FE', '#3F8FC7', 3, 3))


def chair():
    return (shadow(36)
            + rect(18, 20, 64, 46, '#A78BFA', '#7C5CD6', 18, 4)                  # encosto
            + rect(12, 46, 20, 34, '#B79DFB', '#7C5CD6', 9, 4)                   # braços
            + rect(68, 46, 20, 34, '#B79DFB', '#7C5CD6', 9, 4)
            + rect(26, 52, 48, 26, '#C3B1FD', '#7C5CD6', 8, 4)                   # assento
            + rect(20, 80, 8, 10, WOOD_DARK, None, 2) + rect(72, 80, 8, 10, WOOD_DARK, None, 2)
            + S('M38 32 V44 M50 30 V44 M62 32 V44', '#8F73E8', 3))


def yarn():
    return (shadow(26, 90)
            + circle(50, 54, 30, '#FF8FB1', '#D6527A', 4)
            + S('M24 46 Q50 34 76 50', '#FFC2D6', 3.5)
            + S('M22 58 Q50 44 78 62', '#FFC2D6', 3.5)
            + S('M30 74 Q52 60 72 76', '#FFC2D6', 3.5)
            + S('M72 80 Q86 92 70 90 Q56 96 40 88', '#FF8FB1', 4))               # a ponta solta


def bowl():
    return (shadow(30)
            + shape('M18 36 Q16 78 50 82 Q84 78 82 36 Z', '#BFE6FF', '#4FA3D1', 4)    # vidro com água
            + shape('M19 46 Q50 54 81 46 L82 36 H18 Z', '#E6F5FF', None, 0)           # topo sem água
            + ellipse(50, 36, 32, 7, '#E6F5FF', '#4FA3D1', 3.5)
            + ellipse(50, 80, 22, 4, '#F2D49B', None)                                  # areia
            + S('M30 78 Q26 66 32 58 M36 78 Q40 68 36 60', '#4CC26A', 4)               # algas
            # o peixinho
            + ellipse(58, 62, 11, 7, '#FF9F43', '#D6701C', 3)
            + shape('M69 62 L78 55 L78 69 Z', '#FF9F43', '#D6701C', 3)
            + circle(53, 60, 1.8, DARK)
            + circle(40, 48, 2.5, '#FFFFFF', '#4FA3D1', 1.5) + circle(44, 42, 1.8, '#FFFFFF', '#4FA3D1', 1.5))


def clock():
    marks = ''.join(
        f'<circle cx="{50 + 31 * math.cos(math.radians(a)):.1f}" cy="{50 + 31 * math.sin(math.radians(a)):.1f}" '
        f'r="2.6" fill="{DARK}"/>'
        for a in range(0, 360, 30))
    return (circle(50, 50, 40, '#FF6B6B', '#C14040', 4)
            + circle(50, 50, 33, '#FFFFFF', '#C14040', 2.5)
            + marks
            + S('M50 50 V30', DARK, 4.5)                                            # ponteiro das horas
            + S('M50 50 L64 58', DARK, 3.5)                                          # ponteiro dos minutos
            + circle(50, 50, 4, '#FFC93C', DARK, 2.5))


def tent():
    return (shadow(42)
            + shape('M50 8 L94 88 H6 Z', '#FF9F43', '#D6701C', 4)                    # lona
            + shape('M50 8 L66 88 H34 Z', '#FFC278', None, 0)
            + shape('M50 8 L24 88 H6 Z', '#FFB36B', None, 0)
            + shape('M50 38 L72 88 H28 Z', '#5D3A1A', '#3E2711', 3)                  # a entrada
            + shape('M50 38 L58 88 H42 Z', '#8D5A2B', None, 0)
            + S('M50 8 V0 M50 8 L58 2', '#8A5A2B', 3)                                # pontas dos mastros
            + circle(50, 22, 4, '#FFD93B', '#E0A800', 2.5))


FURNITURE = {
    'bed': bed, 'rug': rug, 'plant': plant, 'table': table, 'lamp': lamp, 'chest': chest, 'frame': frame,
    'shelf': shelf, 'chair': chair, 'yarn': yarn, 'bowl': bowl, 'clock': clock, 'tent': tent,
}
