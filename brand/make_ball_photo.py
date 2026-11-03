"""Recolour the cut-out yellow ball photo to the can's pink, for site/assets/ball.webp.

The image model draws yellow tennis balls far more faithfully than pink ones, so we
generate yellow and recolour here: felt takes a pink ramp by brightness, the seam stays white.
Sources and how they were made: brand/ball/README.txt.
Needs Pillow and NumPy. Run from the repo root: python brand/make_ball_photo.py
"""
import numpy as np
from PIL import Image

SRC = "brand/ball/ball-cutout-yellow.webp"
OUT = "site/assets/ball.webp"
SIZE = 900

src = Image.open(SRC).convert("RGBA")
rgba = np.asarray(src).astype(np.float32) / 255
rgb, alpha = rgba[..., :3], rgba[..., 3]
sat = np.asarray(src.convert("RGB").convert("HSV"))[..., 1].astype(np.float32) / 255
lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)

# Brightness across the felt, so the ramp spans the ball's own shadows and highlights.
body = (alpha > 0.9) & (sat > 0.3)
lo, hi = np.percentile(lum[body], [2, 99.5])
t = np.clip((lum - lo) / (hi - lo), 0, 1)

# Deep rose in shadow, the can's ball pink across the lit face, a soft blush highlight.
stops = np.array([0.0, 0.3, 0.6, 0.82, 1.0], np.float32)
cols = np.array([[128, 36, 74], [200, 96, 132], [234, 150, 176], [244, 176, 197], [250, 198, 213]], np.float32) / 255
pink = np.stack([np.interp(t, stops, cols[:, c]) for c in range(3)], 2)
# The white rubber seam keeps its own light, warmed a touch.
seam = np.stack([lum, lum * 0.97, lum * 0.97], 2) * 1.04
# Loose fibres past the outline are felt too, even where the grey backdrop washed out their colour.
felt = np.maximum(np.clip((sat - 0.14) / 0.2, 0, 1), np.clip((0.9 - alpha) / 0.3, 0, 1))[..., None]
out = np.clip(pink * felt + seam * (1 - felt), 0, 1)

# The ball's disc, from its left, right and top edges (the bottom is flattened where it met the floor).
solid = alpha > 0.95
ys, xs = np.nonzero(solid)
x0, x1 = np.percentile(xs, [0.1, 99.9])
r = (x1 - x0) / 2
cx, cy = (x0 + x1) / 2, np.percentile(ys, 0.1) + r

# Trim the loose fibres to a short, tidy halo just past the outline.
yy, xx = np.mgrid[0:alpha.shape[0], 0:alpha.shape[1]]
d = np.hypot(xx - cx, yy - cy) / r
alpha = alpha * np.clip((1.025 - d) / 0.03, 0, 1)

# Square crop centred on the disc; record its radius for ball.js.
half = r * 1.12
box = tuple(int(round(v)) for v in (cx - half, cy - half, cx + half, cy + half))
img = Image.fromarray((np.dstack([out, alpha]) * 255).astype(np.uint8), "RGBA").crop(box).resize((SIZE, SIZE), Image.LANCZOS)
img.save(OUT, "WEBP", quality=88, alpha_quality=90, method=6)
print(f"{OUT}: {SIZE}px; ball radius {r / (2 * half):.4f} of width, centred")

# Where the seams cross the middle row, for centring the print between them.
band = (felt[int(cy) - 30:int(cy) + 30, :, 0] < 0.3) & solid[int(cy) - 30:int(cy) + 30]
cols_in = np.nonzero(band.mean(0) > 0.5)[0]
left, right = cols_in[cols_in < cx], cols_in[cols_in > cx]
if len(left) and len(right):
    print(f"seams at {(left.mean() - cx) / r:+.3f}R and {(right.mean() - cx) / r:+.3f}R")
