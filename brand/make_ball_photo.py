"""Make the ball photos for the site from the Gemini sources in brand/ball/.

site/assets/ball.webp: the sample word taken off the pink ball photo, cut out of its grey backdrop.

The source is a pink ball on light grey with "Pinkaholic" printed across the panel between its
seams (brand/ball/README.txt says how it was made). The word is replaced with felt cloned from
just above it, brightness-matched, so the real fibre texture carries through. Felt is clearly pink
and the backdrop and its shadow near-grey, so saturation separates them.

The printed sample photos in SAMPLES are cut out the same way and kept as they are.
Needs Pillow and NumPy. Run from the repo root: python brand/make_ball_photo.py
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC = "brand/ball/ball-source-gemini-printed.jpg"
WORD = (200, 455, 825, 585)   # box around the printed word (left, top, right, bottom)
CLONE_UP = 120                # take felt from this many pixels above
OUT = "site/assets/ball.webp"
SIZE = 900
# Printed sample photos shown as they are (same backdrop and framing), cut out the same way.
SAMPLES = {"brand/ball/sample-chloe-jack.jpg": "site/assets/sample-chloe-jack.webp"}



def blur(x, r):
    return np.stack([np.asarray(Image.fromarray(np.clip(x[..., c], 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)))
                     for c in range(3)], 2).astype(np.float32)


def remove_word(src):
    """Replace the printed word with felt cloned from above it, matched to the light."""
    a = np.asarray(src).astype(np.float32)
    lum0 = a @ np.array([0.299, 0.587, 0.114], np.float32)
    box = np.zeros(lum0.shape, bool)
    box[WORD[1]:WORD[3], WORD[0]:WORD[2]] = True
    # Near-black pixels in its box, grown over the anti-aliasing.
    hard = np.asarray(Image.fromarray((((lum0 < 100) & box) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 0
    mask = np.maximum(np.asarray(Image.fromarray((hard * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))) / 255, hard)
    # The felt's broad light under the word, by diffusing in from around it.
    fill = a.copy()
    for c in range(3):
        ch = fill[..., c]
        ch[hard] = ch[~hard].mean()
        for _ in range(600):
            ch[hard] = ((np.roll(ch, 1, 0) + np.roll(ch, -1, 0) + np.roll(ch, 1, 1) + np.roll(ch, -1, 1)) / 4)[hard]
    clone = np.clip(np.roll(a, CLONE_UP, 0) * blur(fill, 8) / np.maximum(np.roll(blur(a, 8), CLONE_UP, 0), 1), 0, 255)
    return Image.fromarray((a * (1 - mask[..., None]) + clone * mask[..., None]).astype(np.uint8))


def cut_out(src, out):
    """Cut the ball out of its grey backdrop and save it square, the ball centred at a fixed size."""
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
    # The disc, from the ball's left, right and top edges (the shadow sits below it).
    ys, xs = np.nonzero(inside)
    x0, x1 = np.percentile(xs, [0.1, 99.9])
    r = (x1 - x0) / 2
    cx, cy = (x0 + x1) / 2, np.percentile(ys, 0.1) + r
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.hypot(xx - cx, yy - cy) / r
    # Alpha: the disc is solid (the seams run out to the edge), the fuzz past it counts by how pink
    # it is, trimmed to a short halo.
    disc = np.clip((1.0 - d) / 0.006, 0, 1)
    alpha = np.maximum(disc, felt * (d < 1.04)) * np.clip((1.035 - d) / 0.03, 0, 1)
    # Square crop centred on the disc; ball.js needs the radius as a share of the width.
    half = r * 1.12
    box = tuple(int(round(v)) for v in (cx - half, cy - half, cx + half, cy + half))
    img = Image.fromarray((np.dstack([rgb, alpha]) * 255).astype(np.uint8), "RGBA").crop(box).resize((SIZE, SIZE), Image.LANCZOS)
    img.save(out, "WEBP", quality=90, alpha_quality=90, method=6)
    print(f"{out}: {SIZE}px; ball radius {r / (2 * half):.4f} of width, centred")
    return felt, lum, d, cx, cy, r


felt, lum, d, cx, cy, r = cut_out(remove_word(Image.open(SRC).convert("RGB")), OUT)

# Brightness of the lit felt (ball.js FELT_LUM): ink is shown at its true colour there.
face = (d < 0.5) & (felt > 0.9)
print(f"lit felt brightness {np.percentile(lum[face] * 255, 75):.0f}")

# Where the seams cross the middle column (they run across this ball), for the print's height.
band = (felt[:, int(cx) - 30:int(cx) + 30] < 0.3) & (d[:, int(cx) - 30:int(cx) + 30] < 0.98)
rows = np.nonzero(band.mean(1) > 0.5)[0]
top, bottom = rows[rows < cy], rows[rows > cy]
if len(top) and len(bottom):
    print(f"seams at {(top.mean() - cy) / r:+.3f}R and {(bottom.mean() - cy) / r:+.3f}R")

for path, out in SAMPLES.items():
    cut_out(Image.open(path).convert("RGB"), out)
