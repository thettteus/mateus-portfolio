"""Generate public/og.png, the site's Open Graph card (1200x630).

    python3 scripts/make-og-image.py

Mirrors the live design system: Helvetica Neue, neutral paper, indigo accent,
and the hero's contribution-calendar motif. Rendered at 2x and downsampled so
the hairlines and cell corners stay crisp.

Needs Pillow and macOS system Helvetica Neue — the card is a committed static
asset, so this only runs when the copy or the design system changes. The
calendar band is a decorative stand-in for the hero's real GitHub calendar
(that one needs a token at build time); it carries no contribution count.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

S = 2  # supersample
W, H = 1200 * S, 630 * S

FONT = "/System/Library/Fonts/HelveticaNeue.ttc"
REG, BOLD, MED = 0, 1, 10

# --- tokens, lifted from styles/base/globals.scss (light theme) -------------
BG = (245, 246, 247)        # --bg      #f5f6f7  platinum paper
INK = (35, 38, 42)          # --ink     #23262a  graphite
INK_2 = (82, 87, 93)        # --ink-2   #52575d
INK_3 = (130, 135, 142)     # --ink-3   #82878e
RULE = (223, 225, 228)      # --rule    #dfe1e4
ACCENT = (8, 9, 10)         # --accent  #08090a  obsidian


def over(fg, alpha, bg=BG):
    """color-mix(in srgb, fg alpha%, transparent) composited on the paper."""
    return tuple(round(f * alpha + b * (1 - alpha)) for f, b in zip(fg, bg))


LEVELS = [RULE, over(ACCENT, 0.55), over(ACCENT, 0.68), over(ACCENT, 0.84), ACCENT]


def font(size, index=REG):
    return ImageFont.truetype(FONT, size * S, index=index)


def tracked(draw, x, y, runs, tracking=0.0):
    """Draw styled runs on one line with per-character tracking (em fraction).

    runs: list of (text, font, fill). Returns the x cursor after the line.
    """
    for text, f, fill in runs:
        step = tracking * f.size
        for ch in text:
            draw.text((x, y), ch, font=f, fill=fill)
            x += f.getlength(ch) + step
    return x


def width_of(runs, tracking=0.0):
    total = 0.0
    for text, f, _ in runs:
        total += f.getlength(text) + tracking * f.size * len(text)
    return total


img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

M = 80 * S            # page margin
CONTENT = W - 2 * M

# --- eyebrow: name, hairline divider, role ---------------------------------
f_name = font(30, BOLD)
f_role = font(15, MED)
name = "Mateus P. S."
y_eyebrow = 58 * S
d.text((M, y_eyebrow), name, font=f_name, fill=INK)

x = M + f_name.getlength(name) + 26 * S
d.rectangle([x, y_eyebrow + 3 * S, x + S, y_eyebrow + 29 * S], fill=RULE)

x += 26 * S
tracked(d, x, y_eyebrow + 9 * S, [("PRODUCT ENGINEER", f_role, INK_3)], tracking=0.14)

# section hairline, the same device the site uses under its section heads
d.rectangle([M, 124 * S, W - M, 124 * S + S], fill=RULE)

# --- headline: the hero line, verbatim ------------------------------------
f_h = font(100, REG)
f_hb = font(100, BOLD)
TRACK = -0.02
d_head = [
    [("From ", f_h, INK), ("ambiguity", f_hb, INK)],
    [("to ", f_h, INK), ("production.", f_hb, INK)],
]
y = 150 * S
for runs in d_head:
    tracked(d, M, y, runs, tracking=TRACK)
    y += 96 * S

# --- subline: the hero's second sentence, accent on the two crafts ---------
f_s = font(30, BOLD)
sub = [
    ("Bringing ", f_s, INK_2),
    ("product thinking", f_s, ACCENT),
    (" into ", f_s, INK_2),
    ("engineering execution", f_s, ACCENT),
    (".", f_s, INK_2),
]
tracked(d, M, 382 * S, sub, tracking=-0.012)

# --- contribution-calendar band, the hero's signature graphic -------------
ROWS, COLS = 7, 52
CELL, STEP, RADIUS = 16 * S, 20 * S, 3 * S
band_y = 448 * S


def prng(seed):
    """mulberry32, the same generator the hero uses for its grid."""
    state = seed

    def rand():
        nonlocal state
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        t = state
        t = (t ^ (t >> 15)) * (t | 1) & 0xFFFFFFFF
        t ^= (t + ((t ^ (t >> 7)) * (t | 61) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    return rand


rand = prng(7)
# a real calendar is mostly empty and moves in streaks: intensity walks week to
# week (busy stretches, quiet stretches) instead of every cell rolling alone.
intensity = 0.45
tally = [0] * 5
for c in range(COLS):
    intensity = min(1.0, max(0.0, intensity + (rand() - 0.5) * 0.55))
    for r in range(ROWS):
        weekend = r in (0, 6)
        heat = intensity * (0.35 if weekend else 1.0)
        roll = rand()
        if roll > heat:
            lvl = 0
        else:
            step = rand()
            lvl = 1 if step < 0.46 else (2 if step < 0.76 else (3 if step < 0.93 else 4))
        tally[lvl] += 1
        x0 = M + c * STEP
        y0 = band_y + r * STEP
        d.rounded_rectangle([x0, y0, x0 + CELL, y0 + CELL], radius=RADIUS, fill=LEVELS[lvl])

OUT = Path(__file__).resolve().parent.parent / "public" / "og.png"
img.resize((1200, 630), Image.LANCZOS).save(OUT, optimize=True)
print("wrote", OUT)
print("headline w:", width_of(d_head[1], TRACK) / S, "sub w:", width_of(sub, -0.012) / S, "content:", CONTENT / S)
print("level mix:", [round(t / sum(tally) * 100) for t in tally])
print("band right edge:", (M + (COLS - 1) * STEP + CELL) / S)
