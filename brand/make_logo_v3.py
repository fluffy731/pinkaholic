"""Pinkaholic lockups: heart emblem, gold script-over-caps, and big calligraphy.

Usage: python make_logo_v3.py <font_dir> <out_dir>
Writes logo-<key>.svg (for cream backgrounds) and logo-<key>-dark.svg (for black).
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
HEART = ("M50 90C20 70 0 52 0 29C0 12 12 0 27 0C38 0 46 6 50 15"
         "C54 6 62 0 73 0C88 0 100 12 100 29C100 52 80 70 50 90Z")
PINK = "#FF5C93"
_fonts = {}


def load(fname, axes=None):
    key = (fname, tuple(sorted((axes or {}).items())))
    if key not in _fonts:
        f = TTFont(os.path.join(FONT_DIR, fname))
        if axes:
            f = instancer.instantiateVariableFont(f, axes)
        _fonts[key] = f
    return _fonts[key]


def glyph_contours(gs, name):
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
        rp = RecordingPen()
        rp.value = c
        bp = BoundsPen(gs)
        rp.replay(bp)
        if bp.bounds:
            res.append((c, bp.bounds))
    return res


def word(font, text, x, base, size, heart_on_i=True, tracking=0.0):
    """Outline `text` at (x, base) with cap size `size` px-units.

    Returns (path d, bounds, heart) where heart is (cx, cy, dot size) for the
    last lowercase i (its dot removed), or for a capital I (placed above it).
    """
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    s = size / font["head"].unitsPerEm
    pen, bpen = SVGPathPen(gs), BoundsPen(gs)
    heart = None
    target = max(text.rfind("i"), text.rfind("I")) if heart_on_i else -1
    cx = x
    for idx, ch in enumerate(text):
        g = cmap[ord(ch)]
        t = (s, 0, 0, -s, cx, base)
        if idx == target and ch == "i":
            cs = glyph_contours(gs, g)
            dot = max(cs, key=lambda c: c[1][1])
            for c, _ in cs:
                if c is dot:
                    continue
                rp = RecordingPen()
                rp.value = c
                rp.replay(TransformPen(pen, t))
                rp.replay(TransformPen(bpen, t))
            x0, y0, x1, y1 = dot[1]
            heart = (cx + (x0 + x1) / 2 * s, base - (y0 + y1) / 2 * s, max(x1 - x0, y1 - y0) * s)
        else:
            gs[g].draw(TransformPen(pen, t))
            gs[g].draw(TransformPen(bpen, t))
            if idx == target and ch == "I":
                b = BoundsPen(gs)
                gs[g].draw(b)
                x0, y0, x1, y1 = b.bounds
                heart = (cx + (x0 + x1) / 2 * s, base - y1 * s - size * 0.16, size * 0.11)
        cx += gs[g].width * s + tracking * size
    return pen.getCommands(), bpen.bounds, heart


def heart_path(cx, cy, width, tilt=-10):
    s = width / 100
    return (f'transform="translate({cx - 50 * s:.1f} {cy - 50 * s:.1f}) '
            f'rotate({tilt} {50 * s:.1f} {45 * s:.1f}) scale({s:.4f})" d="{HEART}"')


def union(*bs):
    return (min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs))


def write(key, bounds, body_light, body_dark, defs="", pad=24):
    x0, y0, x1, y1 = bounds
    vb = f"{x0 - pad:.0f} {y0 - pad:.0f} {x1 - x0 + 2 * pad:.0f} {y1 - y0 + 2 * pad:.0f}"
    for suffix, body in (("", body_light), ("-dark", body_dark)):
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="Pinkaholic">\n'
               f'{defs.replace("ID", key + suffix)}{body.replace("ID", key + suffix)}</svg>\n')
        with open(os.path.join(OUT_DIR, f"logo-{key}{suffix}.svg"), "w") as f:
            f.write(svg)
    print(key, "ok")


def emblem(key, fname, axes=None):
    """A heart outline with a small script wordmark across it (after the An-Young sign)."""
    font = load(fname, axes)
    d, b, h = word(font, "Pinkaholic", 0, 0, 100)
    w = b[2] - b[0]
    hw = w * 1.08                      # heart outline width
    hx, hy = b[0] + w / 2, b[1] + (b[3] - b[1]) * 0.5
    s = hw / 100
    ox, oy = hx - 50 * s, hy - 30 * s  # widest part of the heart sits behind the word
    outline = f'transform="translate({ox:.1f} {oy:.1f}) scale({s:.4f})" d="{HEART}"'
    bounds = union(b, (ox, oy, ox + hw, oy + 90 * s))
    dot_w = max(h[2] * 2.2, 13)

    def body(ink, line):
        return (f'  <path fill="none" stroke="{line}" stroke-width="{3.2 / s:.2f}" stroke-linejoin="round" {outline}/>\n'
                f'  <path fill="{ink}" d="{d}"/>\n'
                f'  <path fill="{PINK}" {heart_path(h[0], h[1], dot_w)}/>\n')
    write(key, bounds, body("#4A1230", "#E8337A"), body("#FFFFFF", "#F9C6D9"), pad=10)


def golden(key, script_font, caps_font, caps_axes):
    """Script 'pink' sweeping over serif caps 'AHOLIC', in rose gold (after The Golden Hour)."""
    caps = load(caps_font, caps_axes)
    script = load(script_font)
    cd, cb, ch = word(caps, "AHOLIC", 0, 0, 100, tracking=0.04)
    sd, sb, _ = word(script, "pink", 0, 0, 105, heart_on_i=True)
    # Put the script word above and left, overlapping the caps' top edge.
    dx = cb[0] - sb[0] - 18
    dy = cb[1] - sb[3] + 58
    _, _, sh = word(script, "pink", dx, dy, 105)
    sd, sb, sh = word(script, "pink", dx, dy, 105)
    bounds = union(cb, sb)
    defs = ('  <defs><linearGradient id="ID" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset="0" stop-color="{a}"/><stop offset=".45" stop-color="{b}"/>'
            '<stop offset=".7" stop-color="{c}"/><stop offset="1" stop-color="{d}"/>'
            '</linearGradient></defs>\n')
    light = defs.format(a="#9E3D63", b="#E58AAA", c="#C25E84", d="#8C3357")

    def body(script_ink):
        return (f'  <path fill="url(#ID)" d="{cd}"/>\n'
                f'  <path fill="{script_ink}" d="{sd}"/>\n'
                f'  <path fill="{PINK}" {heart_path(ch[0], ch[1], 15)}/>\n')
    # The two variants need different gradients, so write them separately.
    x0, y0, x1, y1 = bounds
    pad = 14
    vb = f"{x0 - pad:.0f} {y0 - pad - 4:.0f} {x1 - x0 + 2 * pad:.0f} {y1 - y0 + 2 * pad + 4:.0f}"
    dark = defs.format(a="#FFF0F5", b="#F9C6D9", c="#E79AB7", d="#FFD9E6")
    for suffix, g, ink in (("", light, "#4A1230"), ("-dark", dark, "#FFFFFF")):
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="Pinkaholic">\n'
               f'{g.replace("ID", key + suffix)}{body(ink).replace("ID", key + suffix)}</svg>\n')
        with open(os.path.join(OUT_DIR, f"logo-{key}{suffix}.svg"), "w") as f:
            f.write(svg)
    print(key, "ok")


def calligraphy(key, fname):
    """Big, high-contrast calligraphic script (after the large An-Young lettering)."""
    font = load(fname)
    d, b, h = word(font, "Pinkaholic", 0, 0, 100)

    def body(ink):
        return (f'  <path fill="{ink}" d="{d}"/>\n'
                f'  <path fill="{PINK}" {heart_path(h[0], h[1], max(h[2] * 2.3, 12))}/>\n')
    write(key, b, body("#4A1230"), body("#FFFFFF"), pad=10)


os.makedirs(OUT_DIR, exist_ok=True)
for fn, args in [
    (emblem, ("emblem-pinyon", "PinyonScript-Regular.ttf")),
    (emblem, ("emblem-greatvibes", "GreatVibes-Regular.ttf")),
    (golden, ("golden-cinzel", "PinyonScript-Regular.ttf", "Cinzel%5Bwght%5D.ttf", {"wght": 500})),
    (golden, ("golden-cormorant", "GreatVibes-Regular.ttf", "CormorantGaramond%5Bwght%5D.ttf", {"wght": 500})),
    (calligraphy, ("callig-lavishly", "LavishlyYours-Regular.ttf")),
    (calligraphy, ("callig-meaculpa", "MeaCulpa-Regular.ttf")),
    (calligraphy, ("callig-ephesis", "Ephesis-Regular.ttf")),
    (calligraphy, ("callig-montecarlo", "MonteCarlo-Regular.ttf")),
    (calligraphy, ("callig-island", "IslandMoments-Regular.ttf")),
]:
    try:
        fn(*args)
    except Exception as e:
        print(args[0], "FAILED", repr(e))
