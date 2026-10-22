"""Pinkaholic rose wordmark and heart can stickers.

Imperial Script wordmark in a pink gradient, with a speckled stencil rose for the dot on the
last i, set inside a hand-drawn (irregular) heart with the web address. Everything is outlined,
so printers don't need the fonts.

Usage: python make_sticker.py <font_dir> <out_dir>
Needs `pip install fonttools`.
"""
import math
import os
import random
import sys

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import DecomposingRecordingPen, RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

FONT_DIR, OUT_DIR = sys.argv[1], sys.argv[2]
SCRIPT = TTFont(os.path.join(FONT_DIR, "ImperialScript-Regular.ttf"))
JOST = instancer.instantiateVariableFont(TTFont(os.path.join(FONT_DIR, "Jost%5Bwght%5D.ttf")), {"wght": 450})

PINK_DEEP, PINK = "#E2306F", "#F45C93"
ROSE = ["#9E1F4E", "#B8325E", "#C9416C", "#D9577F", "#E57B9B", "#F2A3BC", "#FBD3DF", "#FFF4F7"]


# ---------- text outlines ----------

def contours(gs, name):
    pen = DecomposingRecordingPen(gs)
    gs[name].draw(pen)
    out, cur = [], []
    for op, args in pen.value:
        cur.append((op, args))
        if op in ("closePath", "endPath"):
            out.append(cur)
            cur = []
    res = []
    for c in out:
        rp = RecordingPen(); rp.value = c
        bp = BoundsPen(gs); rp.replay(bp)
        if bp.bounds:
            res.append((c, bp.bounds))
    return res


def outline(font, text, x, base, size, drop_last_i_dot=False, tracking=0.0):
    """Return (svg path d, bounds, dot) for text set at (x, baseline) with em size `size`."""
    gs, cmap = font.getGlyphSet(), font.getBestCmap()
    s = size / font["head"].unitsPerEm
    pen, bp = SVGPathPen(gs), BoundsPen(gs)
    target = text.rfind("i") if drop_last_i_dot else -1
    dot = None
    for idx, ch in enumerate(text):
        g = cmap[ord(ch)]
        t = (s, 0, 0, -s, x, base)
        if idx == target:
            cs = contours(gs, g)
            d = max(cs, key=lambda c: c[1][1])
            for c, _ in cs:
                if c is d[0]:
                    continue
                rp = RecordingPen(); rp.value = c
                rp.replay(TransformPen(pen, t)); rp.replay(TransformPen(bp, t))
            x0, y0, x1, y1 = d[1]
            dot = (x + (x0 + x1) / 2 * s, base - (y0 + y1) / 2 * s, max(x1 - x0, y1 - y0) * s)
        else:
            gs[g].draw(TransformPen(pen, t)); gs[g].draw(TransformPen(bp, t))
        x += gs[g].width * s + tracking * size
    return pen.getCommands(), bp.bounds, dot


# ---------- the rose ----------

def crescent(r, a0, a1, w, rnd, steps=28):
    """A petal: the band between two arcs, tapering to points at both ends."""
    pts = []
    for i in range(steps + 1):
        a = a0 + (a1 - a0) * i / steps
        rr = r * (1 + rnd.uniform(-0.012, 0.012))
        pts.append((rr * math.cos(a), rr * math.sin(a)))
    mid = (a0 + a1) / 2
    for i in range(steps, -1, -1):
        a = a0 + (a1 - a0) * i / steps
        f = i / steps
        taper = min(1.0, f * 6) * min(1.0, (1 - f) * 1.7) ** 0.8   # blunt stencil cut at the start, brushed tail at the end
        ri = r - w * taper
        pts.append((ri * math.cos(a) + w * 0.12 * math.cos(mid), ri * math.sin(a) + w * 0.12 * math.sin(mid)))
    return pts


def rose_shapes(seed=3):
    """Stencil rose in unit space (radius about 1): a curled bud and rings of broken petals."""
    rnd = random.Random(seed)
    rings = [
        # radius, petal width, petals, arc length (deg), start angle (deg)
        (0.21, 0.15, 1, 300, 200),
        (0.42, 0.16, 2, 160, 120),
        (0.63, 0.17, 3, 112, 40),
        (0.84, 0.18, 3, 112, 95),
        (1.05, 0.19, 4, 84, 10),
    ]
    shapes = []
    for r, w, n, arc, start in rings:
        for k in range(n):
            a0 = math.radians(start + k * 360 / n + rnd.uniform(-10, 10))
            a1 = a0 + math.radians(arc + rnd.uniform(-14, 14))
            shapes.append(crescent(r, a0, a1, w, rnd))
    # A small solid heart of the bloom.
    shapes.append([(0.07 * math.cos(t / 12 * math.tau), 0.07 * math.sin(t / 12 * math.tau)) for t in range(12)])
    return shapes


def poly_d(pts, tf):
    return "M" + " L".join(f"{tf(x, y)[0]:.2f} {tf(x, y)[1]:.2f}" for x, y in pts) + " Z"


def rose_svg(uid, cx, cy, radius, seed=3, rotate=-14, dots=2600, squash=0.94):
    dots = int(dots * 2.6)
    """Speckled stencil rose: rose shapes as a mask over a base tint and a field of spray dots."""
    rad = math.radians(rotate)

    def tf(x, y):
        x, y = x, y * squash
        return (cx + radius * (x * math.cos(rad) - y * math.sin(rad)),
                cy + radius * (x * math.sin(rad) + y * math.cos(rad)))

    shapes = rose_shapes(seed)
    mask = "".join(f'<path fill="#fff" d="{poly_d(p, tf)}"/>' for p in shapes)
    rnd = random.Random(seed * 101)
    dot_svg = []
    for _ in range(dots):
        # Denser, deeper colour towards the lower left; light speckle towards the upper right.
        u, v = rnd.uniform(-1.05, 1.05), rnd.uniform(-1.05, 1.05)
        light = (u - v) / 2.1 + rnd.gauss(0, 0.35)
        idx = max(0, min(len(ROSE) - 1, int((light + 1) / 2 * len(ROSE))))
        x, y = tf(u, v)
        rr = radius * rnd.uniform(0.005, 0.016)
        dot_svg.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{rr:.2f}" fill="{ROSE[idx]}" fill-opacity="{rnd.uniform(0.55, 1):.2f}"/>')
    x0, y0 = cx - radius * 1.2, cy - radius * 1.2
    return (f'<defs><mask id="rose-{uid}" maskUnits="userSpaceOnUse" x="{x0:.1f}" y="{y0:.1f}" '
            f'width="{radius * 2.4:.1f}" height="{radius * 2.4:.1f}">{mask}</mask>'
            f'<radialGradient id="rose-tint-{uid}" cx="38%" cy="62%" r="70%">'
            f'<stop offset="0" stop-color="#A82552"/><stop offset=".6" stop-color="#C9416C"/><stop offset="1" stop-color="#EFA0B9"/></radialGradient></defs>'
            f'<g mask="url(#rose-{uid})">'
            f'<rect x="{x0:.1f}" y="{y0:.1f}" width="{radius * 2.4:.1f}" height="{radius * 2.4:.1f}" fill="url(#rose-tint-{uid})" fill-opacity="0.9"/>'
            + "".join(dot_svg) + "</g>")


# ---------- the hand-drawn heart ----------

def heart_points(cx, cy, w, wobble_seed=5, n=240):
    """A classic heart curve, nudged off-symmetry with gentle wobbles so it reads as hand-drawn."""
    rnd = random.Random(wobble_seed)
    ph = [rnd.uniform(0, math.tau) for _ in range(3)]
    pts = []
    for i in range(n):
        t = math.tau * i / n
        x = 16 * math.sin(t) ** 3
        y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        k = 1 + 0.018 * math.sin(3 * t + ph[0]) + 0.012 * math.sin(5 * t + ph[1]) + 0.008 * math.sin(7 * t + ph[2])
        if x < 0:
            k *= 1.035          # left lobe a touch fuller
            y -= 0.5            # and a little higher
        pts.append((cx + x * k * w / 34, cy + y * k * w / 34 + w * 0.03))
    return pts


def smooth_d(pts):
    """Closed Catmull-Rom spline through points, as cubic Béziers."""
    n = len(pts)
    d = f"M{pts[0][0]:.2f} {pts[0][1]:.2f}"
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f" C{c1[0]:.2f} {c1[1]:.2f} {c2[0]:.2f} {c2[1]:.2f} {p2[0]:.2f} {p2[1]:.2f}"
    return d + " Z"


# ---------- assembling ----------

def wordmark(x, base, size, uid):
    d, b, dot = outline(SCRIPT, "Pinkaholic", x, base, size, drop_last_i_dot=True)
    return d, b, dot


def write(name, svg):
    with open(os.path.join(OUT_DIR, name), "w", encoding="utf-8") as f:
        f.write(svg)
    print(name)


def logo(dark=False):
    """The plain wordmark with a rose dot. dark=True gives a light-pink version for dark backgrounds."""
    d, b, dot = wordmark(0, 0, 200, "logo")
    g0, g1 = ("#F7A8C2", "#FFD6E3") if dark else (PINK_DEEP, PINK)
    pad = 14
    rx, ry, rs = dot[0] + 12, dot[1] - 12, max(dot[2] * 1.25, 12)
    x0, y0 = b[0] - pad, min(b[1], ry - rs) - pad
    x1, y1 = max(b[2], rx + rs) + pad, b[3] + pad
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.0f} {y0:.0f} {x1 - x0:.0f} {y1 - y0:.0f}" role="img" aria-label="Pinkaholic">\n'
           f'<defs><linearGradient id="ink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{g0}"/><stop offset="1" stop-color="{g1}"/></linearGradient></defs>\n'
           f'<path fill="url(#ink)" d="{d}"/>\n' + rose_svg("logo", rx, ry, rs, dots=420) + "\n</svg>\n")
    write("logo-rose-light.svg" if dark else "logo-rose.svg", svg)


STYLES = {
    # name: heart fill, outline, inner line, word gradient, url colour, die-cut colour
    "cream": ("#FFF8F3", "#E05A8A", "#F3B5C9", (PINK_DEEP, PINK), "#8A3A5C", "#FFFFFF"),
    "blush": ("#F9DCE5", "#D94A7E", "#FFFFFF", (PINK_DEEP, "#EE4F86"), "#7A2448", "#FFFFFF"),
    "wine": ("#3A0F22", "#F3A6C0", "#7C2A4C", ("#F7A8C2", "#FFD6E3"), "#F6C9D7", "#FFFFFF"),
}


def sticker(style, with_cutline=False):
    fill, line, inner, grad, url_col, cut = STYLES[style]
    W, H = 800, 760                        # 1 unit = 0.1 mm, so the sticker is 80 x 76 mm
    hx, hy, hw = 400, 342, 690
    heart = heart_points(hx, hy, hw)
    hd = smooth_d(heart)
    inner_d = smooth_d(heart_points(hx, hy + 6, hw * 0.93, wobble_seed=9))

    # Wordmark across the upper middle of the heart.
    wd, wb, dot = wordmark(0, 0, 100, style)
    size = 100 * 520 / (wb[2] - wb[0])        # wordmark spans about 520 of the heart's 690 width
    wd, wb, dot = wordmark(0, 0, size, style)
    tx = hx - (wb[2] - wb[0]) / 2 - wb[0]
    wd, wb, dot = wordmark(tx, 300, size, style)
    rs = max(dot[2] * 1.5, 15)

    # Web address, letter-spaced, below the wordmark.
    ud, ub, _ = outline(JOST, "PINKAHOLIC.COM.AU", 0, 0, 25, tracking=0.22)
    uw = ub[2] - ub[0]
    ud, ub, _ = outline(JOST, "PINKAHOLIC.COM.AU", hx - uw / 2 - ub[0], 416, 25, tracking=0.22)

    # A fuller rose low in the heart, above the point.
    bloom = rose_svg(style + "-bloom", hx, 522, 62, seed=3, rotate=8, dots=1500)

    cutline = (f'<g id="cutline"><path fill="none" stroke="#1E88E5" stroke-width="2" stroke-dasharray="10 6" '
               f'transform="translate({hx} {hy}) scale(1.075) translate({-hx} {-hy})" d="{hd}"/></g>\n') if with_cutline else ""
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="80mm" height="76mm" viewBox="0 0 {W} {H}" role="img" '
           f'aria-label="Pinkaholic sticker, pinkaholic.com.au">\n'
           f'<defs><linearGradient id="ink-{style}" x1="0" y1="0" x2="1" y2="1">'
           f'<stop offset="0" stop-color="{grad[0]}"/><stop offset="1" stop-color="{grad[1]}"/></linearGradient></defs>\n'
           f'<g id="die-cut-border"><path fill="{cut}" stroke="{cut}" stroke-width="44" stroke-linejoin="round" d="{hd}"/></g>\n'
           f'<g id="artwork">\n'
           f'<path fill="{fill}" d="{hd}"/>\n'
           f'<path fill="none" stroke="{inner}" stroke-width="2.2" d="{inner_d}"/>\n'
           f'<path fill="none" stroke="{line}" stroke-width="6" stroke-linejoin="round" d="{hd}"/>\n'
           f'<path fill="url(#ink-{style})" d="{wd}"/>\n'
           + rose_svg(style + "-dot", dot[0] + 4, dot[1] - 7, rs, dots=520) + "\n"
           + f'<path fill="{url_col}" d="{ud}"/>\n'
           + bloom + "\n</g>\n" + cutline + "</svg>\n")
    write(f"sticker-heart-{style}{'-cutline' if with_cutline else ''}.svg", svg)


os.makedirs(OUT_DIR, exist_ok=True)
logo()
logo(dark=True)
for st in STYLES:
    sticker(st)
    sticker(st, with_cutline=True)


def rose_icon():
    """The rose on its own, for social icons, favicons and packaging."""
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-label="Pinkaholic rose">\n'
           + rose_svg("icon", 120, 120, 104, dots=5200) + "\n</svg>\n")
    write("rose.svg", svg)


rose_icon()
