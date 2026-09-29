"""Visual effects, projectiles and pickups (art resolution, facing right)."""
from __future__ import annotations

import math
import random
from PIL import Image, ImageFilter

from .pixel import Canvas, rgba, shade, mix, rot, outline


def _glow(im, radius=2, strength=0.6):
    """Soft additive-looking halo behind bright pixels (kept pixel-ish by quantising alpha)."""
    a = im.split()[3].filter(ImageFilter.GaussianBlur(radius))
    halo = Image.new("RGBA", im.size, (0, 0, 0, 0))
    col = im.convert("RGB").filter(ImageFilter.GaussianBlur(radius))
    hp, cp, ap = halo.load(), col.load(), a.load()
    for y in range(im.height):
        for x in range(im.width):
            al = int(ap[x, y] * strength)
            al = (al // 40) * 40
            if al:
                hp[x, y] = (*cp[x, y], al)
    halo.alpha_composite(im)
    return halo


def slash_frames():
    out = []
    for f in range(3):
        c = Canvas(56, 48)
        box = (4, 2, 52, 46)
        a0, a1 = [(-80, 40), (-95, 75), (-60, 80)][f]
        width = [3, 6, 3][f]
        c.arc(box, a0, a1, "#ffb84a", width + 2)
        c.arc((box[0] + 2, box[1] + 2, box[2] - 2, box[3] - 2), a0 + 5, a1 - 3, "#fff4c8", width)
        if f == 2:
            for i in range(0, 50, 7):
                ang = math.radians(a0 + i * 2.2)
                c.px(28 + 22 * math.cos(ang), 24 + 22 * math.sin(ang), (0, 0, 0, 0))
        out.append(_glow(c.im, 2, 0.5))
    return out


def whirl_frames():
    out = []
    for f in range(4):
        c = Canvas(84, 52)
        for r, col in ((38, "#ffb84a"), (34, "#fff4c8")):
            start = f * 90
            c.arc((42 - r, 26 - r * 0.55, 42 + r, 26 + r * 0.55), start, start + 220, col, 3 if col == "#fff4c8" else 5)
        c.arc((10, 10, 74, 42), f * 90 + 180, f * 90 + 300, "#e0e8ff", 2)
        rnd = random.Random(f)
        for _ in range(10):
            ang = rnd.random() * 2 * math.pi
            c.px(42 + 40 * math.cos(ang), 26 + 22 * math.sin(ang), "#ffe7a0")
        out.append(_glow(c.im, 2, 0.5))
    return out


def nova_frames():
    out = []
    for f in range(5):
        c = Canvas(90, 90)
        r = 10 + f * 9
        cx = cy = 45
        alpha = [255, 255, 230, 170, 90][f]
        c.ellipse(cx - r, cy - r, cx + r, cy + r, None, outline=rgba("#9fe8ff", alpha), width=3)
        c.ellipse(cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3, None, outline=rgba("#ffffff", alpha), width=1)
        for i in range(12):
            ang = i / 12 * 2 * math.pi + f * 0.15
            x0, y0 = cx + (r - 2) * math.cos(ang), cy + (r - 2) * math.sin(ang)
            x1, y1 = cx + (r + 7) * math.cos(ang), cy + (r + 7) * math.sin(ang)
            c.line([(x0, y0), (x1, y1)], rgba("#d8f6ff", alpha), 2)
            c.px(x1, y1, rgba("#ffffff", alpha))
        out.append(_glow(c.im, 2, 0.6))
    return out


def explosion_frames(size=56, palette=("#fff6c0", "#ffc04a", "#ff6a2a", "#a02a1a", "#3a2a2a")):
    out = []
    rnd = random.Random(9)
    blobs = [(rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(0.5, 1)) for _ in range(9)]
    for f in range(6):
        c = Canvas(size, size)
        cx = cy = size // 2
        R = size * [0.18, 0.3, 0.38, 0.42, 0.44, 0.45][f]
        for bx, by, bs in blobs:
            rr = R * bs * (1.0 if f < 4 else 0.8)
            x, y = cx + bx * R * 0.6, cy + by * R * 0.6 - f * 1.5
            col = palette[min(4, f // 2 + (1 if bs < 0.7 else 0))]
            if f >= 4:
                col = rgba(palette[4], 200 if f == 4 else 120)
            c.ellipse(x - rr, y - rr, x + rr, y + rr, col)
        if f < 3:
            c.ellipse(cx - R * 0.45, cy - R * 0.45, cx + R * 0.45, cy + R * 0.45, palette[0])
        out.append(outline(c.im, (40, 18, 14, 255)) if f < 4 else c.im)
    return out


def spark_frames(col="#fff4c8", col2="#ffb84a"):
    out = []
    for f in range(4):
        c = Canvas(22, 22)
        L = [4, 9, 8, 5][f]
        for i in range(8):
            ang = i / 8 * 2 * math.pi + (0.3 if f % 2 else 0)
            l = L if i % 2 == 0 else L * 0.6
            c.line([(11 + 2 * math.cos(ang), 11 + 2 * math.sin(ang)), (11 + l * math.cos(ang), 11 + l * math.sin(ang))], col if i % 2 == 0 else col2)
        if f < 2:
            c.rect(10, 10, 12, 12, "#ffffff")
        out.append(c.im)
    return out


def heal_frames():
    out = []
    rnd = random.Random(4)
    pts = [(rnd.randint(4, 30), rnd.randint(16, 44)) for _ in range(7)]
    for f in range(4):
        c = Canvas(36, 50)
        for i, (x, y) in enumerate(pts):
            yy = y - f * 5 - i % 3
            col = "#7dff9a" if i % 2 else "#d8ffe0"
            if i % 3 == 0:
                c.rect(x - 2, yy, x + 2, yy, col)
                c.rect(x, yy - 2, x, yy + 2, col)
            else:
                c.px(x, yy, col)
        out.append(_glow(c.im, 1.5, 0.7))
    return out


def levelup_frames():
    out = []
    for f in range(6):
        c = Canvas(50, 84)
        h = [20, 50, 80, 80, 80, 80][f]
        a = [255, 255, 230, 180, 120, 60][f]
        wdt = [6, 10, 12, 12, 10, 8][f]
        c.rect(25 - wdt, 84 - h, 25 + wdt, 83, rgba("#ffd35a", int(a * 0.55)))
        c.rect(25 - wdt // 2, 84 - h, 25 + wdt // 2, 83, rgba("#fff6c8", a))
        rnd = random.Random(f)
        for _ in range(12):
            x, y = rnd.randint(4, 46), rnd.randint(84 - h, 83)
            c.px(x, y, rgba("#fff0a0", a))
        c.ellipse(5, 76, 45, 83, None, outline=rgba("#ffd35a", a), width=2)
        out.append(c.im)
    return out


def shield_frames():
    out = []
    for f in range(2):
        c = Canvas(54, 60)
        c.ellipse(3, 3, 51, 57, rgba("#6ac8ff", 70), outline=rgba("#bff0ff", 200), width=2)
        for i in range(6):
            ang = i / 6 * 2 * math.pi + f * 0.5
            c.px(27 + 18 * math.cos(ang), 30 + 22 * math.sin(ang), "#ffffff")
        c.arc((10, 8, 44, 40), 200 + f * 20, 260 + f * 20, "#ffffff", 2)
        out.append(c.im)
    return out


def portal_frames(col="#a060ff", col2="#40105a", w=44, h=56):
    out = []
    for f in range(5):
        c = Canvas(w, h)
        s = [0.3, 0.6, 0.9, 1.0, 1.0][f]
        rx, ry = (w / 2 - 3) * s, (h / 2 - 3) * s
        cx, cy = w / 2, h / 2
        c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, col2, outline=col, width=2)
        for i in range(3):
            k = 1 - i * 0.28
            a0 = f * 60 + i * 110
            c.arc((cx - rx * k, cy - ry * k, cx + rx * k, cy + ry * k), a0, a0 + 150, mix(col, "#ffffff", 0.3 * i), 1)
        c.ellipse(cx - 2, cy - 2, cx + 2, cy + 2, "#f0d8ff")
        out.append(_glow(c.im, 2, 0.6))
    return out


def dust_frames():
    out = []
    for f in range(4):
        c = Canvas(26, 14)
        for i, (x, r) in enumerate(((6, 3), (13, 4), (20, 3))):
            rr = r + f * 0.7
            c.ellipse(x - rr - f, 10 - rr - f * 0.5, x + rr - f, 10 + rr * 0.6 - f * 0.5, rgba("#b8a890", 220 - f * 55))
        out.append(c.im)
    return out


def smoke_frames(col="#3a3040"):
    out = []
    rnd = random.Random(2)
    blobs = [(rnd.uniform(-10, 10), rnd.uniform(-8, 8), rnd.uniform(4, 8)) for _ in range(8)]
    for f in range(5):
        c = Canvas(40, 40)
        for bx, by, r in blobs:
            rr = r * (0.6 + f * 0.25)
            a = 230 - f * 45
            c.ellipse(20 + bx * (0.6 + f * 0.2) - rr, 22 + by * 0.8 - f * 2 - rr, 20 + bx * (0.6 + f * 0.2) + rr, 22 + by * 0.8 - f * 2 + rr, rgba(shade(col, 1.0 + f * 0.08), a))
        out.append(c.im)
    return out


def warcry_frames():
    out = []
    for f in range(4):
        c = Canvas(76, 60)
        for i in range(2):
            r = 10 + f * 8 + i * 6
            a = max(0, 255 - f * 55 - i * 40)
            c.ellipse(38 - r, 30 - r * 0.75, 38 + r, 30 + r * 0.75, None, outline=rgba("#ff5a3a" if i else "#ffd35a", a), width=2)
        out.append(c.im)
    return out


def flash_frames():
    out = []
    for f in range(3):
        c = Canvas(20, 20)
        r = [4, 7, 5][f]
        c.ellipse(10 - r, 10 - r, 10 + r, 10 + r, rgba("#fff4c8", [255, 200, 110][f]))
        out.append(c.im)
    return out


def meteor_impact_frames():
    return explosion_frames(72, ("#fffbe0", "#ffd05a", "#ff7a2a", "#b0301a", "#3a2a2a"))


# ---------------------------------------------------------------------------
# Projectiles

def fireball_frames():
    out = []
    for f in range(3):
        c = Canvas(22, 14)
        tail = [(2, 7), (8, 3 + f % 2), (8, 11 - f % 2)]
        c.poly(tail, "#ff6a2a")
        c.ellipse(8, 2, 20, 12, "#ffb04a")
        c.ellipse(11, 4, 18, 10, "#fff2b0")
        c.px(3 + f, 5 + f, "#ffb04a")
        out.append(_glow(outline(c.im, (70, 20, 10, 255)), 2, 0.6))
    return out


def arrow_frame():
    c = Canvas(24, 7)
    c.line([(2, 3), (19, 3)], "#c8a060")
    c.poly([(18, 1), (23, 3), (18, 5)], "#e0e8f0")
    c.rect(1, 1, 4, 1, "#f2efe6")
    c.rect(1, 5, 4, 5, "#f2efe6")
    c.rect(0, 2, 2, 4, "#c94f3a")
    return [outline(c.im)]


def meteor_frames():
    out = []
    for f in range(3):
        c = Canvas(30, 30)
        c.poly([(4, 4), (14, 10 + f), (10, 14 - f)], "#ff8a3a")
        c.poly([(1, 1), (10, 12), (12, 10)], "#ffcf6a")
        c.ellipse(11, 11, 27, 27, "#7a3a2a")
        c.ellipse(13, 13, 25, 25, "#b85a2a")
        c.ellipse(15, 14, 21, 20, "#ffd06a")
        out.append(_glow(outline(c.im, (60, 18, 10, 255)), 2, 0.6))
    return out


def orb_frames(col="#c46bff"):
    out = []
    for f in range(2):
        c = Canvas(16, 16)
        r = 5 + f
        c.ellipse(8 - r, 8 - r, 8 + r, 8 + r, col)
        c.ellipse(5, 5, 10, 10, mix(col, "#ffffff", 0.6))
        out.append(_glow(c.im, 2, 0.7))
    return out


def shockwave_frames():
    out = []
    for f in range(2):
        c = Canvas(30, 22)
        c.poly([(2, 21), (10, 4 + f * 2), (16, 10), (22, 2 + f * 2), (28, 21)], "#ff7a2a")
        c.poly([(8, 21), (12, 10), (16, 14), (21, 8), (24, 21)], "#ffd06a")
        out.append(_glow(outline(c.im, (70, 20, 10, 255)), 2, 0.6))
    return out


def ice_shard_frame():
    c = Canvas(18, 10)
    c.poly([(1, 5), (6, 1), (17, 5), (6, 9)], "#bff0ff")
    c.line([(5, 5), (15, 5)], "#ffffff")
    return [outline(c.im, (30, 60, 90, 255))]


# ---------------------------------------------------------------------------
# Pickups

def coin_frames():
    out = []
    for f in range(4):
        c = Canvas(12, 12)
        w = [5, 3, 1, 3][f]
        c.ellipse(6 - w, 1, 6 + w, 10, "#ffcc3a")
        if w > 1:
            c.ellipse(6 - w + 1, 2, 6 + w - 1, 9, "#ffe68a")
            c.rect(6, 3, 6, 8, "#d49a1a")
        out.append(outline(c.im, (80, 50, 10, 255)))
    return out


def life_orb_frames():
    out = []
    for f in range(2):
        c = Canvas(14, 14)
        r = 5 + f * 0.5
        c.ellipse(7 - r, 7 - r, 7 + r, 7 + r, "#e8384a")
        c.ellipse(4, 4, 8, 8, "#ffb0b8")
        c.rect(6, 4, 7, 10, "#ffffff")
        c.rect(4, 6, 10, 7, "#ffffff")
        out.append(_glow(outline(c.im, (70, 10, 20, 255)), 1.5, 0.6))
    return out


def item_icon(kind):
    c = Canvas(18, 18)
    if kind == "Espada":
        c.line([(3, 14), (14, 3)], "#dfe7ef", 2)
        c.line([(4, 15), (14, 5)], "#8f9aab")
        c.line([(2, 11), (7, 16)], "#e0b24c", 2)
        c.line([(1, 16), (3, 14)], "#7a4a24", 2)
    elif kind == "Baculo":
        c.line([(3, 16), (12, 5)], "#7b4d2a", 2)
        c.ellipse(10, 1, 16, 7, "#ffb347")
        c.px(12, 3, "#fff0a8")
    elif kind == "Arco":
        c.arc((2, 1, 14, 17), 280, 80, "#9a6a38", 2)
        c.line([(9, 2), (9, 16)], "#efe6cf")
        c.line([(3, 9), (15, 9)], "#d8c7a0")
        c.px(15, 9, "#e8eef4")
    elif kind == "Armadura":
        c.poly([(3, 3), (7, 2), (11, 2), (15, 3), (14, 9), (13, 16), (5, 16), (4, 9)], "#8a95a6")
        c.poly([(3, 3), (7, 2), (7, 16), (5, 16), (4, 9)], "#5f6b7c")
        c.rect(7, 2, 11, 3, "#1a1420")
        c.rect(8, 6, 10, 12, "#c9d2dd")
    return outline(c.im)


def loot_beam():
    c = Canvas(14, 64)
    for y in range(64):
        a = int(200 * (y / 63) ** 1.6)
        for x in range(14):
            d = abs(x - 6.5) / 7
            aa = int(a * max(0, 1 - d * d * 1.3))
            if aa > 0:
                c.px(x, y, (255, 255, 255, (aa // 25) * 25))
    return c.im


def loot_with_beam(kind, color, rarity):
    """Item icon standing on the ground with a light beam tinted by rarity."""
    from .pixel import rgba as _rgba
    w, h = 20, 70
    c = Canvas(w, h)
    col = _rgba(color)
    beam_h = 26 + rarity * 8
    for y in range(h - beam_h, h - 8):
        t = (y - (h - beam_h)) / beam_h
        a = int(170 * t ** 1.4)
        for x in range(w):
            d = abs(x - (w - 1) / 2) / (w / 2)
            aa = int(a * max(0, 1 - d * d * 1.2))
            if aa > 8:
                c.px(x, y, (col[0], col[1], col[2], (aa // 20) * 20))
    c.ellipse(1, h - 6, w - 2, h - 1, (col[0], col[1], col[2], 110))
    icon = item_icon(kind)
    c.im.alpha_composite(icon, ((w - icon.width) // 2, h - icon.height - 1))
    if rarity >= 4:
        for (x, y) in ((3, h - 30), (15, h - 40), (6, h - 48)):
            c.px(x, y, "#ffffff")
    return c.im


# ---------------------------------------------------------------------------
# v2: double-jump ring, lightning, fire aura, thrown sword, explosive arrow

def jump_ring_frames():
    """Flat ring that expands under the feet (double jump)."""
    out = []
    for f in range(4):
        c = Canvas(48, 18)
        rx, ry = 7 + f * 5, 2 + f
        a = [255, 220, 150, 80][f]
        c.ellipse(24 - rx, 9 - ry, 24 + rx, 9 + ry, None, outline=rgba("#bff0ff", a), width=2)
        c.ellipse(24 - rx + 2, 9 - ry + 1, 24 + rx - 2, 9 + ry - 1, None, outline=rgba("#ffffff", a // 2), width=1)
        out.append(c.im)
    return out


def lightning_frames():
    """Vertical bolt that strikes from the sky (origin = bottom centre)."""
    out = []
    for f in range(4):
        rnd = random.Random(40 + f)
        c = Canvas(34, 120)
        x, y = 17, 0
        pts = [(x, 0)]
        while y < 108:
            y += rnd.randint(10, 17)
            x = max(7, min(27, x + rnd.randint(-9, 9)))
            pts.append((x, y))
        pts.append((17, 116))
        c.line(pts, "#6fa8ff", 5)
        c.line(pts, "#cfe6ff", 3)
        c.line(pts, "#ffffff", 1)
        bx, by = pts[len(pts) // 2]
        c.line([(bx, by), (bx + rnd.choice((-9, 9)), by + 12)], "#9fc8ff", 2)
        c.ellipse(9, 106, 25, 118, mix("#bfe0ff", "#ffffff", 0.4))
        out.append(_glow(c.im, 2, 0.7))
    return out


def aura_frames():
    """Ring of flames around the caster (loops)."""
    out = []
    for f in range(4):
        c = Canvas(80, 60)
        cx, cy = 40, 34
        for i in range(14):
            ang = i / 14 * 2 * math.pi + f * 0.28
            rx, ry = 30, 22
            bx, by = cx + rx * math.cos(ang), cy + ry * math.sin(ang)
            h = 7 + 3 * ((i + f) % 3)
            tip = (bx + 2 * math.sin(ang * 3), by - h)
            c.poly([(bx - 3, by), (bx + 3, by), tip], "#ff7a2a")
            c.poly([(bx - 1.5, by), (bx + 1.5, by), (tip[0], tip[1] + 3)], "#ffd06a")
        c.ellipse(cx - 30, cy - 22, cx + 30, cy + 22, None, outline=rgba("#ff5a1a", 150), width=1)
        out.append(_glow(c.im, 2, 0.6))
    return out


def sword_spin_frames():
    """Thrown greatsword, spinning."""
    out = []
    for f in range(4):
        c = Canvas(34, 34)
        pts = [(17, 3), (20, 8), (20, 22), (17, 25), (14, 22), (14, 8)]
        blade = rot(pts, f * 22.5, 17, 17)
        c.poly(blade, "#dfe7ef")
        c.line(rot([(17, 5), (17, 23)], f * 22.5, 17, 17), "#8f9aab")
        c.line(rot([(11, 25), (23, 25)], f * 22.5, 17, 17), "#e0b24c", 2)
        c.line(rot([(17, 25), (17, 31)], f * 22.5, 17, 17), "#7a4a24", 2)
        out.append(_glow(outline(c.im), 2, 0.5))
    return out


def explosive_arrow_frame():
    c = Canvas(28, 9)
    c.line([(2, 4), (21, 4)], "#c8a060")
    c.poly([(20, 1), (26, 4), (20, 7)], "#ff8a3a")
    c.poly([(21, 3), (25, 4), (21, 5)], "#fff0a8")
    c.rect(1, 2, 5, 2, "#f2efe6")
    c.rect(1, 6, 5, 6, "#f2efe6")
    c.rect(0, 3, 2, 5, "#c94f3a")
    return [_glow(outline(c.im), 2, 0.6)]


# ---------------------------------------------------------------------------
# v2: enemy projectiles (boulder / crystal shard) and ground warning marker

def rock_frames(crystal=False):
    out = []
    base = ("#4fb8d8", "#9ff4ff", "#2a7a9a") if crystal else ("#7d6a58", "#a58d78", "#4a3d32")
    for f in range(2):
        c = Canvas(22, 22)
        pts = [(4, 8), (9, 2), (16, 4), (19, 11), (15, 19), (7, 19), (3, 14)]
        c.poly(pts if f == 0 else rot(pts, 30, 11, 11), base[0])
        c.poly([(6, 8), (9, 4), (13, 5), (10, 10)], base[1])
        c.poly([(10, 12), (18, 12), (15, 18), (8, 18)], base[2])
        out.append(_glow(outline(c.im, (24, 18, 30, 255)), 1, 0.4 if crystal else 0.0))
    return out


def warning_frames():
    """Pulsing red ring on the ground: a heavy attack will land here soon."""
    out = []
    for f in range(4):
        c = Canvas(44, 14)
        r = 10 + (f % 2) * 2
        a = 200 - f * 20
        c.ellipse(22 - r - 8, 7 - 5, 22 + r + 8, 7 + 5, None, outline=rgba("#ff4a4a", a), width=2)
        c.ellipse(22 - 8, 7 - 3, 22 + 8, 7 + 3, rgba("#ff8a5a", 90))
        out.append(c.im)
    return out
