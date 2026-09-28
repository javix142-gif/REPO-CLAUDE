"""HUD, touch controls, panels, icons and logo (art resolution)."""
from __future__ import annotations

import math
from PIL import Image, ImageDraw, ImageFont

from .pixel import Canvas, rgba, shade, mix, outline

GOLD, GOLD_D, IRON, IRON_D = "#d8b04a", "#8a6a2a", "#4a5264", "#262b36"


def ring_button(size, accent, fill="#1b2130", alpha=235):
    c = Canvas(size, size)
    r = size / 2 - 1
    c.ellipse(1, 1, size - 2, size - 2, rgba(IRON_D, alpha))
    c.ellipse(2, 2, size - 3, size - 3, rgba(IRON, alpha))
    c.ellipse(4, 4, size - 5, size - 5, rgba(fill, alpha))
    c.ellipse(4, 4, size - 5, size - 5, None, outline=accent, width=1)
    c.arc((5, 5, size - 6, size - 6), 200, 320, rgba("#ffffff", 70), 1)
    return c


def icon(kind, cls=None, size=24):
    c = Canvas(size, size)
    m = size // 2
    if kind == "sword":
        c.line([(5, size - 6), (size - 5, 5)], "#e8eef4", 3)
        c.line([(6, size - 4), (size - 4, 7)], "#8f9aab")
        c.line([(3, size - 10), (10, size - 3)], GOLD, 3)
        c.line([(2, size - 2), (5, size - 5)], "#7a4a24", 3)
    elif kind == "staff":
        c.line([(5, size - 3), (size - 8, 8)], "#8b5a2b", 3)
        c.ellipse(size - 13, 2, size - 3, 12, "#ff9a3c")
        c.ellipse(size - 11, 4, size - 7, 8, "#fff0a8")
    elif kind == "bow":
        c.arc((3, 2, size - 7, size - 2), 280, 80, "#b07a40", 3)
        c.line([(m + 1, 3), (m + 1, size - 3)], "#efe6cf")
        c.line([(4, m), (size - 3, m)], "#d8c7a0", 1)
        c.poly([(size - 5, m - 2), (size - 2, m), (size - 5, m + 2)], "#e8eef4")
    elif kind == "whirl":
        c.arc((3, 5, size - 3, size - 5), 20, 300, "#ffd35a", 3)
        c.arc((7, 8, size - 7, size - 8), 200, 470, "#fff4c8", 2)
        c.line([(m - 2, 4), (m + 4, size - 4)], "#e8eef4", 2)
    elif kind == "charge":
        for i, y in enumerate((7, 12, 17)):
            c.line([(3 + i * 2, y), (size - 8, y)], mix("#ffd35a", "#ffffff", i * 0.3), 2)
        c.poly([(size - 9, 4), (size - 2, m), (size - 9, size - 4)], "#e8eef4")
    elif kind == "cry":
        c.ellipse(5, 5, size - 5, size - 5, None, outline="#ff5a3a", width=2)
        c.ellipse(9, 9, size - 9, size - 9, None, outline="#ffd35a", width=2)
        c.rect(m - 1, 3, m + 1, size - 3, "#ffffff")
    elif kind == "nova":
        for i in range(8):
            a = i / 8 * 2 * math.pi
            c.line([(m + 3 * math.cos(a), m + 3 * math.sin(a)), (m + 10 * math.cos(a), m + 10 * math.sin(a))], "#bff0ff", 2)
        c.ellipse(m - 3, m - 3, m + 3, m + 3, "#ffffff")
    elif kind == "meteor":
        c.line([(3, 3), (m, m)], "#ffcf6a", 3)
        c.ellipse(m - 3, m - 3, size - 3, size - 3, "#b85a2a")
        c.ellipse(m, m, size - 6, size - 6, "#ffd06a")
    elif kind == "barrier":
        c.poly([(m, 2), (size - 4, 6), (size - 5, 15), (m, size - 2), (5, 15), (4, 6)], "#6ac8ff")
        c.poly([(m, 5), (size - 7, 8), (size - 8, 14), (m, size - 6)], "#bff0ff")
    elif kind == "triple":
        for dy in (-6, 0, 6):
            c.line([(3, m + dy * 0.4), (size - 4, m + dy)], "#d8c7a0", 1)
            c.px(size - 4, m + dy, "#ffffff")
            c.px(size - 5, m + dy, "#e8eef4")
    elif kind == "rain":
        for x in (5, 11, 17):
            c.line([(x, 3), (x + 2, size - 5)], "#d8c7a0")
            c.poly([(x, size - 6), (x + 4, size - 6), (x + 2, size - 2)], "#e8eef4")
    elif kind == "shadow":
        c.poly([(4, m), (m, 4), (m, 9), (size - 4, 9), (size - 4, size - 9), (m, size - 9), (m, size - 4)], "#9dfc7a")
        c.poly([(8, m), (m, 8), (m, size - 8)], "#e0ffd0")
    elif kind == "jump":
        c.poly([(m, 3), (size - 4, m + 2), (m + 4, m + 2), (m + 4, size - 3), (m - 4, size - 3), (m - 4, m + 2), (4, m + 2)], "#8ae8d0")
    elif kind == "potion":
        c.rect(m - 2, 2, m + 2, 6, "#8a6040")
        c.rect(m - 3, 6, m + 3, 8, "#cfe8ff")
        c.ellipse(4, 7, size - 4, size - 2, "#cfe8ff")
        c.ellipse(5, 10, size - 5, size - 3, "#e8384a")
        c.px(m - 3, 12, "#ffb0b8")
    elif kind == "pause":
        c.rect(6, 5, 9, size - 6, "#e8e0d0")
        c.rect(size - 10, 5, size - 7, size - 6, "#e8e0d0")
    elif kind == "talk":
        c.ellipse(3, 3, size - 3, size - 7, "#e8e0d0")
        c.poly([(7, size - 9), (6, size - 2), (12, size - 8)], "#e8e0d0")
        c.rect(m - 1, 6, m + 1, m + 1, "#2a2030")
        c.rect(m - 1, m + 3, m + 1, m + 4, "#2a2030")
    elif kind == "coin":
        c.ellipse(2, 2, size - 3, size - 3, "#ffcc3a")
        c.ellipse(4, 4, size - 5, size - 5, "#ffe68a")
        c.rect(m - 1, 5, m, size - 6, "#d49a1a")
    elif kind == "lock":
        c.arc((6, 2, size - 6, 14), 180, 360, "#b8b0a0", 2)
        c.rect(4, 10, size - 5, size - 3, "#b8b0a0")
        c.rect(m - 1, 13, m, 17, "#2a2030")
    elif kind == "skull":
        c.ellipse(3, 2, size - 3, size - 5, "#e6e0cc")
        c.rect(7, size - 7, size - 7, size - 3, "#e6e0cc")
        c.rect(7, 9, 9, 11, "#1a1410")
        c.rect(size - 10, 9, size - 8, 11, "#1a1410")
    elif kind == "left":
        c.poly([(size - 6, 3), (5, m), (size - 6, size - 3)], GOLD)
    elif kind == "right":
        c.poly([(6, 3), (size - 5, m), (6, size - 3)], GOLD)
    elif kind == "close":
        c.line([(5, 5), (size - 6, size - 6)], "#e8e0d0", 3)
        c.line([(5, size - 6), (size - 6, 5)], "#e8e0d0", 3)
    elif kind == "star":
        pts = []
        for i in range(10):
            r = (size / 2 - 2) if i % 2 == 0 else (size / 4)
            a = -math.pi / 2 + i * math.pi / 5
            pts.append((m + r * math.cos(a), m + r * math.sin(a)))
        c.poly(pts, "#ffd35a")
    return outline(c.im)


CLASS_ICONS = {
    "Guerrero": ("sword", ["whirl", "charge", "cry"], "#e0b24c"),
    "Maga": ("staff", ["nova", "meteor", "barrier"], "#ff9a3c"),
    "Arquera": ("bow", ["triple", "rain", "shadow"], "#9dfc7a"),
}


def attack_button(cls):
    main, _, acc = CLASS_ICONS[cls]
    b = ring_button(50, GOLD)
    ic = icon(main, size=28)
    b.paste(ic, 11, 11)
    return b.im


def skill_button(cls, slot):
    _, skills, acc = CLASS_ICONS[cls]
    b = ring_button(36, acc)
    ic = icon(skills[slot], size=24)
    b.paste(ic, 6, 6)
    return b.im


def simple_button(kind, size=32, accent="#8ae8d0"):
    b = ring_button(size, accent)
    ic = icon(kind, size=size - 12)
    b.paste(ic, 6, 6)
    return b.im


def cooldown_frames(size=36, n=16):
    out = []
    for i in range(n + 1):
        c = Canvas(size, size)
        frac = i / n  # remaining fraction
        if frac > 0:
            c.d.pieslice((4, 4, size - 5, size - 5), -90, -90 + 360 * frac, fill=(8, 10, 16, 175))
        out.append(c.im)
    return out  # frame 0 = empty, frame n = full


def joystick_border():
    c = Canvas(64, 64)
    c.ellipse(1, 1, 62, 62, rgba("#0e121c", 120))
    c.ellipse(1, 1, 62, 62, None, outline=rgba("#8a93a8", 190), width=2)
    c.ellipse(9, 9, 54, 54, None, outline=rgba("#4a5570", 150), width=1)
    for a in range(4):
        ang = a * math.pi / 2
        x, y = 32 + 26 * math.cos(ang), 32 + 26 * math.sin(ang)
        c.poly([(x + 3 * math.cos(ang), y + 3 * math.sin(ang)),
                (x - 2 * math.cos(ang) + 3 * math.sin(ang), y - 2 * math.sin(ang) - 3 * math.cos(ang)),
                (x - 2 * math.cos(ang) - 3 * math.sin(ang), y - 2 * math.sin(ang) + 3 * math.cos(ang))], rgba("#b8c0d0", 200))
    return c.im


def joystick_thumb():
    c = Canvas(26, 26)
    c.ellipse(1, 1, 24, 24, rgba(IRON_D, 230))
    c.ellipse(2, 2, 23, 23, rgba("#6a7488", 240))
    c.ellipse(5, 5, 20, 20, rgba("#8a94a8", 240))
    c.arc((5, 4, 20, 19), 200, 320, "#d8dee8", 1)
    return c.im


def hud_frame():
    c = Canvas(134, 32)
    # portrait box
    c.rect(0, 0, 29, 29, IRON_D)
    c.rect(1, 1, 28, 28, "#10141c")
    c.rect(0, 0, 29, 0, GOLD)
    c.rect(0, 29, 29, 29, GOLD_D)
    c.rect(0, 0, 0, 29, GOLD)
    c.rect(29, 0, 29, 29, GOLD_D)
    # bars back plate
    c.rect(29, 2, 133, 26, rgba(IRON_D, 230))
    c.rect(29, 2, 133, 2, IRON)
    for y0, h in ((5, 7), (14, 5), (21, 3)):
        c.rect(32, y0, 131, y0 + h - 1, "#07090e")
    c.rect(133, 2, 133, 26, IRON)
    # level badge
    c.ellipse(19, 18, 33, 31, GOLD_D)
    c.ellipse(20, 19, 32, 30, "#2a1e10")
    return c.im


def bar_fill(w, h, top, bottom):
    c = Canvas(w, h)
    for y in range(h):
        c.rect(0, y, w - 1, y, mix(top, bottom, y / max(1, h - 1)))
    c.rect(0, 0, w - 1, 0, shade(top, 1.35))
    return c.im


def boss_bar_frame():
    c = Canvas(172, 14)
    c.rect(0, 1, 171, 12, IRON_D)
    c.rect(0, 1, 171, 1, IRON)
    c.rect(3, 4, 168, 10, "#07090e")
    c.rect(0, 0, 8, 13, GOLD_D)
    c.rect(163, 0, 171, 13, GOLD_D)
    return c.im


def panel_texture():
    c = Canvas(24, 24)
    c.rect(0, 0, 23, 23, "#0b0d14")
    c.rect(1, 1, 22, 22, "#171b27")
    c.rect(2, 2, 21, 21, "#1c2130")
    c.rect(1, 1, 22, 1, GOLD_D)
    c.rect(1, 22, 22, 22, shade(GOLD_D, 0.7))
    c.rect(1, 1, 1, 22, GOLD_D)
    c.rect(22, 1, 22, 22, shade(GOLD_D, 0.7))
    for x, y in ((1, 1), (19, 1), (1, 19), (19, 19)):
        c.rect(x, y, x + 3, y + 3, GOLD)
        c.px(x + 1, y + 1, "#fff0b0")
    return c.im


def menu_button_texture(fill="#2a3350", border=GOLD):
    c = Canvas(16, 16)
    c.rect(0, 0, 15, 15, "#0b0d14")
    c.rect(1, 1, 14, 14, border)
    c.rect(2, 2, 13, 13, fill)
    c.rect(2, 2, 13, 3, shade(fill, 1.3))
    c.rect(2, 12, 13, 13, shade(fill, 0.7))
    return c.im


def portrait(hero_img):
    """Crop the head region of a hero idle frame (48x44 art) into a 22x22 portrait."""
    head = hero_img.crop((13, 3, 35, 25))
    c = Canvas(22, 22)
    c.rect(0, 0, 21, 21, "#1c2130")
    c.im.alpha_composite(head)
    return c.im


def logo(font_path, text1="UMBRAL", text2="DE CENIZA"):
    f1 = ImageFont.truetype(font_path, 64)
    f2 = ImageFont.truetype(font_path, 34)
    W, H = 300, 104
    base = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(base)
    b1 = d.textbbox((0, 0), text1, font=f1)
    b2 = d.textbbox((0, 0), text2, font=f2)
    x1 = (W - (b1[2] - b1[0])) // 2 - b1[0]
    x2 = (W - (b2[2] - b2[0])) // 2 - b2[0]
    mask = Image.new("L", (W, H), 0)
    md = ImageDraw.Draw(mask)
    md.text((x1, 2 - b1[1]), text1, font=f1, fill=255)
    md.text((x2, 66 - b2[1]), text2, font=f2, fill=255)
    grad = Image.new("RGBA", (W, H))
    gp = grad.load()
    for y in range(H):
        t = (y % 64) / 64 if y < 64 else (y - 64) / 40
        col = mix("#fff0b0", "#ff5a1a", min(1, t * 1.3))
        for x in range(W):
            gp[x, y] = col
    txt = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    txt.paste(grad, (0, 0), mask)
    o = outline(txt, (40, 10, 8, 255), diagonal=True)
    o = outline(o, (10, 4, 4, 255))
    # side ornaments
    c = Canvas(W, H)
    c.im.alpha_composite(o)
    c.line([(20, 80), (70, 80)], GOLD_D, 1)
    c.line([(W - 70, 80), (W - 20, 80)], GOLD_D, 1)
    c.px(18, 80, GOLD)
    c.px(W - 18, 80, GOLD)
    return c.im


def app_icon(size):
    """Square app icon: ember gate + sword emblem (derived from the title art)."""
    from .env import title_background
    from PIL import Image as _Image
    bg = title_background()
    crop = bg.crop((95, 0, 335, 240))  # 240x240 around the glowing gate
    c = Canvas(48, 48)
    small = crop.resize((48, 48), _Image.Resampling.BOX)
    c.im.alpha_composite(small)
    sw = icon("sword", size=30)
    c.im.alpha_composite(sw, (9, 8))
    c.rect(0, 0, 47, 0, GOLD_D)
    c.rect(0, 47, 47, 47, GOLD_D)
    c.rect(0, 0, 0, 47, GOLD_D)
    c.rect(47, 0, 47, 47, GOLD_D)
    return c.im.resize((size, size), _Image.Resampling.NEAREST)
