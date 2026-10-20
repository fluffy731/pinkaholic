"""Build Pinkaholic wordmark SVGs in several styles, with a heart for the dot on the final i.

Usage: python make_logo_v2.py <font_dir> <out_dir>
Fonts are Google Fonts (OFL/Apache) files. Needs `pip install fonttools`.
"""
import os
import sys

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import DecomposingRecordingPen, RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

FONT_DIR, OUT_DIR = sys.argv[1], sys.argv[2]

BERRY, PINK, HOT, BLUSH, PEACH = "#4A1230", "#FF5C93", "#E8337A", "#F7B6CF", "#FFB38A"
HEART = ("M50 90C20 70 0 52 0 29C0 12 12 0 27 0C38 0 46 6 50 15"
         "C54 6 62 0 73 0C88 0 100 12 100 29C100 52 80 70 50 90Z")

# key, font file, text, variable axes, style
STYLES = [
    ("couture-pinyon", "PinyonScript-Regular.ttf", "Pinkaholic", None, {"fill": BERRY}),
    ("couture-monsieur", "MonsieurLaDoulaise-Regular.ttf", "Pinkaholic", None, {"fill": BERRY}),
    ("couture-italianno", "Italianno-Regular.ttf", "Pinkaholic", None, {"fill": BERRY}),
    ("couture-rouge", "RougeScript-Regular.ttf", "Pinkaholic", None, {"fill": BERRY}),
    ("couture-herr", "HerrVonMuellerhoff-Regular.ttf", "Pinkaholic", None, {"fill": BERRY}),
    ("ornate-imperial", "ImperialScript-Regular.ttf", "Pinkaholic", None, {"grad": (HOT, PINK)}),
    ("ornate-ballet", "Ballet%5Bopsz%5D.ttf", "Pinkaholic", {"opsz": 72}, {"grad": (HOT, PINK)}),
    ("ornate-corinthia", "Corinthia-Bold.ttf", "Pinkaholic", None, {"grad": (HOT, PINK)}),
    ("ornate-msmadi", "MsMadi-Regular.ttf", "Pinkaholic", None, {"grad": (HOT, PINK)}),
    ("didone-bodoni", "BodoniModa-Italic%5Bopsz,wght%5D.ttf", "pinkaholic", {"opsz": 96, "wght": 500}, {"fill": BERRY}),
    ("didone-playfair", "PlayfairDisplay-Italic%5Bwght%5D.ttf", "pinkaholic", {"wght": 500}, {"fill": BERRY}),
    ("retro-fraunces", "Fraunces-Italic%5BSOFT,WONK,opsz,wght%5D.ttf", "Pinkaholic",
     {"wght": 800, "SOFT": 100, "WONK": 1, "opsz": 144}, {"fill": BERRY}),
    ("retro-cherryswash", "CherrySwash-Bold.ttf", "Pinkaholic", None, {"fill": BERRY}),
    ("groovy-shrikhand", "Shrikhand-Regular.ttf", "pinkaholic", None, {"grad": (PEACH, PINK), "vertical": True}),
    ("groovy-bagel", "BagelFatOne-Regular.ttf", "pinkaholic", None, {"grad": (PEACH, PINK), "vertical": True}),
    ("icecream-lobster", "Lobster-Regular.ttf", "Pinkaholic", None,
     {"fill": BLUSH, "stroke": BERRY, "shadow": BERRY}),
    ("icecream-yellowtail", "Yellowtail-Regular.ttf", "Pinkaholic", None,
     {"fill": "#FFFFFF", "stroke": BERRY, "shadow": BERRY}),
    ("icecream-leckerli", "LeckerliOne-Regular.ttf", "Pinkaholic", None,
     {"fill": BLUSH, "stroke": BERRY, "shadow": BERRY}),
    ("sweet-meow", "MeowScript-Regular.ttf", "Pinkaholic", None, {"fill": BERRY}),
]


def contours(glyphset, name):
    """Split a glyph into contours, each as (pen operations, bounds)."""
    pen = DecomposingRecordingPen(glyphset)
    glyphset[name].draw(pen)
    out, cur = [], []
    for op, args in pen.value:
        cur.append((op, args))
        if op in ("closePath", "endPath"):
            out.append(cur)
            cur = []
    res = []
    for c in out:
        rp = RecordingPen()
        rp.value = c
        bp = BoundsPen(glyphset)
        rp.replay(bp)
        if bp.bounds:
            res.append((c, bp.bounds))
    return res


def kerning(font):
    """Simple pair kerning from the old 'kern' table, if the font has one."""
    try:
        return font["kern"].kernTables[0].kernTable
    except Exception:
        return {}


def build(key, fname, word, axes, style):
    font = TTFont(os.path.join(FONT_DIR, fname))
    if axes:
        font = instancer.instantiateVariableFont(font, axes)
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    upm = font["head"].unitsPerEm
    kern = kerning(font)

    path_pen = SVGPathPen(gs)
    bounds_pen = BoundsPen(gs)
    x = 0
    heart_at = None
    last_i = word.rindex("i")
    prev = None
    for idx, ch in enumerate(word):
        g = cmap[ord(ch)]
        if prev is not None:
            x += kern.get((prev, g), 0)
        t = (1, 0, 0, -1, x, 0)
        if idx == last_i:
            cs = contours(gs, g)
            dot = max(cs, key=lambda c: c[1][1])
            for c, _ in cs:
                if c is dot:
                    continue
                rp = RecordingPen()
                rp.value = c
                rp.replay(TransformPen(path_pen, t))
                rp.replay(TransformPen(bounds_pen, t))
            xmin, ymin, xmax, ymax = dot[1]
            heart_at = (x + (xmin + xmax) / 2, -(ymin + ymax) / 2, max(xmax - xmin, ymax - ymin))
        else:
            gs[g].draw(TransformPen(path_pen, t))
            gs[g].draw(TransformPen(bounds_pen, t))
        x += gs[g].width
        prev = g
    d = path_pen.getCommands()
    xmin, ymin, xmax, ymax = bounds_pen.bounds

    hx, hy, dot = heart_at
    hw = max(dot * 2.2, upm * 0.12)
    s = hw / 100
    heart_tf = (f"translate({hx - 50 * s:.1f} {hy - 50 * s:.1f}) "
                f"rotate(-10 {50 * s:.1f} {45 * s:.1f}) scale({s:.4f})")

    stroke_w = upm * 0.035
    shadow = upm * 0.045 if style.get("shadow") else 0
    pad = upm * 0.06 + stroke_w + shadow
    top = min(ymin, hy - 52 * s)
    bottom = max(ymax, hy + 45 * s)
    vx, vy = xmin - pad, top - pad
    vw, vh = (xmax - xmin) + 2 * pad, (bottom - top) + 2 * pad

    defs, fill = "", style.get("fill", BERRY)
    if "grad" in style:
        a, b = style["grad"]
        coords = 'x1="0" y1="0" x2="0" y2="1"' if style.get("vertical") else 'x1="0" y1="0" x2="1" y2="1"'
        defs = (f'  <defs><linearGradient id="g-{key}" {coords}>'
                f'<stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/>'
                f'</linearGradient></defs>\n')
        fill = f"url(#g-{key})"

    parts = []
    if shadow:
        parts.append(f'  <path fill="{style["shadow"]}" stroke="{style["shadow"]}" stroke-width="{stroke_w:.0f}" '
                     f'stroke-linejoin="round" transform="translate({shadow:.0f} {shadow:.0f})" d="{d}"/>\n')
    if style.get("stroke"):
        parts.append(f'  <path fill="{fill}" stroke="{style["stroke"]}" stroke-width="{stroke_w:.0f}" '
                     f'stroke-linejoin="round" paint-order="stroke" d="{d}"/>\n')
    else:
        parts.append(f'  <path fill="{fill}" d="{d}"/>\n')
    heart_stroke = f' stroke="{BERRY}" stroke-width="7"' if style.get("stroke") else ""
    parts.append(f'  <path fill="{PINK}"{heart_stroke} transform="{heart_tf}" d="{HEART}"/>\n')

    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vx:.0f} {vy:.0f} {vw:.0f} {vh:.0f}" '
           f'role="img" aria-label="Pinkaholic">\n{defs}{"".join(parts)}</svg>\n')
    with open(os.path.join(OUT_DIR, f"logo-{key}.svg"), "w") as f:
        f.write(svg)
    print(key, "ok")


os.makedirs(OUT_DIR, exist_ok=True)
for args in STYLES:
    try:
        build(*args)
    except Exception as e:
        print(args[0], "FAILED", repr(e))
