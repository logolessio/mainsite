# 17.logoless.io's own icons and share picture, in public/17: the mark (the number on a red film frame, as components/seventeen/mark.tsx draws it)
# at every size, the web manifest, and og.png (a tilted wall of the catalogue's posters with the title over it).
#   python3 scripts/make-seventeen-icons.py <SchibstedGrotesk[wght].ttf> <IBMPlexMono-Medium.ttf>
# The two fonts are Google Fonts' own files (github.com/google/fonts, ofl/schibstedgrotesk and ofl/ibmplexmono). The posters come from
# lib/seventeen/titles.json, so run scripts/seventeen-omdb.mjs first.
import io, json, os, sys, urllib.request
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'public', '17')
os.makedirs(OUT, exist_ok=True)
SCHIBSTED, MONO = sys.argv[1], sys.argv[2]
RED = (255, 31, 56)
HOLES = [8, 13.33, 18.67, 24]


def black(size):
    f = ImageFont.truetype(SCHIBSTED, size)
    f.set_variation_by_name('Black')
    return f


def mark(px, corner=True):
    """The mark at px square, drawn at 4x and scaled down for clean edges."""
    s = px * 4 / 32
    im = Image.new('RGBA', (px * 4, px * 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, px * 4 - 1, px * 4 - 1], radius=8.5 * s if corner else 0, fill=RED)
    if px >= 48:
        for x in HOLES:
            for y in (3.2, 26.6):
                d.rounded_rectangle([(x - 1.1) * s, y * s, (x + 1.1) * s, (y + 2.2) * s], radius=0.5 * s, fill=(150, 18, 33))
    f = black(int(16 * s))
    d.text((15.6 * s, 16.9 * s), '17', font=f, fill='white', anchor='mm')
    return im.resize((px, px), Image.LANCZOS)


for px, name in [(32, 'icon-32.png'), (192, 'icon-192.png'), (512, 'icon-512.png')]:
    mark(px).save(os.path.join(OUT, name))
# the home screen rounds its own corners, so the apple icon is square
mark(180, corner=False).save(os.path.join(OUT, 'apple-icon.png'))

with open(os.path.join(OUT, 'icon.svg'), 'w') as fh:
    holes = ''.join(f'<rect x="{x - 1.1:.2f}" y="{y}" width="2.2" height="2.2" rx=".5"/>' for x in HOLES for y in (3.2, 26.6))
    fh.write(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8.5" fill="#ff1f38"/>'
        f'<g fill="#000" fill-opacity=".38">{holes}</g>'
        '<text x="15.6" y="22.6" text-anchor="middle" fill="#fff" font-family="Schibsted Grotesk, Arial Black, Helvetica, sans-serif" font-size="16" font-weight="900" letter-spacing="-1.1">17</text></svg>\n'
    )

with open(os.path.join(OUT, 'manifest.webmanifest'), 'w') as fh:
    json.dump({
        'name': '17 | Free 4K scenepacks', 'short_name': '17', 'start_url': '/', 'display': 'standalone',
        'background_color': '#000000', 'theme_color': '#000000',
        'icons': [{'src': '/17/icon-192.png', 'sizes': '192x192', 'type': 'image/png'}, {'src': '/17/icon-512.png', 'sizes': '512x512', 'type': 'image/png'}],
    }, fh, indent=1)

# the share picture
W, H = 1200, 630
titles = json.load(open(os.path.join(ROOT, 'lib', 'seventeen', 'titles.json')))
posters = []
for t in titles[:42]:
    if not t.get('poster'):
        continue
    req = urllib.request.Request(t['poster'] + 'QL75_UX200_.jpg', headers={'User-Agent': 'Mozilla/5.0'})
    posters.append(Image.open(io.BytesIO(urllib.request.urlopen(req).read())).convert('RGB').resize((150, 222)))

wall = Image.new('RGB', (2000, 1500), 'black')
i = 0
for c in range(12):
    for r in range(7):
        wall.paste(posters[i % len(posters)], (c * 166, r * 238 - (c % 2) * 110))
        i += 1
wall = wall.rotate(-9, resample=Image.BICUBIC).crop((400, 380, 400 + W, 380 + H))
img = Image.blend(Image.new('RGB', (W, H), 'black'), wall, 0.42)
# darker in the middle-left, where the words go
shade = Image.new('L', (W, H), 0)
ImageDraw.Draw(shade).ellipse([-300, -150, 900, 800], fill=235)
shade = shade.filter(ImageFilter.GaussianBlur(120))
img = Image.composite(Image.new('RGB', (W, H), 'black'), img, shade)
glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(glow).ellipse([60, 140, 760, 520], fill=(255, 31, 56, 40))
img.paste(glow.filter(ImageFilter.GaussianBlur(90)), (0, 0), glow.filter(ImageFilter.GaussianBlur(90)))

d = ImageDraw.Draw(img)
m = mark(72)
img.paste(m, (72, 72), m)
mono = ImageFont.truetype(MONO, 20)
d.text((164, 108), 'SCENEPACKS', font=mono, fill=(255, 255, 255, 150), anchor='lm')
big = black(118)
d.text((66, 250), 'EVERY SCENE.', font=big, fill='white')
w = d.textlength('IN 4K. ', font=big)
d.text((66, 360), 'IN 4K.', font=big, fill=RED)
d.text((66 + w, 360), 'FREE.', font=big, fill='white')
d.text((72, 528), f'{len(titles)} FILMS, SERIES AND ANIME  ·  NO WATERMARKS', font=mono, fill=(170, 170, 170))
img.save(os.path.join(OUT, 'og.png'), optimize=True)
print('public/17:', sorted(os.listdir(OUT)))
