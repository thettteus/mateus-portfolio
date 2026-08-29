"""Recolor the "M" mark from indigo to the monochrome metal palette.

    python3 scripts/recolor-icons.py

The icons are a flat two-color artwork (mark on a solid square) plus
antialiasing. Rather than redrawing the mark, every pixel is projected onto the
background→mark axis and re-plotted on the new axis, so the letterform and its
edge softness survive byte for byte — only the two endpoints move.

The mark carries the signature teal in both variants — brightened in the dark
one so it keeps its weight against the darker square.
"""
from pathlib import Path

from PIL import Image

PUBLIC = Path(__file__).resolve().parent.parent / "public"

LIGHT_BG, LIGHT_INK = (255, 255, 255), (0, 140, 149)  # white / signature teal
DARK_BG, DARK_INK = (22, 23, 24), (0, 178, 186)       # graphite / teal, brightened

LIGHT = ["icon-512.png", "icon-192.png", "apple-touch-icon.png",
         "favicon-32x32.png", "favicon-16x16.png", "icon_light.png"]
DARK = ["icon-dark-32x32.png", "icon-dark-16x16.png", "icon_dark.png"]
ICO = "favicon.ico"


def endpoints(img):
    """Background = a corner pixel; mark = the color furthest from it.

    Plain Euclidean distance, with no frequency floor: at 16x16 every pixel of
    the mark is its own antialiased blend, so nothing is frequent enough to
    spot by count and a floor picks the background back. Distance holds whether
    the mark is saturated or neutral, so this survives repeated recolors.
    """
    bg = img.load()[0, 0][:3]
    colors = [c for _, c in img.convert("RGB").getcolors(maxcolors=1 << 24) or []]
    ink = max(colors, key=lambda c: sum((a - b) ** 2 for a, b in zip(c, bg)))
    if sum((a - b) ** 2 for a, b in zip(ink, bg)) < 900:
        raise SystemExit(f"{img.size} image has no mark to recolor")
    return bg, ink


def recolor(path, new_bg, new_ink, out=None):
    img = Image.open(path).convert("RGBA")
    bg, ink = endpoints(img)
    axis = [i - b for i, b in zip(ink, bg)]
    denom = sum(a * a for a in axis) or 1

    src = img.load()
    dst = Image.new("RGBA", img.size)
    out_px = dst.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = src[x, y]
            t = sum(ax * (p - c) for ax, p, c in zip(axis, (r, g, b), bg)) / denom
            t = 0.0 if t < 0 else (1.0 if t > 1 else t)
            out_px[x, y] = (
                round(new_bg[0] + t * (new_ink[0] - new_bg[0])),
                round(new_bg[1] + t * (new_ink[1] - new_bg[1])),
                round(new_bg[2] + t * (new_ink[2] - new_bg[2])),
                a,
            )
    target = Path(out or path)
    dst.convert(Image.open(path).mode).save(target, optimize=True)
    print(f"{target.name:24} {bg} -> {new_bg}   {ink} -> {new_ink}")
    return dst


for name in LIGHT:
    recolor(PUBLIC / name, LIGHT_BG, LIGHT_INK)
for name in DARK:
    recolor(PUBLIC / name, DARK_BG, DARK_INK)

# the .ico keeps every size a browser might ask for
ico = recolor(PUBLIC / ICO, LIGHT_BG, LIGHT_INK, out=PUBLIC / ICO)
ico.convert("RGBA").save(PUBLIC / ICO, sizes=[(16, 16), (32, 32), (48, 48)])
print("favicon.ico resaved at 16/32/48")
