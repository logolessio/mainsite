"""Draws public/email/glow.jpg: the soft coloured light behind the top of every logoless email (see lib/email-templates.ts).

The glows are the ones the site's own background uses (red, blue, teal, amber, pink, added together over deep navy), with fine film grain, faded to
pure black at the bottom and at both sides so it joins the black page of the email without a seam. Needs Pillow only:  python3 scripts/make-email-glow.py
"""
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter
import os

W, H = 1200, 700  # shown at 600 wide, so it stays sharp on phones
S = 4  # the glows are soft, so they are drawn small and scaled up
w, h = W // S, H // S


def glow(cx, cy, rx, ry, rgb, a):
    layer = Image.new('L', (w, h), 0)
    ImageDraw.Draw(layer).ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=int(255 * a))
    return layer.filter(ImageFilter.GaussianBlur(min(rx, ry) * 0.55)), rgb


canvas = Image.new('RGB', (w, h), (2, 16, 26))
for mask, rgb in [
    glow(w * 0.14, h * 0.20, w * 0.32, h * 0.34, (255, 31, 56), 0.95),  # red
    glow(w * 0.86, h * 0.16, w * 0.32, h * 0.32, (75, 169, 220), 0.80),  # blue
    glow(w * 0.52, h * 0.38, w * 0.32, h * 0.24, (46, 208, 176), 0.45),  # teal
    glow(w * 0.80, h * 0.50, w * 0.18, h * 0.16, (255, 200, 87), 0.30),  # amber
    glow(w * 0.28, h * 0.46, w * 0.22, h * 0.16, (255, 45, 150), 0.30),  # pink
]:
    lit = Image.composite(Image.new('RGB', (w, h), rgb), Image.new('RGB', (w, h), (0, 0, 0)), mask)
    canvas = ImageChops.add(canvas, lit)  # added, like the site's 'lighter' glows

img = canvas.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(6))
img = ImageEnhance.Brightness(img).enhance(0.8)

# black at the bottom and at both sides (smoothstep)
def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)

mask = Image.new('L', (W, H))
px = mask.load()
edge = int(W * 0.20)
for y in range(H):
    vy = 1.0 if y < H * 0.40 else 1 - smooth((y - H * 0.40) / (H * 0.60))
    for x in range(W):
        px[x, y] = int(255 * vy * smooth(min(x, W - 1 - x) / edge))
img = Image.composite(img, Image.new('RGB', (W, H), (0, 0, 0)), mask)

# film grain on top, after the fade, so it is the same everywhere
noise = Image.effect_noise((W, H), 24).convert('RGB')
img = ImageChops.add(img, noise.point(lambda v: max(0, v - 128) // 3))

out = os.path.join(os.path.dirname(__file__), '..', 'public', 'email', 'glow.jpg')
os.makedirs(os.path.dirname(out), exist_ok=True)
img.save(out, 'JPEG', quality=62, optimize=True, progressive=True)
print(os.path.getsize(out) // 1024, 'KB')
