"""A gatinha Mia: desenho em SVG, só com formas e traços (sem <text>).

Quatro poses: happy (padrão), wave (acena), cheer (comemora) e think (pensa).
O desenho usa um quadro de 200x200; a cabeça e o laço ficam entre y=10 e y=150.
"""

ORANGE, ORANGE_D = '#F4A261', '#DD8A3E'
CREAM, PINK, DARK = '#FFF1DC', '#F7A8B8', '#2D3436'
NOSE, BOW = '#E76F7F', '#2F7BE0'


def stroke(d, color, width, extra=''):
    return (f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" '
            f'stroke-linecap="round" stroke-linejoin="round"{extra}/>')


def ears():
    out = ''
    for side in (-1, 1):
        def x(v):
            return 100 + side * (v - 100)
        outer = f'M{x(50)} 66 L{x(46)} 22 L{x(90)} 46 Z'
        inner = f'M{x(56)} 56 L{x(54)} 34 L{x(76)} 47 Z'
        out += f'<path d="{outer}" fill="{ORANGE}" stroke="{ORANGE}" stroke-width="10" stroke-linejoin="round"/>'
        out += f'<path d="{inner}" fill="{PINK}" stroke="{PINK}" stroke-width="5" stroke-linejoin="round"/>'
    return out


def eyes(pose):
    if pose == 'cheer':
        # olhos fechados, sorrindo: arcos para cima
        return (stroke('M66 90 Q78 76 90 90', DARK, 5) + stroke('M110 90 Q122 76 134 90', DARK, 5))
    dx, dy = (4, -4) if pose == 'think' else (0, 0)
    out = ''
    for cx in (78, 122):
        out += f'<ellipse cx="{cx + dx}" cy="{86 + dy}" rx="8" ry="10" fill="{DARK}"/>'
        out += f'<circle cx="{cx + dx + 2.5}" cy="{82 + dy}" r="3" fill="#fff"/>'
    if pose == 'think':
        out += stroke('M68 68 Q78 62 90 68', DARK, 3.5) + stroke('M112 64 Q124 58 134 66', DARK, 3.5)
    return out


def mouth(pose):
    if pose == 'cheer':   # boca aberta
        return (f'<path d="M88 108 Q100 126 112 108 Z" fill="{DARK}" stroke="{DARK}" '
                'stroke-width="3" stroke-linejoin="round"/>'
                f'<path d="M94 116 Q100 122 106 116 Q100 112 94 116 Z" fill="{NOSE}"/>')
    if pose == 'think':   # boquinha em "o"
        return f'<ellipse cx="100" cy="113" rx="5" ry="6" fill="{DARK}"/>'
    return stroke('M100 104 L100 108 M100 108 Q92 116 85 109 M100 108 Q108 116 115 109', DARK, 3.5)


def whiskers():
    out = ''
    for side in (-1, 1):
        def x(v):
            return 100 + side * (v - 100)
        out += stroke(f'M{x(68)} 101 L{x(42)} 96', DARK, 2.6, ' opacity="0.55"')
        out += stroke(f'M{x(68)} 108 L{x(44)} 112', DARK, 2.6, ' opacity="0.55"')
    return out


def face(pose):
    return (
        f'<ellipse cx="100" cy="106" rx="26" ry="19" fill="{CREAM}"/>'
        f'<circle cx="62" cy="104" r="8" fill="{PINK}" opacity="0.7"/>'
        f'<circle cx="138" cy="104" r="8" fill="{PINK}" opacity="0.7"/>'
        + eyes(pose) +
        f'<path d="M93 97 Q100 93 107 97 Q100 106 93 97 Z" fill="{NOSE}" stroke="{NOSE}" '
        'stroke-width="2" stroke-linejoin="round"/>'
        + mouth(pose) + whiskers()
    )


def head(pose):
    stripes = ''.join(stroke(f'M{x} {y0} L{x} {y1}', ORANGE_D, 4.5)
                      for x, y0, y1 in ((90, 46, 58), (100, 44, 58), (110, 46, 58)))
    return ears() + f'<ellipse cx="100" cy="90" rx="58" ry="50" fill="{ORANGE}"/>' + stripes + face(pose)


def bow():
    return (
        f'<path d="M100 142 L74 128 Q70 142 74 156 Z" fill="{BOW}" stroke="{BOW}" stroke-width="5" stroke-linejoin="round"/>'
        f'<path d="M100 142 L126 128 Q130 142 126 156 Z" fill="{BOW}" stroke="{BOW}" stroke-width="5" stroke-linejoin="round"/>'
        f'<circle cx="100" cy="142" r="8" fill="#1F5FB8"/>'
    )


def body(pose):
    arm = lambda d: stroke(d, ORANGE, 20)
    paw = lambda cx, cy: f'<circle cx="{cx}" cy="{cy}" r="11" fill="{ORANGE}"/>'
    if pose == 'wave':   # a pata direita sobe: o rabo vai para a esquerda
        out = stroke('M62 176 Q14 170 24 124', ORANGE, 15) + stroke('M24 128 Q25 124 26 120', CREAM, 15)
    else:
        out = stroke('M138 176 Q186 170 176 124', ORANGE, 15) + stroke('M176 128 Q175 124 174 120', CREAM, 15)
    out += f'<ellipse cx="100" cy="164" rx="44" ry="34" fill="{ORANGE}"/>'
    out += f'<ellipse cx="100" cy="170" rx="24" ry="22" fill="{CREAM}"/>'
    out += f'<ellipse cx="78" cy="190" rx="17" ry="8" fill="{ORANGE}"/><ellipse cx="122" cy="190" rx="17" ry="8" fill="{ORANGE}"/>'
    if pose == 'wave':
        out += arm('M62 160 L56 182') + arm('M140 158 L168 120') + paw(170, 114)
    elif pose == 'cheer':
        out += arm('M62 158 L40 118') + paw(39, 114) + arm('M138 158 L160 118') + paw(161, 114)
    else:
        out += arm('M62 160 L56 182') + arm('M138 160 L144 182')
    return out


def full(pose):
    # corpo atrás, cabeça na frente, laço na junção
    return body(pose) + head(pose) + bow()


def _svg(inner, viewbox='0 0 200 200'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}">{inner}</svg>\n'


POSES = {p: _svg(full(p)) for p in ('happy', 'wave', 'cheer', 'think')}


def head_svg():
    """Só a cabeça e o laço (ícone do app), no quadro 200x200"""
    return _svg(head('happy') + bow())


def mono_svg():
    """Silhueta para o ícone temático do Android 13: só a transparência importa,
    então o rosto vira recorte (máscara) na silhueta branca"""
    silhouette = ears().replace(ORANGE, '#fff').replace(PINK, '#fff') + \
        '<ellipse cx="100" cy="90" rx="58" ry="50" fill="#fff"/>' + \
        bow().replace(BOW, '#fff').replace('#1F5FB8', '#fff')
    cutouts = (
        '<ellipse cx="78" cy="86" rx="8" ry="10"/><ellipse cx="122" cy="86" rx="8" ry="10"/>'
        '<path d="M93 97 Q100 93 107 97 Q100 106 93 97 Z"/>'
        '<path d="M100 104 L100 108 M100 108 Q92 116 85 109 M100 108 Q108 116 115 109" '
        'fill="none" stroke="#000" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
    )
    return _svg(
        '<defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">'
        '<rect width="200" height="200" fill="#fff"/>'
        f'<g fill="#000">{cutouts}</g></mask></defs>'
        f'<g mask="url(#m)">{silhouette}</g>'
    )


# ── Guarda-roupa: acessórios que a Mia veste ────────────────────────────────────
# Cada um é uma camada transparente no mesmo quadro de 200x200 da Mia. A cabeça e o laço ficam no mesmo
# lugar em todas as poses, então a camada serve em qualquer uma. Três espaços: 'hat' (cabeça), 'face'
# (rosto) e 'neck' (pescoço); um item por espaço.
def _party():
    return ('<g transform="rotate(10 100 50)">'
            f'<path d="M78 52 L122 52 L100 2 Z" fill="#FF6B9A" stroke="#C2185B" stroke-width="3" stroke-linejoin="round"/>'
            + stroke('M84 42 L116 42 M90 28 L110 28', '#FFE66D', 5)
            + f'<circle cx="100" cy="5" r="7" fill="#FFE66D" stroke="#D99A00" stroke-width="2.5"/>'
            + '</g>')


def _crown():
    return ('<path d="M70 50 L70 20 L86 34 L100 12 L114 34 L130 20 L130 50 Z" fill="#FFC93C" stroke="#D99A00" '
            'stroke-width="3.5" stroke-linejoin="round"/>'
            '<rect x="70" y="44" width="60" height="12" rx="3" fill="#FFC93C" stroke="#D99A00" stroke-width="3.5"/>'
            '<circle cx="86" cy="50" r="3.6" fill="#E53935"/><circle cx="100" cy="50" r="3.6" fill="#2F7BE0"/>'
            '<circle cx="114" cy="50" r="3.6" fill="#E53935"/>')


def _pirate():
    return ('<path d="M44 50 Q100 24 156 50 Q100 44 44 50 Z" fill="#2D3436" stroke="#1B2022" stroke-width="3" stroke-linejoin="round"/>'
            '<path d="M66 48 Q70 8 100 8 Q130 8 134 48 Z" fill="#2D3436" stroke="#1B2022" stroke-width="3" stroke-linejoin="round"/>'
            '<path d="M70 44 Q100 54 130 44" fill="none" stroke="#E53935" stroke-width="6" stroke-linecap="round"/>'
            '<circle cx="100" cy="26" r="7" fill="#fff"/><circle cx="97" cy="25" r="1.8" fill="#2D3436"/>'
            '<circle cx="103" cy="25" r="1.8" fill="#2D3436"/>'
            + stroke('M90 38 L110 32 M90 32 L110 38', '#fff', 2.5))


def _flower():
    import math
    petals = ''.join(
        f'<circle cx="{138 + 9 * math.cos(math.radians(a)):.1f}" cy="{50 + 9 * math.sin(math.radians(a)):.1f}" r="8" '
        'fill="#FF9FF3" stroke="#D63FC3" stroke-width="2.5"/>' for a in (-90, -18, 54, 126, 198))
    return petals + '<circle cx="138" cy="50" r="6.5" fill="#FFE66D" stroke="#F5A700" stroke-width="2.5"/>'


def _tiara():
    return (stroke('M60 58 Q100 26 140 58', '#FFC93C', 7)
            + stroke('M60 58 Q100 26 140 58', '#D99A00', 2, ' opacity="0.6"')
            + '<path d="M100 14 L104 26 L117 26 L107 33 L111 45 L100 38 L89 45 L93 33 L83 26 L96 26 Z" fill="#FFE66D" '
              'stroke="#D99A00" stroke-width="2.5" stroke-linejoin="round" transform="translate(0 4)"/>')


def _glasses():
    return ('<circle cx="78" cy="86" r="17" fill="#B3E5FC" fill-opacity="0.35" stroke="#2D3436" stroke-width="4"/>'
            '<circle cx="122" cy="86" r="17" fill="#B3E5FC" fill-opacity="0.35" stroke="#2D3436" stroke-width="4"/>'
            + stroke('M95 84 Q100 78 105 84', '#2D3436', 4)
            + stroke('M61 82 L50 78 M139 82 L150 78', '#2D3436', 4))


def _sunglasses():
    lens = lambda x: (f'<path d="M{x} 74 H{x + 36} V92 Q{x + 36} 104 {x + 24} 104 H{x + 12} Q{x} 104 {x} 92 Z" '
                      'fill="#2D3436" stroke="#1B2022" stroke-width="3" stroke-linejoin="round"/>'
                      + stroke(f'M{x + 8} 80 L{x + 16} 80', '#fff', 3, ' opacity="0.7"'))
    return lens(60) + lens(104) + stroke('M96 80 Q100 76 104 80', '#2D3436', 4) + stroke('M60 78 L50 74 M140 78 L150 74', '#2D3436', 4)


def _scarf():
    return ('<path d="M62 130 Q100 150 138 130 L142 148 Q100 168 58 148 Z" fill="#E53935" stroke="#B71C1C" '
            'stroke-width="3.5" stroke-linejoin="round"/>'
            '<path d="M120 152 L136 190 L116 186 L108 158 Z" fill="#E53935" stroke="#B71C1C" stroke-width="3.5" stroke-linejoin="round"/>'
            + stroke('M72 140 L74 152 M88 146 L90 158 M122 166 L126 176', '#fff', 3.5, ' opacity="0.85"'))


def _medal():
    return ('<path d="M84 142 L100 172 L116 142" fill="none" stroke="#E53935" stroke-width="9" stroke-linejoin="round"/>'
            '<path d="M91 142 L100 160 L109 142" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>'
            '<circle cx="100" cy="178" r="15" fill="#FFC93C" stroke="#D99A00" stroke-width="3.5"/>'
            '<path d="M100 169 L103 176 L110 177 L105 182 L106 189 L100 185 L94 189 L95 182 L90 177 L97 176 Z" fill="#fff" '
            'stroke="#D99A00" stroke-width="1.5" stroke-linejoin="round"/>')


# id → (espaço, desenho)
OUTFITS = {
    'flower':     ('hat',  _flower),
    'party':      ('hat',  _party),
    'glasses':    ('face', _glasses),
    'tiara':      ('hat',  _tiara),
    'scarf':      ('neck', _scarf),
    'crown':      ('hat',  _crown),
    'sunglasses': ('face', _sunglasses),
    'medal':      ('neck', _medal),
    'pirate':     ('hat',  _pirate),
}


def outfit_svg(outfit_id):
    return _svg(OUTFITS[outfit_id][1]())


def dressed_svg(pose, outfit_ids):
    """A Mia numa pose, vestida com os itens dados (só para conferir o desenho)"""
    return _svg(full(pose) + ''.join(OUTFITS[i][1]() for i in outfit_ids))
