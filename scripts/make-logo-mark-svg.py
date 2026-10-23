# The still logo as a picture file: public/logo-mark.svg, the word and its two brackets filled with the gradient.
#   python3 scripts/make-logo-mark-svg.py
# It reads the shapes from lib/logo-wordmark.ts and the colours from lib/logo-gradient.ts, so those two stay the only places they are written down. Run it again
# after changing either (and `python3 scripts/make-logo-intro.py --recolor` for the animated logo).
#
# Why a file and not inline SVG: the gradient is defined inside the picture, so it can never be lost to something outside it (a hidden parent, an id that does
# not resolve in a browser, a page restyle). components/logo.tsx shows it with an <img>, like the animated version beside it.
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
read = lambda p: open(os.path.join(ROOT, p)).read()

word = read('lib/logo-wordmark.ts')
vx, vy, vw, vh = [float(n) for n in re.search(r"WORDMARK_VIEWBOX = '([^']+)'", word).group(1).split()]
letters = re.findall(r"\{ id: '[^']+', d: '([^']+)' \}", word)
bars = re.findall(r"\w+: \{ x: ([\d.]+), y: ([\d.]+), w: ([\d.]+), h: ([\d.]+) \}", word)
stops = re.findall(r"\[([\d.]+), '(#[0-9a-fA-F]{6})'\]", read('lib/logo-gradient.ts'))
assert letters and len(bars) == 4 and len(stops) >= 2, (len(letters), len(bars), len(stops))

num = lambda v: f'{float(v):g}'
svg = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{num(vx)} {num(vy)} {num(vw)} {num(vh)}" width="{num(vw)}" height="{num(vh)}">'
    f'<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="{num(vx)}" y1="0" x2="{num(vx + vw)}" y2="0">'
    + ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    + '</linearGradient></defs>'
    '<g fill="url(#g)" stroke="url(#g)" stroke-width="2" stroke-linejoin="round">'
    + ''.join(f'<path d="{d}"/>' for d in letters)
    + '</g><g fill="url(#g)">'
    + ''.join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}"/>' for x, y, w, h in bars)
    + '</g></svg>\n'
)
open(os.path.join(ROOT, 'public', 'logo-mark.svg'), 'w').write(svg)
print(f'public/logo-mark.svg written ({len(svg)} bytes, {len(letters)} letters, {len(stops)} colours)')
