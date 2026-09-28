"""Backgrounds, tiles and props (art resolution)."""
from __future__ import annotations

import math
import random
from PIL import Image, ImageFilter

from .pixel import Canvas, rgba, shade, mix, outline, dither_gradient

THEMES = {
    "mazmorra": dict(sky_top="#070a12", sky_bot="#141b2a", brick="#1c2434", brick_l="#27314a", mortar="#0d111b",
                     recess="#070910", glow="#3a6aa8", stone="#323c52", stone_l="#4d5a78", stone_d="#1d2332",
                     slab="#3d465c", slab_l="#65718f", fill="#10131b", moss="#2f4a3a", banner="#2c4f8a", lava=None),
    "fortaleza": dict(sky_top="#0e0507", sky_bot="#2a0f10", brick="#2f1a1c", brick_l="#452629", mortar="#160a0b",
                      recess="#0c0506", glow="#ff6a2a", stone="#43302e", stone_l="#6a4a44", stone_d="#24191a",
                      slab="#4d3834", slab_l="#80605a", fill="#150c0c", moss="#5a2a1a", banner="#8a1e24", lava="#ff5a1a"),
}


def dungeon_far(theme):
    T = THEMES[theme]
    W, H = 256, 240
    c = Canvas(W, H)
    rnd = random.Random(11 if theme == "mazmorra" else 12)
    dither_gradient(c, 0, 0, W - 1, H - 1, T["sky_top"], T["sky_bot"], 10)
    # bricks
    for row in range(0, H // 8):
        y = row * 8 + 20
        off = 8 if row % 2 else 0
        for bx in range(-16, W, 16):
            x = bx + off
            v = rnd.uniform(0.85, 1.12)
            dark = min(1.0, 0.35 + (y / H) * 0.9)
            col = shade(T["brick"], v * dark)
            c.rect(x + 1, y + 1, x + 15, y + 7, col)
            c.rect(x + 1, y + 1, x + 15, y + 1, shade(T["brick_l"], dark))
            if rnd.random() < 0.08:
                c.line([(x + 4, y + 2), (x + 7, y + 5), (x + 6, y + 7)], T["mortar"])
    # arched alcoves
    for ax in (38, 166):
        top, bot, w = 86, 206, 50
        c.rect(ax, top + w // 2, ax + w, bot, T["recess"])
        c.ellipse(ax, top, ax + w, top + w, T["recess"])
        for i in range(0, 60, 2):  # faint inner light
            a = int(90 * (i / 60))
            c.rect(ax + 4, bot - i, ax + w - 4, bot - i, rgba(T["glow"], a // 3))
        c.arc((ax - 3, top - 3, ax + w + 3, top + w + 3), 180, 360, T["stone_l"], 3)
        c.rect(ax - 4, top + w // 2, ax - 1, bot, T["stone"])
        c.rect(ax + w + 1, top + w // 2, ax + w + 4, bot, T["stone"])
        # statue/skull silhouette in alcove
        c.ellipse(ax + w // 2 - 7, bot - 44, ax + w // 2 + 7, bot - 30, mix(T["recess"], T["stone_d"], 0.8))
        c.rect(ax + w // 2 - 9, bot - 30, ax + w // 2 + 9, bot - 4, mix(T["recess"], T["stone_d"], 0.7))
        c.px(ax + w // 2 - 3, bot - 38, T["glow"])
        c.px(ax + w // 2 + 2, bot - 38, T["glow"])
    # chains
    for cx in (110, 236):
        for y in range(0, 70, 4):
            c.ellipse(cx - 1, y, cx + 1, y + 4, None, outline=shade(T["stone_l"], 0.7))
    # floor shadow + optional lava glow
    for i in range(30):
        c.rect(0, H - 30 + i, W - 1, H - 30 + i, rgba(T["mortar"], 60 + i * 6))
    if T["lava"]:
        for i in range(24):
            c.rect(0, H - 24 + i, W - 1, H - 24 + i, rgba(T["lava"], i * 4))
    # top vignette
    for i in range(40):
        c.rect(0, i, W - 1, i, rgba("#000000", 200 - i * 5))
    return c.im


def dungeon_mid(theme):
    T = THEMES[theme]
    W, H = 256, 200
    c = Canvas(W, H)
    rnd = random.Random(21)
    for px_ in (18, 146):
        pw = 30
        # shaft
        c.rect(px_, 0, px_ + pw, H - 1, T["stone"])
        c.rect(px_, 0, px_ + 5, H - 1, T["stone_d"])
        c.rect(px_ + pw - 4, 0, px_ + pw, H - 1, shade(T["stone"], 0.8))
        for fx in (px_ + 10, px_ + 16, px_ + 22):
            c.rect(fx, 18, fx, H - 22, shade(T["stone"], 0.75))
            c.rect(fx + 1, 18, fx + 1, H - 22, T["stone_l"])
        # capital + base
        c.rect(px_ - 5, 8, px_ + pw + 5, 17, T["stone_l"])
        c.rect(px_ - 5, 15, px_ + pw + 5, 17, T["stone_d"])
        c.rect(px_ - 6, H - 20, px_ + pw + 6, H - 1, T["stone_l"])
        c.rect(px_ - 6, H - 14, px_ + pw + 6, H - 1, T["stone"])
        # cracks and moss
        for _ in range(3):
            x = px_ + rnd.randint(4, pw - 4)
            y = rnd.randint(30, H - 40)
            c.line([(x, y), (x + rnd.randint(-3, 3), y + 6), (x + rnd.randint(-3, 3), y + 12)], T["stone_d"])
        for _ in range(14):
            x = px_ + rnd.randint(0, pw)
            y = rnd.randint(H - 36, H - 20)
            c.px(x, y, T["moss"])
        # banner
        bx = px_ + 7
        c.rect(bx - 2, 30, bx + 18, 31, "#5a4a3a")
        c.poly([(bx, 32), (bx + 16, 32), (bx + 16, 78), (bx + 8, 70), (bx, 78)], T["banner"])
        c.poly([(bx, 32), (bx + 4, 32), (bx + 4, 74), (bx, 78)], shade(T["banner"], 0.7))
        c.ellipse(bx + 4, 44, bx + 12, 52, "#d8b04a")
        c.rect(bx + 7, 46, bx + 9, 50, T["banner"])
    # broken arch between pillars
    c.arc((48, -40, 146, 50), 0, 180, T["stone"], 7)
    c.arc((48, -40, 146, 50), 20, 160, T["stone_l"], 2)
    return outline(c.im, (8, 8, 12, 255))


def ground_tile(theme):
    T = THEMES.get(theme)
    c = Canvas(32, 32)
    rnd = random.Random(31)
    if theme == "pueblo":
        c.rect(0, 0, 31, 31, "#2a2420")
        for row, y in enumerate((1, 8, 15, 22)):
            off = 4 if row % 2 else 0
            for x in range(-8 + off, 32, 8):
                col = shade("#6e665a", rnd.uniform(0.75, 1.05) * (1 - row * 0.15))
                c.ellipse(x + 1, y, x + 7, y + 5, col)
                c.px(x + 3, y + 1, shade(col, 1.25))
        c.rect(0, 0, 31, 0, "#8a8272")
        return c.im
    c.rect(0, 0, 31, 31, T["fill"])
    # flagstones
    for x0, x1 in ((0, 12), (13, 24), (25, 31)):
        c.rect(x0, 0, x1, 9, T["slab"])
        c.rect(x0, 0, x1, 1, T["slab_l"])
        c.rect(x0, 8, x1, 9, shade(T["slab"], 0.7))
        c.px(x0 + 2, 4, shade(T["slab"], 1.15))
    c.rect(12, 0, 12, 9, T["mortar"])
    c.rect(24, 0, 24, 9, T["mortar"])
    # lower blocks
    for y, off in ((11, 0), (21, 8)):
        for x in range(-16 + off, 32, 16):
            col = shade(T["stone_d"], rnd.uniform(0.85, 1.1) * (1.0 if y == 11 else 0.8))
            c.rect(x + 1, y, x + 15, y + 8, col)
            c.rect(x + 1, y, x + 15, y, shade(col, 1.2))
    return c.im


def fill_tile(theme):
    col = "#1a1512" if theme == "pueblo" else THEMES[theme]["fill"]
    c = Canvas(32, 32)
    c.rect(0, 0, 31, 31, col)
    rnd = random.Random(41)
    for _ in range(10):
        x, y = rnd.randint(0, 29), rnd.randint(0, 29)
        c.rect(x, y, x + 2, y, shade(col, 1.06))
    return c.im


def platform_tile(theme):
    if theme == "pueblo":
        top, body, dark = "#8a6a44", "#6a4a2a", "#3a2614"
    else:
        T = THEMES[theme]
        top, body, dark = T["slab_l"], T["slab"], T["stone_d"]
    c = Canvas(32, 10)
    c.rect(0, 0, 31, 6, body)
    c.rect(0, 0, 31, 1, top)
    c.rect(0, 6, 31, 7, dark)
    c.rect(15, 1, 15, 5, dark)
    c.rect(31, 1, 31, 5, dark)
    c.poly([(4, 8), (10, 8), (7, 10)], dark)
    c.poly([(20, 8), (26, 8), (23, 10)], dark)
    return c.im


def wall_tile(theme):
    T = THEMES[theme]
    c = Canvas(32, 32)
    c.rect(0, 0, 31, 31, T["mortar"])
    for y, off in ((0, 0), (8, 8), (16, 0), (24, 8)):
        for x in range(-16 + off, 32, 16):
            c.rect(x + 1, y + 1, x + 15, y + 7, T["stone"])
            c.rect(x + 1, y + 1, x + 15, y + 1, T["stone_l"])
    return c.im


def gate_frames(theme):
    T = THEMES[theme]
    frames = {}

    def base(bars_up=None, runes=0):
        c = Canvas(28, 92)
        if bars_up is not None:
            for bx in range(6, 23, 4):
                y0 = 10 - bars_up
                c.rect(bx, max(8, y0), bx + 1, 88 - bars_up, "#4a4e5a")
                c.px(bx, max(8, y0), "#8a90a0")
                c.poly([(bx - 1, 88 - bars_up), (bx + 2, 88 - bars_up), (bx + 0.5, 91 - bars_up)], "#6a707e")
            for cy in (30, 60):
                yy = cy - bars_up
                if yy > 8:
                    c.rect(5, yy, 23, yy + 1, "#3a3e48")
            if runes:
                col = "#b070ff" if theme == "mazmorra" else "#ff7a3a"
                for cy in (20, 45, 70):
                    yy = cy - bars_up
                    if yy > 10:
                        c.rect(12, yy, 15, yy + 3, mix(col, "#ffffff", 0.3 * (runes - 1)))
        c.rect(0, 0, 4, 91, T["stone"])
        c.rect(24, 0, 27, 91, T["stone"])
        c.rect(0, 0, 1, 91, T["stone_l"])
        c.rect(0, 0, 27, 7, T["stone_l"])
        c.rect(0, 5, 27, 7, T["stone_d"])
        return outline(c.im)

    frames["Cerrada"] = [base(0, 1), base(0, 2)]
    frames["Abriendo"] = [base(u, 1) for u in (16, 36, 56, 76)]
    frames["Abierta"] = [base(None)]
    return frames


def torch_frames():
    out = []
    for f in range(3):
        c = Canvas(40, 48)
        # glow halo
        for r in range(18, 0, -2):
            a = int(70 * (1 - r / 18) ** 1.5) + 8
            c.ellipse(20 - r, 16 - r + f % 2, 20 + r, 16 + r + f % 2, rgba("#ff9a3a", a))
        c.rect(18, 22, 21, 34, "#5a3a22")
        c.rect(16, 21, 23, 23, "#3a3e48")
        c.rect(19, 34, 20, 38, "#3a3e48")
        fl = [(0, 0), (1, -1), (-1, 1)][f]
        c.poly([(16, 21), (24, 21), (21 + fl[0], 10 + fl[1]), (19, 14)], "#ff7a2a")
        c.poly([(18, 21), (22, 21), (20 + fl[0], 13 + fl[1])], "#ffd35a")
        c.px(20, 19, "#fff6c8")
        out.append(c.im)
    return out


def banner_frames(color="#8a1e24"):
    out = []
    for f in range(2):
        c = Canvas(20, 44)
        c.rect(0, 1, 19, 2, "#6a5a3a")
        sway = f
        c.poly([(2, 3), (17, 3), (17 + sway, 40), (10, 34), (2 + sway, 40)], color)
        c.poly([(2, 3), (5, 3), (5 + sway, 37), (2 + sway, 40)], shade(color, 0.7))
        c.ellipse(6, 12, 14, 20, "#d8b04a")
        c.poly([(10, 13), (12, 18), (8, 18)], color)
        out.append(outline(c.im))
    return out


def skull_pile():
    c = Canvas(26, 14)
    for x, y in ((2, 6), (9, 7), (16, 6), (6, 1), (13, 2)):
        c.ellipse(x, y, x + 7, y + 7, "#d8d0bc")
        c.rect(x + 2, y + 3, x + 3, y + 4, "#1a1410")
        c.rect(x + 5, y + 3, x + 5, y + 4, "#1a1410")
    return outline(c.im)


def candles_frames():
    out = []
    for f in range(2):
        c = Canvas(18, 18)
        for i, (x, h) in enumerate(((3, 8), (8, 11), (13, 6))):
            c.rect(x, 17 - h, x + 2, 17, "#e8dcc0")
            c.px(x + 1, 16 - h - (f + i) % 2, "#ffcf4a")
            c.px(x + 1, 15 - h - (f + i) % 2, "#fff4c0")
        out.append(outline(c.im))
    return out


def barrel():
    c = Canvas(18, 22)
    c.ellipse(1, 1, 16, 21, "#6a4526")
    c.rect(1, 5, 16, 6, "#3a3e48")
    c.rect(1, 15, 16, 16, "#3a3e48")
    c.rect(4, 2, 5, 20, "#7e5530")
    return outline(c.im)


def crate():
    c = Canvas(20, 20)
    c.rect(1, 1, 18, 18, "#7a5530")
    c.rect(1, 1, 18, 2, "#9a7040")
    c.line([(2, 3), (17, 17)], "#4a3018", 2)
    c.rect(1, 1, 18, 18, None) if False else None
    return outline(c.im)


def portal_arch_frames(kind):
    out = []
    col, col2 = ("#80d8ff", "#1a3a6a") if kind == "salida" else ("#c070ff", "#2a0f40")
    for f in range(4):
        c = Canvas(52, 76)
        c.ellipse(8, 8, 44, 74, col2)
        for i in range(4):
            k = 1 - i * 0.2
            a0 = f * 45 + i * 80
            c.arc((26 - 16 * k, 41 - 31 * k, 26 + 16 * k, 41 + 31 * k), a0, a0 + 160, mix(col, "#ffffff", 0.2 * i), 2)
        c.ellipse(22, 36, 30, 46, mix(col, "#ffffff", 0.6))
        # stone arch
        c.arc((2, 2, 50, 80), 180, 360, "#5a5a6a", 6)
        c.rect(2, 40, 7, 75, "#5a5a6a")
        c.rect(45, 40, 50, 75, "#5a5a6a")
        c.rect(0, 70, 52, 75, "#3a3a48")
        for y in (46, 58):
            c.rect(2, y, 7, y, "#3a3a48")
            c.rect(45, y, 50, y, "#3a3a48")
        c.rect(23, 0, 29, 6, "#7a7a8a")
        c.px(26, 3, col)
        out.append(outline(c.im))
    return out


# ---------------------------------------------------------------------------
# Town


def town_sky():
    W, H = 512, 240
    c = Canvas(W, H)
    rnd = random.Random(51)
    dither_gradient(c, 0, 0, W - 1, 150, "#0b0c26", "#4a2a5a", 12)
    dither_gradient(c, 0, 150, W - 1, H - 1, "#4a2a5a", "#c86a4a", 6)
    for _ in range(90):
        x, y = rnd.randint(0, W - 1), rnd.randint(0, 120)
        c.px(x, y, "#ffffff" if rnd.random() < 0.3 else "#a8a8d8")
    c.ellipse(356, 14, 434, 92, mix("#1a1840", "#f2e6c8", 0.07))
    c.ellipse(364, 22, 426, 84, mix("#1c1a44", "#f2e6c8", 0.14))
    c.ellipse(372, 30, 418, 76, "#f2e6c8")
    c.ellipse(380, 38, 392, 50, "#d8ccae")
    c.ellipse(398, 54, 406, 62, "#d8ccae")
    # mountains
    pts = [(0, 190)]
    for x in range(0, W + 1, 16):
        pts.append((x, 150 + 25 * math.sin(x * 0.021) + 12 * math.sin(x * 0.07)))
    pts += [(W, H), (0, H)]
    c.poly(pts, "#2a1d3e")
    pts2 = [(0, 200)] + [(x, 180 + 14 * math.sin(x * 0.03 + 1) + 6 * math.sin(x * 0.11)) for x in range(0, W + 1, 8)] + [(W, H), (0, H)]
    c.poly(pts2, "#1c142a")
    # castle on a hill
    cx = 120
    c.ellipse(cx - 60, 170, cx + 60, 230, "#1c142a")
    for tx, tw, th in ((cx - 30, 10, 50), (cx - 14, 14, 70), (cx + 6, 10, 56), (cx + 22, 8, 40)):
        c.rect(tx, 180 - th, tx + tw, 190, "#140e20")
        c.poly([(tx - 2, 180 - th), (tx + tw + 2, 180 - th), (tx + tw // 2, 180 - th - 12)], "#140e20")
        c.px(tx + tw // 2, 190 - th + 14, "#ffcf6a")
    c.rect(cx - 30, 160, cx + 30, 190, "#140e20")
    for wx in (cx - 20, cx - 4, cx + 12):
        c.px(wx, 172, "#ffcf6a")
    return c.im


def town_houses():
    W, H = 320, 170
    c = Canvas(W, H)
    rnd = random.Random(61)

    def house(x, w, h, roof, wall="#c8b89a"):
        base_y = H
        c.rect(x, base_y - h, x + w, base_y - 1, wall)
        c.rect(x, base_y - 14, x + w, base_y - 1, "#6a6258")
        for bx in range(x, x + w, 12):  # timber beams
            c.rect(bx, base_y - h, bx + 1, base_y - 14, "#4a3222")
        c.rect(x, base_y - h, x + w, base_y - h + 1, "#4a3222")
        c.rect(x, base_y - h // 2, x + w, base_y - h // 2 + 1, "#4a3222")
        c.poly([(x - 6, base_y - h), (x + w + 6, base_y - h), (x + w // 2, base_y - h - w // 2 - 6)], roof)
        c.poly([(x - 6, base_y - h), (x + w // 2, base_y - h - w // 2 - 6), (x + w // 2, base_y - h)], shade(roof, 0.75))
        for ry in range(base_y - h - w // 2, base_y - h, 4):
            c.line([(x + w // 2 - (ry - (base_y - h - w // 2 - 6)), ry), (x + w // 2 + (ry - (base_y - h - w // 2 - 6)), ry)], shade(roof, 0.6))
        # windows
        for wx in range(x + 6, x + w - 8, 14):
            wy = base_y - h + 8
            for gy, ga in ((wy - 3, 40), (wy - 2, 60)):
                pass
            c.rect(wx - 2, wy - 2, wx + 9, wy + 10, rgba("#ffb84a", 50))
            c.rect(wx, wy, wx + 7, wy + 8, "#ffcf6a")
            c.rect(wx + 3, wy, wx + 4, wy + 8, "#4a3222")
            c.rect(wx, wy + 4, wx + 7, wy + 4, "#4a3222")
        c.rect(x + w // 2 - 5, base_y - 30, x + w // 2 + 5, base_y - 1, "#3a2414")
        c.px(x + w // 2 + 3, base_y - 16, "#d8b04a")
        # chimney
        c.rect(x + w - 16, base_y - h - w // 3 - 10, x + w - 10, base_y - h - w // 4, "#5a4a44")

    house(10, 70, 70, "#7a2a2a")
    house(110, 80, 84, "#34465a")
    house(222, 64, 64, "#5a3a2a")
    # fences / bushes
    for x in range(88, 106, 4):
        c.rect(x, H - 16, x + 1, H - 1, "#4a3222")
    c.rect(86, H - 12, 106, H - 11, "#4a3222")
    for x in (200, 300):
        c.ellipse(x - 10, H - 20, x + 10, H + 4, "#1e3a2a")
        c.ellipse(x - 6, H - 24, x + 6, H - 8, "#2a4a34")
    return outline(c.im, (10, 8, 14, 255))


def lamp_frames():
    out = []
    for f in range(2):
        c = Canvas(40, 64)
        for r in range(16, 0, -2):
            a = int(60 * (1 - r / 16) ** 1.4) + 6 + f * 4
            c.ellipse(20 - r, 12 - r, 20 + r, 12 + r, rgba("#ffc85a", a))
        c.rect(19, 18, 21, 63, "#2a2a32")
        c.rect(16, 60, 24, 63, "#2a2a32")
        c.rect(15, 6, 25, 18, "#2a2a32")
        c.rect(17, 8, 23, 16, "#ffd06a" if f else "#ffc04a")
        c.poly([(14, 6), (26, 6), (20, 1)], "#2a2a32")
        out.append(c.im)
    return out


def forge_frames():
    out = []
    for f in range(3):
        c = Canvas(56, 40)
        c.rect(2, 14, 26, 39, "#4a4448")
        c.rect(2, 14, 26, 16, "#6a646a")
        c.rect(6, 18, 22, 30, "#1a1010")
        fl = [(0, 0), (1, -2), (-1, -1)][f]
        c.poly([(7, 30), (21, 30), (15 + fl[0], 20 + fl[1]), (11, 23)], "#ff6a2a")
        c.poly([(10, 30), (18, 30), (14 + fl[0], 24 + fl[1])], "#ffd35a")
        c.rect(8, 0, 20, 14, "#3a3438")
        # anvil
        c.poly([(30, 22), (52, 22), (54, 26), (48, 26), (46, 30), (36, 30), (34, 26), (30, 26)], "#4a4e5a")
        c.rect(30, 22, 52, 23, "#8a90a0")
        c.rect(38, 30, 44, 36, "#3a3e48")
        c.rect(34, 36, 48, 39, "#3a3e48")
        out.append(outline(c.im))
    return out


def potion_stand():
    c = Canvas(44, 36)
    c.rect(2, 20, 41, 23, "#6a4526")
    c.rect(4, 23, 6, 35, "#4a2e18")
    c.rect(37, 23, 39, 35, "#4a2e18")
    for i, col in enumerate(("#ff4a6a", "#4a8aff", "#7dff9a", "#ffcf4a", "#c46bff")):
        x = 5 + i * 7
        c.rect(x, 12, x + 4, 19, "#bfe8ff")
        c.rect(x, 15, x + 4, 19, col)
        c.px(x + 2, 11, "#8a6040")
    c.rect(0, 0, 43, 3, "#7a2a4a")
    c.rect(0, 3, 43, 4, "#5a1a34")
    c.rect(1, 4, 2, 20, "#4a2e18")
    c.rect(41, 4, 42, 20, "#4a2e18")
    return outline(c.im)


def well():
    c = Canvas(34, 38)
    c.rect(2, 22, 31, 37, "#6a6258")
    for y in (26, 32):
        for x in range(2, 32, 6):
            c.rect(x, y, x + 4, y + 3, "#8a8272")
    c.rect(4, 6, 6, 22, "#4a3222")
    c.rect(27, 6, 29, 22, "#4a3222")
    c.poly([(0, 8), (33, 8), (16, 0)], "#7a2a2a")
    c.rect(14, 10, 18, 16, "#6a4526")
    return outline(c.im)


def signpost():
    c = Canvas(24, 32)
    c.rect(11, 8, 13, 31, "#4a3222")
    c.poly([(2, 4), (20, 4), (23, 8), (20, 12), (2, 12)], "#8a6a44")
    c.rect(5, 7, 16, 8, "#4a3222")
    return outline(c.im)


def dead_tree():
    c = Canvas(56, 72)
    c.poly([(24, 71), (32, 71), (30, 40), (27, 40)], "#2a2024")
    for (x0, y0, x1, y1) in ((28, 44, 12, 22), (29, 40, 44, 16), (20, 30, 10, 12), (38, 26, 50, 20), (28, 50, 40, 36), (14, 24, 4, 20)):
        c.line([(x0, y0), (x1, y1)], "#2a2024", 3 if y0 > 35 else 2)
    return outline(c.im, (10, 8, 12, 255))


def title_background():
    W, H = 430, 240
    c = Canvas(W, H)
    rnd = random.Random(71)
    dither_gradient(c, 0, 0, W - 1, 140, "#07060e", "#3a1420", 12)
    dither_gradient(c, 0, 140, W - 1, H - 1, "#3a1420", "#8a3020", 6)
    for _ in range(70):
        c.px(rnd.randint(0, W - 1), rnd.randint(0, 110), "#8a7aa0")
    c.ellipse(300, 26, 344, 70, "#e8c8a8")
    c.ellipse(308, 30, 346, 66, "#2a1018")
    pts = [(0, 200)] + [(x, 160 + 20 * math.sin(x * 0.02) + 10 * math.sin(x * 0.09)) for x in range(0, W + 1, 8)] + [(W, H), (0, H)]
    c.poly(pts, "#1a0a12")
    # ruined gate
    gx = W // 2
    c.rect(gx - 60, 90, gx - 38, 220, "#140810")
    c.rect(gx + 38, 90, gx + 60, 220, "#140810")
    c.arc((gx - 60, 50, gx + 60, 170), 180, 330, "#140810", 20)
    c.ellipse(gx - 36, 100, gx + 36, 230, "#ff7a2a")
    c.ellipse(gx - 28, 110, gx + 28, 230, "#ffc06a")
    c.ellipse(gx - 16, 130, gx + 16, 230, "#fff0c0")
    for i in range(8):
        c.ellipse(gx - 40 - i * 4, 96 - i * 4, gx + 40 + i * 4, 234 + i * 2, None, outline=rgba("#ff7a2a", 40 - i * 5), width=2)
    c.rect(0, 216, W - 1, H - 1, "#0c050a")
    for x in range(0, W, 3):
        c.rect(x, 212 + rnd.randint(0, 4), x + 2, 216, "#0c050a")
    # hero silhouette in front of gate
    c.rect(gx - 4, 188, gx + 4, 214, "#0c050a")
    c.ellipse(gx - 5, 178, gx + 5, 190, "#0c050a")
    c.line([(gx + 5, 196), (gx + 18, 170)], "#0c050a", 2)
    c.poly([(gx - 4, 190), (gx - 14, 214), (gx - 2, 212)], "#0c050a")
    # embers
    for _ in range(60):
        x, y = rnd.randint(0, W - 1), rnd.randint(60, 214)
        c.px(x, y, rnd.choice(["#ff7a2a", "#ffc06a", "#ff4a1a"]))
    return c.im
