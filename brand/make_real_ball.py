"""Make site/assets/ball.webp from a real photo of a printed pink ball.

Crops one ball out of brand/ball/real/box-of-12.jpg, takes the black printing off it, cuts it out
of the box and straw, and saves it square with a transparent background. The printing is filled
from the surrounding felt, with matching grain put back so the patch doesn't look smooth.
Needs Pillow and NumPy. Run from the repo root: python brand/make_real_ball.py [out.webp]
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC = "brand/ball/real/box-of-12.jpg"
OUT = sys.argv[1] if len(sys.argv) > 1 else "site/assets/ball.webp"
BOX = (320, 720, 560, 960)     # the ball in the third row, middle: front-on, both seams in view
SIZE = 900
rng = np.random.default_rng(7)

src = Image.open(SRC).convert("RGB").crop(BOX)
a = np.asarray(src).astype(np.float32)
R, G, B = a[..., 0], a[..., 1], a[..., 2]
hsv = np.asarray(src.convert("HSV")).astype(np.float32) / 255
H, W = R.shape

# 1. The ball: a slightly squat ellipse, read off the photo (the felt's fuzz overlaps the straw, so
#    a colour mask leaks; the outline is fitted by eye and checked on an overlay instead).
cx, cy, rx, ry = 121.0, 122.0, 103.0, 99.0
yy, xx = np.mgrid[0:H, 0:W]
d = np.hypot((xx - cx) / rx, (yy - cy) / ry)
solid = d < 0.955          # inset a little so no straw colour rides along the rim
r = (rx + ry) / 2

# 2. The printing: near-black ink with soft edges, grown a little to take in the anti-aliasing.
ink = (hsv[..., 2] < 0.62) & solid
ink = np.asarray(Image.fromarray((ink * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))) > 0
known = solid & ~ink

# 3. Fill the printing from its surroundings (diffusion), then put the felt's grain back.
fill = a.copy()
for c in range(3):
    ch = fill[..., c]
    ch[~known] = ch[known].mean()
    for _ in range(400):
        avg = (np.roll(ch, 1, 0) + np.roll(ch, -1, 0) + np.roll(ch, 1, 1) + np.roll(ch, -1, 1)) / 4
        ch[~known] = avg[~known]
smooth = np.stack([np.asarray(Image.fromarray(np.clip(fill[..., c], 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))) for c in range(3)], 2).astype(np.float32)
detail = (a - np.stack([np.asarray(Image.fromarray(np.clip(a[..., c], 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))) for c in range(3)], 2).astype(np.float32))
sigma = detail[known].std()
noise = np.asarray(Image.fromarray(((rng.standard_normal((H, W)) * 0.5 + 0.5).clip(0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))).astype(np.float32)
noise = (noise - noise.mean()) / noise.std() * sigma
patched = np.where(ink[..., None], smooth + noise[..., None], a)
patched = np.where(known[..., None] | ink[..., None], patched, a)

# 4. Alpha: the solid disc with a soft edge. The rim's colour is pushed outward a few pixels so
#    nothing orange survives, and loose fibres are drawn past the edge to bring the fuzz back.
alpha = np.clip((0.955 - d) / 0.035, 0, 1)
rim = np.clip((d - 0.80) / 0.155, 0, 1)[..., None]
inner = patched.copy()
ring = (d > 0.84) & (d < 0.90)
for _ in range(3):
    for c in range(3):
        ch = inner[..., c]
        ch[d >= 0.90] = np.where(ring.any(), ch[ring].mean(), ch[ring].mean())
patched = np.where(d[..., None] > 0.9, np.clip(patched * (1 - rim) + inner * rim, 0, 255), patched)

# 5. Square crop on the ball, enlarged with a little sharpening, then a halo of loose fibres.
half = r * 1.12
box = tuple(int(round(v)) for v in (cx - half, cy - half, cx + half, cy + half))
rgba = np.dstack([np.clip(patched, 0, 255), alpha * 255]).astype(np.uint8)
img = Image.fromarray(rgba, "RGBA").crop(box).resize((SIZE, SIZE), Image.LANCZOS)
rgb = img.convert("RGB").filter(ImageFilter.UnsharpMask(radius=2.2, percent=90, threshold=2))
scale = SIZE / (2 * half)
Rpx = r * scale
fibres = Image.new("RGBA", (SIZE * 2, SIZE * 2), (0, 0, 0, 0))
fd = ImageDraw.Draw(fibres)
pix = np.asarray(rgb)
for _ in range(1500):
    ang = rng.uniform(0, 2 * np.pi)
    e = np.array([np.cos(ang), np.sin(ang)])
    r0 = Rpx * rng.uniform(0.935, 0.975)
    x0, y0 = SIZE / 2 + e[0] * r0, SIZE / 2 + e[1] * r0
    dirn = ang + rng.normal(0, 0.55)
    ln = Rpx * rng.uniform(0.012, 0.05)
    x1, y1 = x0 + np.cos(dirn) * ln, y0 + np.sin(dirn) * ln
    ix, iy = int(SIZE / 2 + e[0] * Rpx * 0.9), int(SIZE / 2 + e[1] * Rpx * 0.9)
    col = tuple(int(v) for v in pix[iy, ix]) + (int(rng.uniform(70, 150)),)
    fd.line([(x0 * 2, y0 * 2), (x1 * 2, y1 * 2)], fill=col, width=int(rng.choice([1, 2, 2, 3])))
fibres = fibres.resize((SIZE, SIZE), Image.LANCZOS)
out = rgb.convert("RGBA")
out.putalpha(img.getchannel("A"))
out = Image.alpha_composite(out, fibres)
out.save(OUT, "WEBP", quality=90, alpha_quality=90, method=6)
print(f"{OUT}: {SIZE}px; ball radius {Rpx / SIZE:.4f} of width, centred; source ball is {int(2 * r)}px across")
