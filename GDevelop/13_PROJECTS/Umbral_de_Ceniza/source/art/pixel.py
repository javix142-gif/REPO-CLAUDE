"""Small pixel-art toolkit used by make_art.py (Pillow only).

All drawing happens at "art pixel" resolution; images are upscaled with
nearest-neighbour at export time so every sprite shares the same pixel density.
"""
from __future__ import annotations

import math
from PIL import Image, ImageDraw

OUTLINE = (20, 15, 26, 255)


def rgba(c, a=255):
    if isinstance(c, tuple):
        return c if len(c) == 4 else (*c, a)
    c = c.lstrip("#")
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), a)


def shade(c, f):
    """Darken (f<1) or lighten (f>1) a colour."""
    r, g, b, a = rgba(c)
    if f < 1:
        return (int(r * f), int(g * f), int(b * f), a)
    return (min(255, int(r + (255 - r) * (f - 1))), min(255, int(g + (255 - g) * (f - 1))),
            min(255, int(b + (255 - b) * (f - 1))), a)


def mix(c1, c2, t):
    a, b = rgba(c1), rgba(c2)
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(4))


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    # primitives -----------------------------------------------------------
    def px(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h:
            self.im.putpixel((x, y), rgba(c))

    def rect(self, x0, y0, x1, y1, c):
        x0, x1 = sorted((int(round(x0)), int(round(x1))))
        y0, y1 = sorted((int(round(y0)), int(round(y1))))
        self.d.rectangle((x0, y0, x1, y1), fill=rgba(c))

    def poly(self, pts, c):
        self.d.polygon([(round(x), round(y)) for x, y in pts], fill=rgba(c))

    def line(self, pts, c, w=1):
        pts = [(round(x), round(y)) for x, y in pts]
        if w <= 1:
            self.d.line(pts, fill=rgba(c), width=1)
        else:
            self.d.line(pts, fill=rgba(c), width=w, joint="curve")
            r = (w - 1) / 2
            for x, y in (pts[0], pts[-1]):
                self.d.ellipse((x - r, y - r, x + r, y + r), fill=rgba(c))

    def ellipse(self, x0, y0, x1, y1, c, outline=None, width=1):
        self.d.ellipse((round(x0), round(y0), round(x1), round(y1)), fill=rgba(c) if c else None,
                       outline=rgba(outline) if outline else None, width=width)

    def arc(self, box, a0, a1, c, width=1):
        self.d.arc(tuple(round(v) for v in box), a0, a1, fill=rgba(c), width=width)

    def paste(self, other, x, y):
        img = other.im if isinstance(other, Canvas) else other
        self.im.alpha_composite(img, (int(x), int(y)))


def rot(points, ang_deg, cx, cy):
    a = math.radians(ang_deg)
    ca, sa = math.cos(a), math.sin(a)
    return [(cx + (x - cx) * ca - (y - cy) * sa, cy + (x - cx) * sa + (y - cy) * ca) for x, y in points]


def outline(im, color=OUTLINE, diagonal=False):
    """Add a 1px outline around every opaque pixel."""
    src = im.load()
    w, h = im.size
    out = im.copy()
    o = out.load()
    nb = [(1, 0), (-1, 0), (0, 1), (0, -1)]
    if diagonal:
        nb += [(1, 1), (-1, -1), (1, -1), (-1, 1)]
    for y in range(h):
        for x in range(w):
            if src[x, y][3] == 0:
                for dx, dy in nb:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3] > 40:
                        o[x, y] = color
                        break
    return out


def scale(im, k):
    return im.resize((im.width * k, im.height * k), Image.Resampling.NEAREST)


def flash(im, c=(255, 255, 255, 255)):
    """Return a silhouette of the image filled with colour c (keeps alpha)."""
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    src, o = im.load(), out.load()
    for y in range(im.height):
        for x in range(im.width):
            a = src[x, y][3]
            if a:
                o[x, y] = (c[0], c[1], c[2], a)
    return out


def dither_gradient(c, x0, y0, x1, y1, top, bottom, steps=8):
    """Vertical banded gradient with a checker dither between bands (retro look)."""
    h = y1 - y0 + 1
    for y in range(y0, y1 + 1):
        t = (y - y0) / max(1, h - 1)
        band = t * (steps - 1)
        lo = int(band)
        frac = band - lo
        col_lo = mix(top, bottom, lo / (steps - 1))
        col_hi = mix(top, bottom, min(steps - 1, lo + 1) / (steps - 1))
        for x in range(x0, x1 + 1):
            use_hi = frac > 0.5 if (x + y) % 2 == 0 else frac > 0.75
            c.px(x, y, col_hi if use_hi else col_lo)
