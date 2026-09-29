"""Enemies, boss, NPCs and training dummy animation tables."""
from __future__ import annotations

import math
import random
from PIL import Image

from .pixel import Canvas, rgba, shade, mix, rot, outline
from .figures import P, draw_generic, finish

PALS = {
    "Esqueleto": dict(bone="#e6e0cc", bone_d="#a39a82", cloth="#5a3434", eye="#ff4a3a", blade="#c2beb2",
                      blade_d="#7a6e60", hilt="#5a3a22"),
    "Cultista": dict(robe="#7c2233", robe_d="#4a1120", trim="#d4a24a", eye="#ffe066", skin="#c9a896",
                     magic="#c46bff"),
    "Bruto": dict(skin="#6f7d5c", skin_d="#4b5740", cloth="#5b3a28", scar="#9a4a4a", eye="#ffdd55",
                  horn="#ddd4bb", wood="#6b4526", wood_d="#432a16"),
    "Jefe": dict(armor="#4b515f", armor_d="#2b2f39", armor_l="#8089a0", ember="#ff7a2a", cape="#3b1b1d",
                 horn="#d6ccb3", blade="#aab1bd"),
    "Arquero": dict(bone="#d6dcc0", bone_d="#8f9a78", cloth="#2f4a3a", eye="#6affd8", blade="#c2beb2", blade_d="#7a6e60", hilt="#5a3a22",
                    bow=True, wood="#7a5a34", wood_d="#4d3119", string="#efe6cf", feather="#f2efe6"),
    "Golem": dict(skin="#7d8291", skin_d="#4f5566", cloth="#3a3f4d", scar="#ff8a3a", eye="#ffb040", horn="#5a5f70", wood="#5a5f70", wood_d="#383c48"),
    "Coloso": dict(skin="#5d6a86", skin_d="#38415a", cloth="#242a3c", scar="#6ae8ff", eye="#b0f6ff", horn="#7fe8ff", wood="#4fb8d8", wood_d="#2a7a9a"),
    "Reina": dict(dress="#7a1424", dress_d="#440a14", cape="#2a0a16", trim="#e0b24a", skin="#e8d6d0", hair="#160c14", eye="#ff3a4a", glow="#ff4a5a"),
    "Archivista": dict(skin="#e6c8ac", hair="#c9c9d6", shirt="#5a4a70", robe="#4a3a66", trim="#d4b060", pants="#2a2a30", boots="#2a201a", potion="#000000",
                       book="#8a3a3a"),
    "Herrera": dict(skin="#d99a73", hair="#3a2a22", shirt="#7c6a58", apron="#4a3222", pants="#3a3430",
                    boots="#2a201a", wood="#6a4526"),
    "Alquimista": dict(skin="#e0b090", hair="#2a3a3a", shirt="#3a6a6a", robe="#2f5f66", trim="#d4b060",
                       pants="#2a2a30", boots="#2a201a", potion="#ff4a6a"),
}

# frame geometry per creature: (w, h, hx, hy, ground, k, style)
GEOM = {
    "Esqueleto": (40, 44, 20, 32, 41, 1.0, "skeleton"),
    "Cultista": (40, 44, 20, 32, 41, 1.0, "cultist"),
    "Bruto": (60, 56, 30, 40, 53, 1.5, "brute"),
    "Jefe": (110, 120, 55, 96, 117, 2.3, "knight"),
    "Arquero": (40, 44, 20, 32, 41, 1.0, "skeleton"),
    "Golem": (76, 72, 38, 51, 67, 1.9, "brute"),
    "Coloso": (104, 100, 52, 74, 96, 2.6, "brute"),
    "Reina": (110, 120, 55, 96, 117, 2.3, "queen"),
    "Archivista": (44, 44, 22, 32, 41, 1.0, "alchemist"),
    "Herrera": (44, 44, 22, 32, 41, 1.0, "smith"),
    "Alquimista": (44, 44, 22, 32, 41, 1.0, "alchemist"),
}


def walk_cycle(n=4, stride=3, **base):
    out = []
    for i in range(n):
        t = i / n * 2 * math.pi
        kw = dict(base)
        kw.update(bob=1 if i % 2 == 0 else 0, lean=base.get("lean", 1),
                  ff=(round(stride * math.sin(t)), max(0, round(2 * math.cos(t)))),
                  bf=(round(-stride * math.sin(t)), max(0, round(-2 * math.cos(t)))), cape=1 + i % 2)
        out.append(P(**kw))
    return out


def dissolve(im, amount, tint=None, seed=3):
    rnd = random.Random(seed)
    out = im.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if rnd.random() < amount:
                px[x, y] = (0, 0, 0, 0)
            elif tint is not None:
                t = rgba(tint)
                px[x, y] = (int(r + (t[0] - r) * amount), int(g + (t[1] - g) * amount), int(b + (t[2] - b) * amount), a)
    return out


def creature_frames(name):
    """Return {anim: [PIL images]} for a humanoid creature."""
    w, h, hx, hy, ground, k, style = GEOM[name]
    pal = PALS[name]

    def draw(p):
        return finish(draw_generic(style, pal, p, w, h, hx, hy, ground, k))

    def lying(p):
        c = draw_generic(style, pal, p, w, h, hx, hy, ground, k)
        return finish(c, lying=True, ground=ground)

    A = {}
    if name == "Esqueleto":
        A["Idle"] = [draw(P(fh=(3, 3), wang=-40)), draw(P(bob=1, fh=(3, 4), wang=-36))]
        A["Walk"] = [draw(p) for p in walk_cycle(fh=(3, 3), wang=-30)]
        A["Attack"] = [draw(P(lean=-1, fh=(-2, -3), wang=-140)), draw(P(lean=-1, fh=(-2, -4), wang=-150)),
                       draw(P(lean=2, fh=(4, 1), wang=10, ff=(4, 0), bf=(-3, 0))),
                       draw(P(lean=1, fh=(3, 3), wang=45, ff=(3, 0)))]
        A["Hurt"] = [draw(P(lean=-2, bob=1, fh=(0, 4), wang=60))]
        pile = bone_pile(w, h, ground, pal)
        A["Dead"] = [draw(P(bob=2, lean=-1, fh=(1, 5), wang=70)), draw(P(bob=4, lean=-2, fh=(0, 6), wang=85)), pile, pile]
    elif name == "Arquero":
        A["Idle"] = [draw(P(fh=(4, 2), bh=(-1, 4), wang=60)), draw(P(bob=1, fh=(4, 3), bh=(-1, 4), wang=60))]
        A["Walk"] = [draw(p) for p in walk_cycle(fh=(4, 2), wang=60)]
        A["Attack"] = [draw(P(fh=(5, -1), bh=(3, 0), wang=0, string=0, arrow=1, aim=0)),
                       draw(P(lean=-1, fh=(5, -1), bh=(0, 0), wang=0, string=3, arrow=1, aim=0, ff=(3, 0), bf=(-4, 0))),
                       draw(P(fh=(5, -1), bh=(-2, 1), wang=0, string=0, arrow=0, aim=0, ff=(3, 0), bf=(-4, 0))),
                       draw(P(fh=(4, 1), bh=(-1, 4), wang=60))]
        A["Hurt"] = [draw(P(lean=-2, bob=1, fh=(0, 4), wang=60))]
        pile = bone_pile(w, h, ground, pal)
        A["Dead"] = [draw(P(bob=2, lean=-1, fh=(1, 5), wang=60)), draw(P(bob=4, lean=-2, fh=(0, 6), wang=60)), pile, pile]
    elif name in ("Golem", "Coloso"):
        big = name == "Coloso"
        wa = 45 if big else 55
        A["Idle"] = [draw(P(fh=(3, 4), wang=wa)), draw(P(bob=1, fh=(3, 5), wang=wa + 3))]
        A["Walk"] = [draw(p) for p in walk_cycle(fh=(3, 4), wang=wa - 5, stride=2)]
        A["Attack"] = [draw(P(lean=-2, fh=(-2, -5), wang=-150)), draw(P(lean=-2, fh=(-3, -6), wang=-160, bob=-1)),
                       draw(P(lean=3, fh=(5, 2), wang=30, ff=(4, 0), bf=(-3, 0))),
                       draw(P(lean=3, fh=(5, 4), wang=75, ff=(4, 0), bf=(-3, 0), bob=1)),
                       draw(P(lean=1, fh=(3, 4), wang=60))]
        A["Hurt"] = [draw(P(lean=-2, bob=1, fh=(0, 5), wang=80))]
        A["Dead"] = [draw(P(bob=3, lean=-1, fh=(2, 6), wang=85)), draw(P(bob=5, lean=-2, fh=(1, 6), wang=90)),
                     lying(P(lean=-2, fh=(1, 6), wang=90)), dissolve(lying(P(lean=-2, fh=(1, 6), wang=90)), 0.6, pal["scar"], 8)]
        if big:
            A["Slam"] = [draw(P(lean=0, fh=(0, -8), bh=(0, -7), wang=-100)), draw(P(lean=0, fh=(0, -9), bh=(0, -8), wang=-105, bob=-3)),
                         draw(P(lean=3, fh=(4, 6), wang=80, bob=3, ff=(4, 0), bf=(-4, 0))), draw(P(lean=3, fh=(4, 6), wang=82, bob=3, ff=(4, 0), bf=(-4, 0))),
                         draw(P(lean=1, fh=(3, 4), wang=wa))]
            A["Sweep"] = [draw(P(lean=-3, fh=(-3, 1), wang=-170)), draw(P(lean=-3, fh=(-4, 1), wang=-175, bob=-1)),
                          draw(P(lean=3, fh=(6, 3), wang=10, ff=(5, 0), bf=(-4, 0))), draw(P(lean=3, fh=(6, 4), wang=40, ff=(5, 0), bf=(-4, 0))),
                          draw(P(lean=1, fh=(3, 4), wang=wa))]
            A["Cast"] = [draw(P(lean=0, fh=(1, -7), bh=(0, -6), wang=-95)), draw(P(lean=0, fh=(1, -9), bh=(0, -8), wang=-100, bob=-2)),
                         draw(P(lean=0, fh=(1, -9), bh=(0, -8), wang=-100, bob=-3))]
    elif name == "Reina":
        A["Idle"] = [draw(P(fh=(3, 3), wang=-15 - 5 * b, cape=cp, glow=g, bob=b)) for b, cp, g in ((0, 0, 0), (0, 1, 1), (1, 1, 1), (1, 0, 0))]
        A["Walk"] = [draw(p) for p in walk_cycle(fh=(3, 3), wang=-15, stride=1)]
        A["Cast"] = [draw(P(fh=(2, -3), wang=-80, glow=1, cape=1)), draw(P(fh=(2, -6), wang=-95, glow=2, cape=2, bob=-1)),
                     draw(P(fh=(4, -6), wang=-90, glow=3, cape=3, bob=-1)), draw(P(fh=(5, -2), wang=-40, glow=3, cape=2)),
                     draw(P(fh=(3, 2), wang=-15, glow=1, cape=1))]
        A["Slash"] = [draw(P(lean=-2, fh=(-2, -4), wang=-150, glow=1)), draw(P(lean=-2, fh=(-3, -5), wang=-165, glow=2)),
                      draw(P(lean=3, fh=(6, 0), wang=-15, ff=(4, 0), bf=(-3, 0), glow=3, cape=3)),
                      draw(P(lean=3, fh=(6, 3), wang=30, ff=(4, 0), bf=(-3, 0), glow=2)), draw(P(lean=1, fh=(3, 3), wang=-15))]
        A["Hurt"] = [draw(P(lean=-2, bob=1, fh=(0, 4), wang=30, cape=-2))]
        kneel = draw(P(bob=6, lean=1, fh=(4, 5), wang=60))
        A["Dead"] = [draw(P(bob=3, lean=-1, fh=(2, 5), wang=40)), kneel, kneel, dissolve(kneel, 0.45, "#ff4a5a", 5), dissolve(kneel, 0.9, "#ff4a5a", 6)]
    elif name == "Archivista":
        A["Idle"] = [draw(P(fh=(3, 2), bob=0)), draw(P(fh=(3, 2), bob=0)), draw(P(fh=(3, 3), bob=1)), draw(P(fh=(3, 3), bob=1))]
    elif name == "Cultista":
        A["Idle"] = [draw(P(fh=(2, 4), cape=0)), draw(P(fh=(2, 5), bob=1, cape=1))]
        A["Walk"] = [draw(p) for p in walk_cycle(fh=(2, 4))]
        A["Cast"] = [draw(P(fh=(2, -3), glow=1)), draw(P(fh=(3, -4), glow=2, bob=-1)),
                     draw(P(fh=(5, -1), glow=3, lean=1)), draw(P(fh=(3, 3), glow=0))]
        A["Hurt"] = [draw(P(lean=-2, bob=1, fh=(0, 4), cape=-2))]
        base = draw(P(lean=-2, bob=2, fh=(0, 4)))
        A["Dead"] = [dissolve(base, a, "#c46bff", seed=i) for i, a in enumerate((0.15, 0.4, 0.7, 0.95))]
    elif name == "Bruto":
        A["Idle"] = [draw(P(fh=(3, 4), wang=55)), draw(P(bob=1, fh=(3, 5), wang=58))]
        A["Walk"] = [draw(p) for p in walk_cycle(fh=(3, 4), wang=50, stride=2)]
        A["Attack"] = [draw(P(lean=-2, fh=(-2, -5), wang=-150)), draw(P(lean=-2, fh=(-3, -6), wang=-160, bob=-1)),
                       draw(P(lean=3, fh=(5, 2), wang=30, ff=(4, 0), bf=(-3, 0))),
                       draw(P(lean=3, fh=(5, 4), wang=75, ff=(4, 0), bf=(-3, 0), bob=1)),
                       draw(P(lean=1, fh=(3, 4), wang=60))]
        A["Hurt"] = [draw(P(lean=-2, bob=1, fh=(0, 5), wang=80))]
        A["Dead"] = [draw(P(bob=3, lean=-1, fh=(2, 6), wang=85)), draw(P(bob=5, lean=-2, fh=(1, 6), wang=90)),
                     lying(P(lean=-2, fh=(1, 6), wang=90)), lying(P(lean=-2, fh=(1, 6), wang=90))]
    elif name == "Jefe":
        A["Idle"] = [draw(P(fh=(3, 4), wang=75, bob=b, cape=cp, glow=g)) for b, cp, g in ((0, 0, 0), (0, 1, 1), (1, 1, 1), (1, 0, 0))]
        A["Walk"] = [draw(p) for p in walk_cycle(fh=(3, 4), wang=70, stride=3)]
        A["Slash"] = [draw(P(lean=-2, fh=(-2, -4), wang=-150, glow=1)), draw(P(lean=-2, fh=(-3, -5), wang=-160, glow=2)),
                      draw(P(lean=3, fh=(5, 0), wang=-5, ff=(5, 0), bf=(-4, 0), glow=3)),
                      draw(P(lean=3, fh=(5, 3), wang=50, ff=(5, 0), bf=(-4, 0), glow=2)),
                      draw(P(lean=1, fh=(3, 4), wang=70, glow=0))]
        A["Charge"] = [draw(P(lean=4, fh=(5, 1), wang=5, ff=(5, 0), bf=(-5, 1), cape=3 + i, glow=2, bob=1)) for i in range(3)]
        A["Slam"] = [draw(P(lean=0, fh=(0, -8), bh=(0, -7), wang=-95, glow=1)), draw(P(lean=0, fh=(0, -9), bh=(0, -8), wang=-100, glow=2, bob=-4, ff=(2, 3), bf=(-2, 3))),
                     draw(P(lean=3, fh=(4, 6), wang=80, glow=3, bob=3, ff=(4, 0), bf=(-4, 0))),
                     draw(P(lean=3, fh=(4, 6), wang=82, glow=2, bob=3, ff=(4, 0), bf=(-4, 0))),
                     draw(P(lean=1, fh=(3, 4), wang=75, glow=0, bob=1))]
        A["Summon"] = [draw(P(fh=(1, -7), bh=(0, -6), wang=-90, glow=g, cape=g)) for g in (1, 2, 3)]
        A["Hurt"] = [draw(P(lean=-2, bob=1, fh=(0, 5), wang=85, cape=-2))]
        kneel = draw(P(bob=6, lean=1, fh=(4, 5), wang=85, ff=(5, 0), bf=(-4, 0)))
        A["Dead"] = [draw(P(bob=3, lean=-1, fh=(2, 5), wang=80)), kneel, kneel,
                     dissolve(kneel, 0.45, "#ff7a2a", 5), dissolve(kneel, 0.9, "#ff7a2a", 6)]
    elif name == "Herrera":
        A["Idle"] = [draw(P(fh=(2, -3), wang=-110)), draw(P(fh=(3, -2), wang=-70)), draw(P(fh=(4, 3), wang=25, bob=1)), draw(P(fh=(3, 2), wang=0))]
    elif name == "Alquimista":
        A["Idle"] = [draw(P(fh=(3, 1), bob=0)), draw(P(fh=(3, 0), bob=0)), draw(P(fh=(3, 1), bob=1)), draw(P(fh=(3, 2), bob=1))]
    return A


def bone_pile(w, h, ground, pal):
    c = Canvas(w, h)
    cx = w // 2
    for (x0, y0, x1, y1) in [(-8, -1, 6, -1), (-5, -3, 7, -2), (-9, -2, -2, -3), (2, -1, 9, -2)]:
        c.line([(cx + x0, ground + y0), (cx + x1, ground + y1)], pal["bone"], 2)
    c.rect(cx - 2, ground - 7, cx + 3, ground - 3, pal["bone"])
    c.rect(cx - 2, ground - 7, cx - 1, ground - 3, pal["bone_d"])
    c.rect(cx + 1, ground - 6, cx + 1, ground - 5, "#140d14")
    c.line([(cx + 4, ground - 2), (cx + 12, ground - 6)], pal["blade"], 2)
    return outline(c.im)


# ---------------------------------------------------------------------------
# Bat

def bat_frame(phase, hurt=False, dead=0):
    w, h = 36, 28
    c = Canvas(w, h)
    cx, cy = 18, 13
    body, wing, wing_d = "#3b2442", "#6a3f78", "#4a2a56"
    up = [-7, -3, 2, -2][phase]
    for side in (-1, 1):
        tip = (cx + side * 16, cy + up)
        mid = (cx + side * 9, cy + up // 2 - 3)
        c.poly([(cx + side * 2, cy - 2), mid, tip, (cx + side * 12, cy + 4 + up // 3), (cx + side * 7, cy + 2), (cx + side * 4, cy + 4)], wing if side > 0 else wing_d)
        c.line([(cx + side * 2, cy - 2), mid, tip], shade(wing, 0.6))
    c.ellipse(cx - 4, cy - 4, cx + 4, cy + 5, body)
    c.poly([(cx - 3, cy - 3), (cx - 4, cy - 8), (cx - 1, cy - 4)], body)
    c.poly([(cx + 3, cy - 3), (cx + 4, cy - 8), (cx + 1, cy - 4)], body)
    c.px(cx + 1, cy - 1, "#ff4040")
    c.px(cx + 3, cy - 1, "#ff4040")
    c.px(cx + 2, cy + 2, "#f0e6d0")
    im = outline(c.im)
    if hurt:
        im = Image.blend(im, Image.new("RGBA", im.size, (0, 0, 0, 0)), 0)
    if dead:
        im = dissolve(im.rotate(-25 * dead, center=(18, 13)), 0.3 * dead, "#8a5aa0", seed=dead)
    return im


def bat_frames():
    return {"Fly": [bat_frame(i) for i in range(4)], "Attack": [bat_frame(2), bat_frame(3)],
            "Hurt": [bat_frame(1, hurt=True)], "Dead": [bat_frame(1, dead=d) for d in (1, 2, 3)]}


# ---------------------------------------------------------------------------
# Training dummy

def dummy_frame(tilt=0):
    w, h = 32, 44
    c = Canvas(w, h)
    cx, g = 16, 41
    c.rect(cx - 1, g - 22, cx + 1, g, "#6a4526")
    c.rect(cx - 6, g, cx + 6, g, "#4a2e18")
    body = Canvas(w, h)
    body.poly([(cx - 6, 14), (cx + 6, 14), (cx + 7, 27), (cx - 7, 27)], "#c9a45a")
    body.rect(cx - 7, 19, cx + 7, 20, "#8a6a34")
    body.rect(cx - 10, 16, cx + 10, 17, "#b8914a")
    body.ellipse(cx - 5, 4, cx + 5, 14, "#d8c49a")
    body.line([(cx - 3, 7), (cx - 1, 9)], "#5a3a22")
    body.line([(cx - 1, 7), (cx - 3, 9)], "#5a3a22")
    body.line([(cx + 1, 7), (cx + 3, 9)], "#5a3a22")
    body.line([(cx + 3, 7), (cx + 1, 9)], "#5a3a22")
    body.ellipse(cx - 3, 20, cx + 3, 26, None, outline="#c83a3a")
    body.px(cx, 23, "#c83a3a")
    bi = body.im.rotate(tilt, center=(cx, g - 14), resample=Image.Resampling.NEAREST)
    c.im.alpha_composite(bi)
    return outline(c.im)


def dummy_frames():
    return {"Idle": [dummy_frame(0)], "Hurt": [dummy_frame(-12), dummy_frame(8), dummy_frame(-4)]}


# ---------------------------------------------------------------------------
# Wraith (flying ghost)

def ghost_frame(phase=0, cast=0, hurt=False, dead=0):
    w, h = 40, 44
    c = Canvas(w, h)
    cx = 20
    body, body_d, glow = "#a8d8ec", "#6a9fc0", "#e8fbff"
    sway = [0, 2, 0, -2][phase % 4]
    # tail: tapering wisps
    c.poly([(cx - 8, 20), (cx + 8, 20), (cx + 10, 32), (cx + 6 + sway, 38), (cx + 2, 33), (cx + sway, 42), (cx - 3, 35), (cx - 7 + sway, 39), (cx - 10, 31)], body)
    c.poly([(cx - 8, 20), (cx - 2, 20), (cx - 3, 35), (cx - 7 + sway, 39), (cx - 10, 31)], body_d)
    # arms
    arm = -5 if cast else 3
    c.poly([(cx + 6, 21), (cx + 13, 22 + arm), (cx + 14, 26 + arm), (cx + 6, 27)], body)
    c.poly([(cx - 6, 21), (cx - 12, 24), (cx - 12, 28), (cx - 5, 27)], body_d)
    # hood + face
    c.ellipse(cx - 9, 6, cx + 9, 24, body)
    c.ellipse(cx - 9, 6, cx - 1, 24, body_d)
    c.ellipse(cx - 5, 10, cx + 6, 22, "#10202c")
    ec = "#ffffff" if cast else glow
    c.rect(cx - 2, 14, cx - 1, 16, ec)
    c.rect(cx + 2, 14, cx + 3, 16, ec)
    c.rect(cx - 1, 19, cx + 2, 20, "#1c3444")
    if cast:
        c.ellipse(cx + 11, 14 + arm, cx + 17, 20 + arm, "#c9f4ff")
        c.px(cx + 14, 17 + arm, "#ffffff")
    im = outline(c.im, (16, 40, 56, 255))
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a:
                px[x, y] = (r, g, b, 215 if y < 30 else max(90, int(215 - (y - 30) * 10)))
    if hurt:
        im = flash_tint(im, (255, 255, 255))
    if dead:
        im = dissolve(im, 0.25 * dead, "#c9f4ff", seed=dead)
    return im


def flash_tint(im, col):
    out = im.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a:
                px[x, y] = ((r + col[0]) // 2, (g + col[1]) // 2, (b + col[2]) // 2, a)
    return out


def ghost_frames():
    return {"Fly": [ghost_frame(i) for i in range(4)], "Cast": [ghost_frame(1, cast=1), ghost_frame(2, cast=1), ghost_frame(3, cast=1)],
            "Hurt": [ghost_frame(1, hurt=True)], "Dead": [ghost_frame(1, dead=d) for d in (1, 2, 3, 4)]}


# ---------------------------------------------------------------------------
# Slime (Limo) and its small split-offs

def slime_frame(squash=0.0, hurt=False, dead=0, size=1.0):
    w, h = 40, 32
    c = Canvas(w, h)
    cx, ground = 20, 30
    bw = int(13 + squash * 5)
    bh = int(14 - squash * 6)
    top = ground - bh
    col, col_l, col_d = "#5ad8b0", "#9af4d8", "#2a9a7a"
    if dead:
        flat = 3 + dead
        c.ellipse(cx - 14 - dead * 2, ground - flat, cx + 14 + dead * 2, ground + 1, col)
        c.ellipse(cx - 10 - dead, ground - flat, cx + 4, ground - 1, col_d)
        for i in range(dead * 2):
            c.px(cx - 16 + i * 4, ground - 4 - (i % 3) * 3, col_l)
    else:
        c.ellipse(cx - bw, top, cx + bw, ground + 1, col)
        c.ellipse(cx - bw, top + bh // 2, cx + bw, ground + 1, col_d)
        c.ellipse(cx - bw + 2, top + 1, cx + bw - 2, ground - 2, col)
        c.ellipse(cx - bw + 4, top + 2, cx - 2, top + 6, col_l)
        ey = top + bh // 2 - 1
        c.rect(cx - 5, ey, cx - 3, ey + 3, "#0e3a30")
        c.rect(cx + 3, ey, cx + 5, ey + 3, "#0e3a30")
        c.px(cx - 4, ey, "#ffffff")
        c.px(cx + 4, ey, "#ffffff")
        c.rect(cx - 2, ey + 5, cx + 2, ey + 5, "#0e3a30")
    im = outline(c.im, (14, 46, 40, 255))
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a and (r, g, b) != (14, 46, 40):
                px[x, y] = (r, g, b, 235)
    if hurt:
        im = flash_tint(im, (255, 255, 255))
    if size != 1.0:
        im = im.resize((max(1, round(im.width * size)), max(1, round(im.height * size))), Image.Resampling.NEAREST)
    return im


def slime_frames(size=1.0):
    return {"Idle": [slime_frame(0.0, size=size), slime_frame(0.5, size=size)], "Walk": [slime_frame(-0.8, size=size)],
            "Hurt": [slime_frame(0.9, hurt=True, size=size)], "Dead": [slime_frame(dead=d, size=size) for d in (1, 2, 3)]}
