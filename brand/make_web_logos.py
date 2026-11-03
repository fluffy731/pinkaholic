"""Light web copies of the V1.1 logo pack for site/assets/.

Strips the embedded C2PA metadata and rounds path coordinates to one decimal place.
No dependencies. Run from the repo root: python brand/make_web_logos.py
"""
import re
from pathlib import Path

SRC = Path("brand/logo-v1.1/SVG")
OUT = Path("site/assets")

FILES = {
    "pinkaholic-wordmark.svg": "logo.svg",
    "pinkaholic-wordmark-on-dark.svg": "logo-on-dark.svg",
    "rose-with-leaves.svg": "rose-leaves.svg",
    "rose-only.svg": "rose.svg",
}


def light(svg, places=1):
    svg = re.sub(r"<metadata>.*?</metadata>", "", svg, flags=re.S)
    svg = svg.replace(' xmlns:c2pa="http://c2pa.org/manifest"', "")
    svg = re.sub(r"-?\d+\.\d+", lambda m: f"{float(m.group()):.{places}f}".rstrip("0").rstrip(".") if places else str(round(float(m.group()))), svg)
    return svg.strip() + "\n"


for src, dst in FILES.items():
    # The rose icons are only ever shown small, so whole units are plenty.
    svg = light((SRC / src).read_text(encoding="utf-8"), 0 if dst.startswith("rose") else 1)
    if dst == "logo-on-dark.svg" and 'role="img"' not in svg:
        svg = svg.replace("<svg ", '<svg role="img" aria-label="Pinkaholic" ', 1)
    (OUT / dst).write_text(svg, encoding="utf-8")
    print(f"{dst}: {len(svg.encode()) // 1024} KB")

# Favicon: the rose alone, on a blush disc so it reads on dark browser tabs.
rose = light((SRC / "rose-only.svg").read_text(encoding="utf-8"), 0)
vb = [float(n) for n in re.search(r'viewBox="([^"]+)"', rose).group(1).split()]
inner = re.search(r"<svg[^>]*>(.*)</svg>", rose, flags=re.S).group(1)
cx, cy, r = vb[0] + vb[2] / 2, vb[1] + vb[3] / 2, max(vb[2], vb[3]) * 0.62
fav = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{cx - r:.0f} {cy - r:.0f} {2 * r:.0f} {2 * r:.0f}">'
       f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r:.0f}" fill="#FFEAF0"/>{inner}</svg>\n')
(OUT / "favicon.svg").write_text(fav, encoding="utf-8")
print(f"favicon.svg: {len(fav.encode()) // 1024} KB")
