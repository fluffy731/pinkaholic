"""Build 'pinkaholic' wordmark SVGs with a heart replacing the dot on the final i."""
import sys, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.recordingPen import RecordingPen, DecomposingRecordingPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

FONT_DIR, OUT_DIR = sys.argv[1], sys.argv[2]
FONTS = {
    "greatvibes": "GreatVibes-Regular.ttf",
    "parisienne": "Parisienne-Regular.ttf",
    "allura": "Allura-Regular.ttf",
    "pacifico": "Pacifico-Regular.ttf",
    "sacramento": "Sacramento-Regular.ttf",
    "dancing": "DancingScript%5Bwght%5D.ttf",
    "yesteryear": "Yesteryear-Regular.ttf",
    "cookie": "Cookie-Regular.ttf",
    "kaushan": "KaushanScript-Regular.ttf",
}
WORD = "pinkaholic"
INK, PINK = "#4A1230", "#FF5C93"
# Heart in a 100 x 90 box, point at the bottom.
HEART = ("M50 90C20 70 0 52 0 29C0 12 12 0 27 0C38 0 46 6 50 15"
         "C54 6 62 0 73 0C88 0 100 12 100 29C100 52 80 70 50 90Z")


def contours(glyphset, name):
    """Split a glyph into contours, each as (RecordingPen value, bounds)."""
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
        rp = RecordingPen(); rp.value = c
        bp = BoundsPen(glyphset); rp.replay(bp)
        if bp.bounds:
            res.append((c, bp.bounds))
    return res


def build(key, fname):
    font = TTFont(os.path.join(FONT_DIR, fname))
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    upm = font["head"].unitsPerEm
    path_pen = SVGPathPen(gs)
    x = 0
    heart_at = None
    last_i = WORD.rindex("i")
    for idx, ch in enumerate(WORD):
        gname = cmap[ord(ch)]
        tp = TransformPen(path_pen, (1, 0, 0, -1, x, 0))  # flip y for SVG
        if idx == last_i:
            cs = contours(gs, gname)
            dot = max(cs, key=lambda c: c[1][1])  # contour with the highest bottom edge
            for c, b in cs:
                if c is dot[0]:
                    continue
                rp = RecordingPen(); rp.value = c; rp.replay(tp)
            xmin, ymin, xmax, ymax = dot[1]
            heart_at = (x + (xmin + xmax) / 2, -(ymin + ymax) / 2, max(xmax - xmin, ymax - ymin))
        else:
            gs[gname].draw(tp)
        x += gs[gname].width
    d = path_pen.getCommands()

    # Overall bounds of letters.
    bp = BoundsPen(gs)
    rp = RecordingPen()
    x2 = 0
    for ch in WORD:
        g = cmap[ord(ch)]
        gs[g].draw(TransformPen(bp, (1, 0, 0, -1, x2, 0)))
        x2 += gs[g].width
    xmin, ymin, xmax, ymax = bp.bounds

    hx, hy, dot_size = heart_at
    hw = max(dot_size * 2.1, upm * 0.13)  # heart width
    s = hw / 100
    heart_tf = f"translate({hx - 50 * s:.1f} {hy - 52 * s:.1f}) rotate(-10 {50 * s:.1f} {45 * s:.1f}) scale({s:.4f})"
    pad = upm * 0.06
    vx, vy = xmin - pad, min(ymin, hy - 52 * s) - pad
    vw, vh = (xmax - xmin) + 2 * pad, (max(ymax, hy + 45 * s) - vy) + pad

    def svg(ink, heart):
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vx:.0f} {vy:.0f} {vw:.0f} {vh:.0f}" '
                f'role="img" aria-label="Pinkaholic">\n'
                f'  <path fill="{ink}" d="{d}"/>\n'
                f'  <path fill="{heart}" transform="{heart_tf}" d="{HEART}"/>\n</svg>\n')

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, f"logo-{key}.svg"), "w") as f:
        f.write(svg(INK, PINK))
    with open(os.path.join(OUT_DIR, f"logo-{key}-white.svg"), "w") as f:
        f.write(svg("#FFFFFF", PINK))
    print(key, "ok")


for k, v in FONTS.items():
    try:
        build(k, v)
    except Exception as e:
        print(k, "FAILED", e)
