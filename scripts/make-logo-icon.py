# The logoless app / favicon icon, from the owner's logo: its two corner brackets (the two Ls of the name) around the first l.
#   python3 scripts/make-logo-icon.py
# Writes logo/logoless-bracket-icon*.svg. Needs fontTools and Arial Bold (/System/Library/Fonts/Supplemental/Arial Bold.ttf).
from __future__ import annotations

import os

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
S = 1024
STROKE = 62
INSET = 138        # the outer corners of the two brackets sit this far from the edges
LONG, SHORT = 610, 372
L_HEIGHT = 330     # height of the l


def f(v: float) -> str:
    return f'{v:.2f}'.rstrip('0').rstrip('.')


def glyph_l() -> str:
    ft = TTFont(FONT); gs = ft.getGlyphSet(); cmap = ft.getBestCmap(); upm = ft['head'].unitsPerEm
    g = gs[cmap[ord('l')]]
    bp = BoundsPen(gs); g.draw(bp)
    k = L_HEIGHT / (bp.bounds[3] - bp.bounds[1])
    w = (bp.bounds[2] - bp.bounds[0]) * k
    pen = SVGPathPen(gs, ntos=f)
    # centre the l in the square
    g.draw(TransformPen(pen, (k, 0, 0, -k, S / 2 - w / 2 - bp.bounds[0] * k, S / 2 + L_HEIGHT / 2 + bp.bounds[1] * k)))
    return pen.getCommands()


def brackets() -> str:
    x0, y0 = INSET, INSET
    x1, y1 = S - INSET, S - INSET
    tl = f'M{f(x0)} {f(y0)}H{f(x0 + LONG)}V{f(y0 + STROKE)}H{f(x0 + STROKE)}V{f(y0 + SHORT)}H{f(x0)}Z'
    br = f'M{f(x1)} {f(y1)}H{f(x1 - LONG)}V{f(y1 - STROKE)}H{f(x1 - STROKE)}V{f(y1 - SHORT)}H{f(x1)}Z'
    return tl + br


def icon(tile: str | None, ink: str) -> str:
    bg = f'<rect width="{S}" height="{S}" fill="{tile}"/>' if tile else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" width="{S}" height="{S}" role="img" aria-label="logoless"><title>logoless</title>{bg}'
            f'<path fill="{ink}" d="{brackets()}"/><path fill="{ink}" stroke="{ink}" stroke-width="14" stroke-linejoin="round" d="{glyph_l()}"/></svg>\n')


if __name__ == '__main__':
    out = os.path.join(ROOT, 'logo')
    w = lambda name, text: open(os.path.join(out, name), 'w').write(text)
    w('logoless-bracket-icon.svg', icon('#000000', '#FFFFFF'))           # black square, white brackets: app icons and the favicon
    w('logoless-bracket-icon-light.svg', icon('#FFFFFF', '#0A0A0B'))     # white square, dark brackets
    w('logoless-bracket-icon-white.svg', icon(None, '#FFFFFF'))          # no background, white
    w('logoless-bracket-icon-black.svg', icon(None, '#0A0A0B'))          # no background, dark
    print('written')
