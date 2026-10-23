# Builds the logoless wordmark from the owner's After Effects logo ("logoless 2 Comp 1.mp4": 1440x1080, 18 fps, 42 frames):
#   python3 scripts/make-logo-wordmark.py
# It writes
#   lib/logo-wordmark.ts            the letter outlines, the two corner brackets and the view box, as data for components/logo.tsx
#   components/logo.module.css      the animation, frame for frame (CSS keyframes whose easing is a linear() curve measured from the video)
#   logo/logoless-wordmark*.svg     the static logo (white, black) and the animated one, for anyone who needs the file
#
# What the video shows, measured from its frames: "logoless" in Arial Bold (111 px, with a 1 px outline all round, which is what the video's letters measure),
# in white, with two corner brackets, one at the top left and one at the bottom right. They are the two Ls of the name: the top one runs from the left of the
# first l over "logo", the bottom one under "less" up to the right of the last s. In the animation the two brackets grow towards each other while the letters
# drop in one by one, from above and from below, growing as they settle.
from __future__ import annotations

import math
import os

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
EM = 111.0          # font size in the video's pixels
OUTLINE = 1.0       # the letters are drawn with a 1 px outline all round
BASE = 570.0        # the baseline
FPS = 18

# the left edge of each letter's ink in the final frame (pixel columns), measured
LEFTS = [('l', 461), ('o', 500), ('g', 579), ('o', 658), ('l', 740), ('e', 778), ('s', 850), ('s', 923)]

# how each letter arrives: the first frame it is seen in, how far below (+) or above (-) its place it starts, how small it starts, and how fast it settles (per second)
MOTION = [
    dict(id='l1', frame=2, dy=-17, s0=0.78, k=12.0),
    dict(id='o1', frame=2, dy=39, s0=0.57, k=13.0),
    dict(id='g', frame=2, dy=-98, s0=0.19, k=10.8),
    dict(id='o2', frame=3, dy=58, s0=0.36, k=8.0),
    dict(id='l2', frame=4, dy=-63, s0=0.36, k=6.7),
    dict(id='e', frame=5, dy=66, s0=0.27, k=6.0),
    dict(id='s1', frame=7, dy=-61, s0=0.44, k=4.9),
    dict(id='s2', frame=8, dy=70, s0=0.24, k=4.2),
]

# the two brackets (stroke 4.1 px): top left, bottom right. x0/y0 to x1/y1 of the outer corner and the two arms
STROKE = 4.1
# each bracket is two bars: the long one across (it grows in the animation) and the short one up or down (it is there from the start)
BARS = {
    'tlh': dict(x=449.6, y=479.6, w=274.4, h=4.1),      # top bracket, across the top
    'tlv': dict(x=449.6, y=479.6, w=4.1, h=92.4),       # top bracket, down the left
    'brh': dict(x=716.0, y=577.7, w=272.75, h=4.1),     # bottom bracket, along the bottom
    'brv': dict(x=984.65, y=489.0, w=4.1, h=92.8),      # bottom bracket, up the right
}

# how long the long arm is at each frame (frame 2 to 42), in pixels of the top bracket; the bottom bracket grows the same way, from the right
ARM = {2: 32, 3: 56, 4: 75, 5: 91, 6: 105, 7: 117, 8: 128, 9: 138, 10: 148, 11: 156, 12: 164, 13: 171, 14: 178, 15: 185, 16: 191, 17: 197, 18: 202, 19: 207, 20: 212,
       21: 217, 22: 221, 23: 225, 24: 229, 25: 233, 26: 236, 27: 240, 28: 243, 29: 246, 30: 249, 31: 252, 32: 254, 33: 257, 34: 259, 35: 261, 36: 263, 37: 265,
       38: 267, 39: 269, 40: 271, 41: 272, 42: 274}
FINAL_ARM = 274.0
TOTAL = (42 - 1) / FPS + 0.02         # seconds from the first frame to the settled logo

VIEWBOX = (448.0, 478.0, 542.0, 117.0)


def f(v: float) -> str:
    return f'{v:.2f}'.rstrip('0').rstrip('.')


def letters():
    ft = TTFont(FONT)
    gs = ft.getGlyphSet(); cmap = ft.getBestCmap(); upm = ft['head'].unitsPerEm
    k = EM / upm
    out = []
    for (ch, left), m in zip(LEFTS, MOTION):
        g = gs[cmap[ord(ch)]]
        from fontTools.pens.boundsPen import BoundsPen
        bp = BoundsPen(gs); g.draw(bp)
        # the ink's left edge (outline included) sits 0.3 px inside the first pixel column that is lit
        pen_x = left + 0.3 + OUTLINE - bp.bounds[0] * k
        pen = SVGPathPen(gs, ntos=f)
        g.draw(TransformPen(pen, (k, 0, 0, -k, pen_x, BASE)))
        x0, y0, x1, y1 = pen_x + bp.bounds[0] * k, BASE - bp.bounds[3] * k, pen_x + bp.bounds[2] * k, BASE - bp.bounds[1] * k
        out.append(dict(m, ch=ch, d=pen.getCommands(), box=(x0 - OUTLINE, y0 - OUTLINE, x1 + OUTLINE, y1 + OUTLINE)))
    return out


def bar_rects(cls: bool = True) -> str:
    return ''.join(f'<rect class="{k}" x="{f(b["x"])}" y="{f(b["y"])}" width="{f(b["w"])}" height="{f(b["h"])}"/>' for k, b in BARS.items())


# ---- the animation, as CSS ----
def linear_curve(points):
    """CSS linear() easing from (position 0..1, value 0..1) points."""
    return 'linear(' + ', '.join(f'{f(v)} {f(p * 100)}%' if 0 < p < 1 else f(v) for p, v in points) + ')'


def decay_curve(k, dur, n=22):
    """1 - e^(-k t) over dur seconds, scaled so that it ends at exactly 1. Sampled more often at the start, where it moves fastest."""
    end = 1 - math.exp(-k * dur)
    pts = []
    for j in range(n + 1):
        p = (j / n) ** 2
        pts.append((p, (1 - math.exp(-k * dur * p)) / end))
    return pts


def arm_curve():
    """The long arm's growth, from the measured frames, as an easing from its first length (frame 2) to full length."""
    frames = sorted(ARM)
    t0 = (frames[0] - 1) / FPS
    span = (frames[-1] - 1) / FPS - t0
    pts = []
    lo, hi = ARM[frames[0]], FINAL_ARM
    for fr in frames:
        p = ((fr - 1) / FPS - t0) / span
        pts.append((p, (ARM[fr] - lo) / (hi - lo)))
    return pts, ARM[frames[0]] / FINAL_ARM


def css(lets):
    out = ['/* Generated by scripts/make-logo-wordmark.py from the frames of the owner\'s logo video. Do not edit by hand. */', '']
    out.append('.logo { display: block; overflow: visible; }')
    out.append('.letter { transform-box: fill-box; transform-origin: 50% 50%; }')
    out.append('.tlh, .tlv, .brh, .brv { transform-box: fill-box; }')
    out.append('.tlh { transform-origin: 0% 50%; }')
    out.append('.brh { transform-origin: 100% 50%; }')
    t_arm = (min(ARM) - 1) / FPS
    curve, p0 = arm_curve()
    a_pct = t_arm / TOTAL * 100
    for name in ('tlh', 'brh'):
        out.append(f'@keyframes arm-{name} {{ 0% {{ opacity: 0; transform: scaleX({f(p0)}); }} {f(a_pct)}% {{ opacity: 1; transform: scaleX({f(p0)}); animation-timing-function: {linear_curve([(p, v) for p, v in curve])}; }} 100% {{ opacity: 1; transform: scaleX(1); }} }}')
        out.append(f'.play .{name} {{ animation: arm-{name} {f(TOTAL)}s both; }}')
    out.append(f'@keyframes bar-in {{ 0% {{ opacity: 0; }} {f(a_pct)}% {{ opacity: 1; }} 100% {{ opacity: 1; }} }}')
    out.append(f'.play .tlv, .play .brv {{ animation: bar-in {f(TOTAL)}s both; }}')
    for m in lets:
        t0 = (m['frame'] - 1) / FPS
        dur = TOTAL - t0
        pct = t0 / TOTAL * 100
        init = f'translateY({f(m["dy"])}px) scale({f(m["s0"])})'
        out.append(f'@keyframes in-{m["id"]} {{ 0% {{ opacity: 0; transform: {init}; }} {f(pct)}% {{ opacity: 1; transform: {init}; animation-timing-function: {linear_curve(decay_curve(m["k"], dur))}; }} 100% {{ opacity: 1; transform: none; }} }}')
        out.append(f'.play .{m["id"]} {{ animation: in-{m["id"]} {f(TOTAL)}s both; }}')
    out.append('@media (prefers-reduced-motion: reduce) { .play .letter, .play .tlh, .play .tlv, .play .brh, .play .brv { animation: none; } }')
    return '\n'.join(out) + '\n'


def ts(lets):
    vb = ' '.join(f(v) for v in VIEWBOX)
    rows = ',\n'.join(f"  {{ id: '{m['id']}', d: '{m['d']}' }}" for m in lets)
    bars = ',\n'.join(f"  {k}: {{ x: {f(b['x'])}, y: {f(b['y'])}, w: {f(b['w'])}, h: {f(b['h'])} }}" for k, b in BARS.items())
    return (f"// Generated by scripts/make-logo-wordmark.py from the owner's logo video. Do not edit by hand.\n"
            f"export const WORDMARK_VIEWBOX = '{vb}'\n"
            f"export const WORDMARK_ASPECT = {f(VIEWBOX[2] / VIEWBOX[3])}\n"
            f"/** The letters of \"logoless\" (Arial Bold outlines; draw them filled with a 2 px stroke in the same colour). */\n"
            f"export const WORDMARK_LETTERS: {{ id: string; d: string }}[] = [\n{rows},\n]\n"
            f"/** The two corner brackets as bars: top left (tlh across, tlv down) and bottom right (brh along the bottom, brv up the right). */\n"
            f"export const WORDMARK_BARS = {{\n{bars},\n}}\n")


def svg(fill: str, animated: bool, lets) -> str:
    vb = ' '.join(f(v) for v in VIEWBOX)
    body = ''.join(f'<path class="letter {m["id"]}" d="{m["d"]}"/>' for m in lets)
    style = ''
    if animated:
        c = css(lets)
        c = '\n'.join(line.replace('.play ', 'svg.play ') for line in c.splitlines() if not line.startswith('/*'))
        style = f'<style>{c}</style>'
    cls = ' class="play"' if animated else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{f(VIEWBOX[2])}" height="{f(VIEWBOX[3])}"{cls} role="img" aria-label="logoless">'
            f'<title>logoless</title>{style}<g fill="{fill}" stroke="{fill}" stroke-width="{f(OUTLINE * 2)}" stroke-linejoin="round">{body}</g><g fill="{fill}">{bar_rects()}</g></svg>\n')


if __name__ == '__main__':
    lets = letters()
    open(os.path.join(ROOT, 'lib', 'logo-wordmark.ts'), 'w').write(ts(lets))
    open(os.path.join(ROOT, 'components', 'logo.module.css'), 'w').write(css(lets))
    os.makedirs(os.path.join(ROOT, 'logo'), exist_ok=True)
    w = lambda name, text: open(os.path.join(ROOT, 'logo', name), 'w').write(text)
    w('logoless-wordmark.svg', svg('#FFFFFF', False, lets))
    w('logoless-wordmark-black.svg', svg('#0A0A0B', False, lets))
    w('logoless-wordmark-animated.svg', svg('#FFFFFF', True, lets))
    print('written')
