"""Cut the pink ball out of its plain grey backdrop, for site/assets/ball.webp.

The source is a blank pink ball on light grey (brand/ball/README.txt says how it was made).
Felt is clearly pink and the backdrop and its shadow are near-grey, so saturation separates them;
the white seams are taken back in by filling the ball's outline.
Needs Pillow and NumPy. Run from the repo root: python brand/make_ball_photo.py
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC = "brand/ball/ball-source-gemini.webp"
OUT = "site/assets/ball.webp"
SIZE = 900

src = Image.open(SRC).convert("RGB")
rgb = np.asarray(src).astype(np.float32) / 255
sat = np.asarray(src.convert("HSV"))[..., 1].astype(np.float32) / 255
lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
H, W = lum.shape

# Felt: pink enough to stand clear of the grey (about 0.03 saturation) and its shadow.
felt = np.clip((sat - 0.08) / 0.1, 0, 1)

# Rough outline of the ball, for finding its disc: the felt, closed over small gaps.
m = Image.fromarray(((felt > 0.6) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.MinFilter(15))
ImageDraw.floodfill(m, (0, 0), 128)
inside = np.asarray(m) != 128

# The disc, from the solid ball's left, right and top edges (the shadow sits below it).
ys, xs = np.nonzero(inside)
x0, x1 = np.percentile(xs, [0.1, 99.9])
r = (x1 - x0) / 2
cx, cy = (x0 + x1) / 2, np.percentile(ys, 0.1) + r
yy, xx = np.mgrid[0:H, 0:W]
d = np.hypot(xx - cx, yy - cy) / r

# Alpha: the disc itself is solid (the seams run out to the edge, so the fill above can't hold
# them), the fuzz past it counts by how pink it is, trimmed to a short halo.
disc = np.clip((1.0 - d) / 0.006, 0, 1)
alpha = np.maximum(disc, felt * (d < 1.04)) * np.clip((1.035 - d) / 0.03, 0, 1)

# Square crop centred on the disc; ball.js needs the radius as a share of the width.
half = r * 1.12
box = tuple(int(round(v)) for v in (cx - half, cy - half, cx + half, cy + half))
img = Image.fromarray((np.dstack([rgb, alpha]) * 255).astype(np.uint8), "RGBA").crop(box).resize((SIZE, SIZE), Image.LANCZOS)
img.save(OUT, "WEBP", quality=90, alpha_quality=90, method=6)
print(f"{OUT}: {SIZE}px; ball radius {r / (2 * half):.4f} of width, centred")

# Brightness of the lit felt (ball.js FELT_LUM): ink is shown at its true colour there.
face = (d < 0.5) & (felt > 0.9)
print(f"lit felt brightness {np.percentile(lum[face] * 255, 75):.0f}")

# Where the seams cross the middle row, for centring the print between them.
band = (felt[int(cy) - 30:int(cy) + 30] < 0.3) & (d[int(cy) - 30:int(cy) + 30] < 0.98)
cols = np.nonzero(band.mean(0) > 0.5)[0]
left, right = cols[cols < cx], cols[cols > cx]
if len(left) and len(right):
    print(f"seams at {(left.mean() - cx) / r:+.3f}R and {(right.mean() - cx) / r:+.3f}R")
