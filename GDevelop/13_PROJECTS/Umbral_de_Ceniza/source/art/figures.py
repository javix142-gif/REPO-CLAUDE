"""Articulated pixel-art figures (heroes, NPCs, humanoid enemies, boss).

A figure is drawn facing RIGHT from a pose dict; GDevelop flips it for the left
side. Proportions are chibi-like (big head) to read well on small phone screens.
"""
from __future__ import annotations

import math
from .pixel import Canvas, rgba, shade, mix, rot, outline

# ---------------------------------------------------------------------------
# generic helpers


def ik(p0, p1, l1, l2, bend=1):
    """2-bone IK. bend=+1 -> joint towards +x (knees), -1 -> towards -x."""
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    d = math.hypot(dx, dy)
    th = math.atan2(dy, dx)
    if d >= l1 + l2 - 0.01 or d < 0.01:
        return (p0[0] + dx * l1 / max(d, 0.01), p0[1] + dy * l1 / max(d, 0.01))
    a = math.acos(max(-1, min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))))
    ang = th - bend * a
    return (p0[0] + l1 * math.cos(ang), p0[1] + l1 * math.sin(ang))


def limb(c, a, b, col, w, l1, l2, bend):
    j = ik(a, b, l1, l2, bend)
    c.line([a, j, b], col, w)
    return j


DEFAULT_POSE = dict(bob=0, lean=0, ff=(2, 0), bf=(-2, 0), fh=(1, 6), bh=(-1, 6), wang=60,
                    cape=0, eyes=1, glow=0, string=0, arrow=0, head_tilt=0, hat=0, aim=None)


def P(**kw):
    p = dict(DEFAULT_POSE)
    p.update(kw)
    return p


# ---------------------------------------------------------------------------
# Hero palettes

HEROES = {
    "Guerrero": dict(
        skin="#e2a47f", hair="#6b3b24", metal="#a3afbd", metal_d="#5f6b7c", metal_l="#e1e8ef",
        plume="#c8323c", cloth="#8e2a2f", cloth_d="#5a1720", pants="#3b3d4c", boots="#4a3426",
        blade="#dfe7ef", blade_d="#8f9aab", hilt="#7a4a24", guard="#e0b24c", magic="#ffcf6b"),
    "Maga": dict(
        skin="#f1c3a0", hair="#e3e1f0", robe="#6b35a8", robe_d="#43206f", robe_l="#9a63d6",
        trim="#e7b74b", hat="#51287f", hat_d="#321755", boots="#3c2a3a", wood="#7b4d2a",
        wood_d="#4d2e17", orb="#ffb347", orb_l="#fff0a8", magic="#ff9a3c"),
    "Arquera": dict(
        skin="#e9b48f", hair="#c0622f", hood="#3f7d3b", hood_d="#27522a", hood_l="#6fae57",
        leather="#7a5130", leather_d="#4d3119", pants="#2f3b2c", boots="#503620", wood="#9a6a38",
        wood_d="#5e3d1e", string="#efe6cf", feather="#f2efe6", magic="#9dfc7a"),
}


# ---------------------------------------------------------------------------
# Hero drawing


def _head_box(sx, sy):
    return sx - 4, sy - 9, sx + 4, sy - 1


def _draw_face(c, sx, sy, pal, eyes, skin_key="skin"):
    x0, y0, x1, y1 = _head_box(sx, sy)
    c.rect(x0 + 2, y0 + 2, x1, y1, pal[skin_key])
    c.rect(x0 + 2, y1, x1 - 1, y1, shade(pal[skin_key], 0.82))  # jaw shade
    if eyes:
        c.rect(x1 - 3, y0 + 4, x1 - 3, y0 + 5, "#1a1420")
        c.rect(x1 - 1, y0 + 4, x1 - 1, y0 + 5, "#1a1420")
        c.px(x1 - 3, y0 + 4, "#ffffff")
    else:
        c.rect(x1 - 3, y0 + 5, x1 - 1, y0 + 5, "#1a1420")


def draw_hero(cls, pose, w=48, h=44, hx=24, hy=32, ground=41):
    pal = HEROES[cls]
    p = pose
    c = Canvas(w, h)
    hip = (hx, hy + p["bob"])
    sx, sy = hx + p["lean"], hy - 8 + p["bob"]
    fs = (sx + 2, sy + 1)       # front shoulder
    bs = (sx - 2, sy + 1)       # back shoulder
    ffoot = (hx + p["ff"][0], ground - p["ff"][1])
    bfoot = (hx + p["bf"][0], ground - p["bf"][1])
    fhand = (fs[0] + p["fh"][0], fs[1] + p["fh"][1])
    bhand = (bs[0] + p["bh"][0], bs[1] + p["bh"][1])

    robe = cls == "Maga"
    pants = pal.get("pants", pal.get("robe_d"))

    # --- behind the body ----------------------------------------------------
    if cls == "Guerrero":  # cape
        sway = p["cape"]
        c.poly([(sx - 3, sy), (sx + 1, sy), (hx - 2, hy + 5 + p["bob"]), (hx - 8 - sway, hy + 6 + p["bob"] - sway // 2),
                (hx - 7 - sway, hy + 1 + p["bob"])], pal["cloth_d"])
        c.poly([(sx - 3, sy), (sx - 1, sy), (hx - 5 - sway, hy + 5 + p["bob"] - sway // 2), (hx - 7 - sway, hy + 2 + p["bob"])], pal["cloth"])
    if cls == "Arquera":  # quiver + short cape
        q = rot([(sx - 6, sy - 3), (sx - 3, sy - 3), (sx - 3, sy + 7), (sx - 6, sy + 7)], 20, sx - 4, sy + 2)
        c.poly(q, pal["leather_d"])
        for i, fx in enumerate((-6, -5, -4)):
            c.px(sx + fx + 1, sy - 4 - (i % 2), pal["feather"])
            c.px(sx + fx + 1, sy - 5 - (i % 2), "#c94f3a")
        c.poly([(sx - 3, sy), (sx + 1, sy), (hx - 1, hy + 3 + p["bob"]), (hx - 6 - p["cape"], hy + 3 + p["bob"])], pal["hood_d"])
    if cls == "Maga":  # long hair behind
        c.poly([(sx - 4, sy - 7), (sx, sy - 7), (sx - 1, sy + 3), (sx - 5 - p["cape"] // 2, sy + 4)], pal["hair"])
        c.px(sx - 4, sy + 1, shade(pal["hair"], 0.8))

    # back arm & back leg (darker)
    if not robe:
        limb(c, (hip[0] - 1, hip[1]), bfoot, shade(pants, 0.7), 3, 5, 5, 1)
        c.rect(bfoot[0] - 1, bfoot[1] - 1, bfoot[0] + 2, bfoot[1], shade(pal["boots"], 0.7))
    else:
        c.rect(bfoot[0] - 1, bfoot[1] - 1, bfoot[0] + 2, bfoot[1], shade(pal["boots"], 0.7))
    arm_col = pal.get("metal_d") if cls == "Guerrero" else (pal.get("robe_d") if robe else pal.get("leather_d"))
    limb(c, bs, bhand, shade(arm_col, 0.8), 2, 4, 4, -1)
    c.rect(bhand[0], bhand[1], bhand[0] + 1, bhand[1] + 1, shade(pal["skin"], 0.8))

    # Arquera: bow string pulled by back hand is drawn later with the bow.

    # --- torso ---------------------------------------------------------------
    if cls == "Guerrero":
        c.poly([(sx - 4, sy), (sx + 4, sy), (hip[0] + 4, hip[1]), (hip[0] - 4, hip[1])], pal["metal"])
        c.poly([(sx - 4, sy), (sx - 2, sy), (hip[0] - 2, hip[1]), (hip[0] - 4, hip[1])], pal["metal_d"])
        c.rect(sx + 1, sy + 1, sx + 2, sy + 4, pal["metal_l"])
        c.rect(hip[0] - 4, hip[1] - 2, hip[0] + 4, hip[1] - 1, pal["hilt"])
        c.px(hip[0] + 2, hip[1] - 2, pal["guard"])
        c.poly([(hip[0] - 4, hip[1]), (hip[0] + 4, hip[1]), (hip[0] + 4, hip[1] + 2), (hip[0] - 4, hip[1] + 2)], pal["cloth"])
    elif robe:
        sway = p["cape"]
        c.poly([(sx - 4, sy), (sx + 4, sy), (hip[0] + 5, hip[1]), (hx + 6 + sway // 2, ground - 1),
                (hx - 6 - sway, ground - 1), (hip[0] - 5, hip[1])], pal["robe"])
        c.poly([(sx - 4, sy), (sx - 1, sy), (hip[0] - 2, hip[1]), (hx - 3 - sway, ground - 1), (hx - 6 - sway, ground - 1),
                (hip[0] - 5, hip[1])], pal["robe_d"])
        c.rect(sx + 1, sy + 1, sx + 2, sy + 5, pal["robe_l"])
        c.rect(hip[0] - 5, hip[1] - 1, hip[0] + 5, hip[1], pal["trim"])
        c.line([(hx + 1, hip[1] + 1), (hx + 2 + sway // 3, ground - 1)], pal["trim"])
        c.rect(hx - 6 - sway, ground - 1, hx + 6 + sway // 2, ground - 1, pal["trim"])
    else:  # Arquera
        c.poly([(sx - 4, sy), (sx + 4, sy), (hip[0] + 4, hip[1] + 2), (hip[0] - 4, hip[1] + 2)], pal["leather"])
        c.poly([(sx - 4, sy), (sx - 2, sy), (hip[0] - 2, hip[1] + 2), (hip[0] - 4, hip[1] + 2)], pal["leather_d"])
        c.line([(sx - 3, sy), (hip[0] + 3, hip[1] - 1)], pal["leather_d"])
        c.rect(hip[0] - 4, hip[1] - 1, hip[0] + 4, hip[1] - 1, pal["wood_d"])

    # front leg
    if not robe:
        limb(c, (hip[0] + 1, hip[1]), ffoot, pants, 3, 5, 5, 1)
        c.rect(ffoot[0] - 1, ffoot[1] - 1, ffoot[0] + 2, ffoot[1], pal["boots"])
        c.px(ffoot[0] + 2, ffoot[1] - 1, shade(pal["boots"], 1.3))
    else:
        c.rect(ffoot[0] - 1, ffoot[1] - 1, ffoot[0] + 2, ffoot[1], pal["boots"])

    # --- head ----------------------------------------------------------------
    x0, y0, x1, y1 = _head_box(sx, sy)
    if cls == "Guerrero":
        c.rect(x0, y0, x1, y1, pal["metal"])
        c.rect(x0, y0 + 1, x0 + 1, y1, pal["metal_d"])
        c.rect(x0 + 3, y0 + 3, x1, y1 - 1, pal["skin"])       # face opening
        c.rect(x0 + 3, y0 + 3, x1, y0 + 3, pal["metal_d"])    # visor edge
        if p["eyes"]:
            c.rect(x1 - 3, y0 + 4, x1 - 3, y0 + 5, "#1a1420")
            c.rect(x1 - 1, y0 + 4, x1 - 1, y0 + 5, "#1a1420")
        else:
            c.rect(x1 - 3, y0 + 5, x1 - 1, y0 + 5, "#1a1420")
        c.rect(x0 + 1, y0, x1 - 1, y0, pal["metal_l"])
        c.rect(x1 - 1, y1 - 1, x1, y1, pal["metal"])          # cheek guard
        # plume flowing back
        pl = pal["plume"]
        c.rect(sx - 1, y0 - 2, sx + 1, y0 - 1, pl)
        c.rect(sx - 4, y0 - 3, sx - 1, y0 - 2, pl)
        c.rect(sx - 7 - p["cape"] // 2, y0 - 1, sx - 4, y0 - 2, shade(pl, 0.75))
        c.px(sx - 7 - p["cape"] // 2, y0, shade(pl, 0.75))
        c.px(sx, y0 - 2, shade(pl, 1.3))
    elif cls == "Maga":
        c.rect(x0 + 1, y0 + 1, x1, y1, pal["hair"])
        _draw_face(c, sx, sy, pal, p["eyes"])
        c.rect(x0 + 1, y0 + 2, x0 + 2, y1, pal["hair"])
        # hat
        tilt = p["hat"]
        c.rect(x0 - 2, y0 + 1, x1 + 2, y0 + 2, pal["hat"])
        c.rect(x0 - 2, y0 + 2, x1 + 2, y0 + 2, pal["hat_d"])
        c.poly([(x0 + 1, y0 + 1), (x1 - 1, y0 + 1), (sx - 1 - tilt, y0 - 6), (sx - 3 - tilt, y0 - 5)], pal["hat"])
        c.poly([(sx - 3 - tilt, y0 - 5), (sx - 1 - tilt, y0 - 6), (sx - 6 - tilt, y0 - 4)], pal["hat_d"])
        c.rect(x0 + 1, y0, x1 - 1, y0, pal["trim"])
    else:  # Arquera
        c.rect(x0, y0, x1, y1, pal["hood"])
        c.rect(x0, y0 + 1, x0 + 1, y1 + 1, pal["hood_d"])
        c.poly([(x0, y0 + 1), (x0 - 3 - p["cape"] // 2, y0 + 3), (x0, y0 + 5)], pal["hood_d"])  # hood tail
        c.rect(x0 + 3, y0 + 3, x1, y1, pal["skin"])
        c.rect(x0 + 3, y0 + 2, x1 - 1, y0 + 3, pal["hair"])
        c.px(x0 + 3, y0 + 4, pal["hair"])
        if p["eyes"]:
            c.rect(x1 - 3, y0 + 4, x1 - 3, y0 + 5, "#1a1420")
            c.rect(x1 - 1, y0 + 4, x1 - 1, y0 + 5, "#1a1420")
            c.px(x1 - 3, y0 + 4, "#ffffff")
        else:
            c.rect(x1 - 3, y0 + 5, x1 - 1, y0 + 5, "#1a1420")
        c.rect(x0 + 1, y0, x1 - 1, y0, pal["hood_l"])

    # --- front arm + weapon ----------------------------------------------------
    front_arm = pal.get("metal") if cls == "Guerrero" else (pal.get("robe") if robe else pal.get("leather"))
    weapon_behind = cls == "Arquera"
    if weapon_behind:
        _draw_weapon(c, cls, pal, p, fhand, bhand)
    limb(c, fs, fhand, front_arm, 2, 4, 4, -1)
    if cls == "Guerrero":
        c.rect(fs[0] - 2, fs[1] - 2, fs[0] + 1, fs[1], pal["metal_l"])  # pauldron
        c.px(fs[0] - 2, fs[1], pal["metal_d"])
    c.rect(fhand[0], fhand[1], fhand[0] + 1, fhand[1] + 1, pal["skin"])
    if not weapon_behind:
        _draw_weapon(c, cls, pal, p, fhand, bhand)

    # magic glow particles
    if p["glow"]:
        g = pal["magic"]
        for i, (gx, gy) in enumerate([(-2, -2), (3, -1), (1, 3), (-3, 2), (4, 3)][: 2 + p["glow"]]):
            c.px(fhand[0] + gx, fhand[1] + gy, g if i % 2 == 0 else shade(g, 1.5))

    return c


def _draw_weapon(c, cls, pal, p, fhand, bhand):
    hxp, hyp = fhand[0] + 0.5, fhand[1] + 0.5
    ang = p["wang"]
    if cls == "Guerrero":
        blade = rot([(hxp + 2, hyp - 1), (hxp + 15, hyp - 1), (hxp + 17, hyp), (hxp + 15, hyp + 1), (hxp + 2, hyp + 1)], ang, hxp, hyp)
        c.poly(blade, pal["blade"])
        edge = rot([(hxp + 3, hyp + 1), (hxp + 15, hyp + 1)], ang, hxp, hyp)
        c.line(edge, pal["blade_d"])
        shine = rot([(hxp + 4, hyp - 1), (hxp + 9, hyp - 1)], ang, hxp, hyp)
        c.line(shine, "#ffffff")
        guard = rot([(hxp + 1, hyp - 3), (hxp + 2, hyp - 3), (hxp + 2, hyp + 3), (hxp + 1, hyp + 3)], ang, hxp, hyp)
        c.poly(guard, pal["guard"])
        hilt = rot([(hxp - 3, hyp), (hxp + 1, hyp)], ang, hxp, hyp)
        c.line(hilt, pal["hilt"], 2)
        pm = rot([(hxp - 3, hyp)], ang, hxp, hyp)[0]
        c.px(pm[0], pm[1], pal["guard"])
    elif cls == "Maga":
        top = rot([(hxp + 13, hyp)], ang, hxp, hyp)[0]
        bot = rot([(hxp - 6, hyp)], ang, hxp, hyp)[0]
        c.line([bot, top], pal["wood"], 2)
        c.line([bot, rot([(hxp - 2, hyp)], ang, hxp, hyp)[0]], pal["wood_d"], 2)
        # claw + orb
        c.ellipse(top[0] - 2, top[1] - 2, top[0] + 2, top[1] + 2, pal["orb"])
        c.px(top[0] - 1, top[1] - 1, pal["orb_l"])
        if p["glow"]:
            c.ellipse(top[0] - 3, top[1] - 3, top[0] + 3, top[1] + 3, None, outline=mix(pal["orb"], "#ffffff", 0.4))
            c.px(top[0], top[1], "#ffffff")
    else:  # bow (vertical arc) + string + arrow
        bx, by = hxp + 1, hyp
        # bow limbs as a curved polyline, rotated by (wang+90)
        pts = []
        for i in range(-6, 7):
            yy = i * 1.35
            xx = 3.2 - (i * i) * 0.085
            pts.append((bx + xx - 2, by + yy))
        a = p["aim"] if p.get("aim") is not None else (0 if ang in (0, 60) else (ang + 90) * 0.5)
        pts = rot(pts, a, bx, by)
        c.line(pts, pal["wood"], 2)
        c.px(pts[6][0], pts[6][1], pal["wood_d"])
        top, bot = pts[0], pts[-1]
        pull = p["string"]
        mid = rot([(bx - 2 - pull, by)], a, bx, by)[0]
        c.line([top, mid, bot], pal["string"])
        if p["arrow"]:
            tail = mid
            tip = rot([(bx + 8, by)], a, bx, by)[0]
            c.line([tail, tip], "#d8c7a0")
            c.px(tip[0], tip[1], "#e8eef4")
            c.px(tail[0] - 1, tail[1] - 1, pal["feather"])
            c.px(tail[0] - 1, tail[1] + 1, pal["feather"])


# ---------------------------------------------------------------------------
# Hero animation tables


def hero_poses(cls):
    melee = cls == "Guerrero"
    staff = cls == "Maga"
    idle_w = -55 if melee else (-80 if staff else 60)
    idle_fh = (2, 3) if melee else ((3, 2) if staff else (4, 2))
    anims = {}
    anims["Idle"] = [P(bob=b, fh=(idle_fh[0], idle_fh[1] + b), bh=(-1, 5), wang=idle_w, cape=cp)
                     for b, cp in ((0, 0), (0, 1), (1, 1), (1, 0))]
    run = []
    for i in range(6):
        t = i / 6 * 2 * math.pi
        ffx, bfx = 4 * math.sin(t), -4 * math.sin(t)
        run.append(P(bob=1 if i % 3 == 0 else 0, lean=1, ff=(round(ffx), max(0, round(3 * math.cos(t)))),
                     bf=(round(bfx), max(0, round(-3 * math.cos(t)))),
                     fh=(idle_fh[0] + round(-1.5 * math.sin(t)), idle_fh[1] - 1), bh=(round(2 * math.sin(t)), 5),
                     wang=idle_w + (10 if melee else 0), cape=2 + (i % 2)))
    anims["Run"] = run
    anims["Jump"] = [P(bob=-1, ff=(3, 5), bf=(-3, 2), fh=(idle_fh[0], idle_fh[1] - 2), bh=(-2, 2), wang=idle_w, cape=3)]
    anims["Fall"] = [P(bob=0, ff=(2, 2), bf=(-3, 1), fh=(idle_fh[0] + 1, idle_fh[1] - 3), bh=(-3, 0), wang=idle_w, cape=-1)]
    if melee:
        anims["Attack"] = [
            P(lean=-1, fh=(-3, -3), bh=(-2, 3), wang=-150, ff=(2, 0), bf=(-3, 0), cape=0),
            P(lean=2, fh=(4, 0), bh=(-3, 2), wang=-15, ff=(5, 0), bf=(-4, 0), cape=3),
            P(lean=2, fh=(4, 3), bh=(-3, 3), wang=45, ff=(5, 0), bf=(-4, 0), cape=3),
            P(lean=1, fh=(3, 3), bh=(-2, 4), wang=25, ff=(4, 0), bf=(-3, 0), cape=2),
        ]
    elif staff:
        anims["Attack"] = [
            P(lean=-1, fh=(-1, 1), bh=(-2, 3), wang=-110, cape=0),
            P(lean=2, fh=(5, -1), bh=(-2, 3), wang=-15, ff=(4, 0), bf=(-3, 0), glow=2, cape=2),
            P(lean=2, fh=(5, -1), bh=(-2, 3), wang=-12, ff=(4, 0), bf=(-3, 0), glow=3, cape=2),
            P(lean=1, fh=(3, 1), bh=(-1, 4), wang=-60, ff=(3, 0), bf=(-2, 0), cape=1),
        ]
    else:
        anims["Attack"] = [
            P(lean=0, fh=(5, -1), bh=(3, 0), wang=0, string=0, arrow=1),
            P(lean=-1, fh=(5, -1), bh=(0, 0), wang=0, string=3, arrow=1, ff=(3, 0), bf=(-4, 0)),
            P(lean=0, fh=(5, -1), bh=(-2, 1), wang=0, string=0, arrow=0, ff=(3, 0), bf=(-4, 0)),
            P(lean=0, fh=(4, 1), bh=(-1, 4), wang=60, string=0),
        ]
    # aimed attacks: diagonal-up and straight-up (the hitbox / projectile follows the same direction)
    if melee:
        anims["AttackDiag"] = [
            P(lean=-1, fh=(-1, 3), bh=(-2, 3), wang=40, ff=(2, 0), bf=(-3, 0), cape=0),
            P(lean=2, fh=(4, -3), bh=(-3, 2), wang=-30, ff=(5, 0), bf=(-4, 0), cape=3),
            P(lean=2, fh=(3, -5), bh=(-3, 1), wang=-58, ff=(5, 0), bf=(-4, 0), cape=3),
            P(lean=1, fh=(3, 0), bh=(-2, 3), wang=-15, ff=(4, 0), bf=(-3, 0), cape=2),
        ]
        anims["AttackUp"] = [
            P(lean=0, fh=(0, 3), bh=(-2, 3), wang=25, ff=(2, 0), bf=(-3, 0), cape=0),
            P(lean=1, fh=(1, -6), bh=(-2, -2), wang=-72, ff=(3, 0), bf=(-3, 0), cape=3),
            P(lean=1, fh=(1, -8), bh=(-2, -3), wang=-92, ff=(3, 0), bf=(-3, 0), cape=3),
            P(lean=0, fh=(2, -2), bh=(-2, 3), wang=-60, cape=1),
        ]
    elif staff:
        anims["AttackDiag"] = [
            P(lean=-1, fh=(0, 1), bh=(-2, 3), wang=-95, cape=0),
            P(lean=2, fh=(4, -3), bh=(-2, 2), wang=-50, ff=(4, 0), bf=(-3, 0), glow=2, cape=2),
            P(lean=2, fh=(4, -3), bh=(-2, 2), wang=-48, ff=(4, 0), bf=(-3, 0), glow=3, cape=2),
            P(lean=1, fh=(3, 0), bh=(-1, 4), wang=-75, ff=(3, 0), bf=(-2, 0), cape=1),
        ]
        anims["AttackUp"] = [
            P(lean=-1, fh=(1, 0), bh=(-2, 3), wang=-100, cape=0),
            P(lean=1, fh=(2, -6), bh=(-1, -2), wang=-88, ff=(3, 0), bf=(-2, 0), glow=2, cape=2, hat=1),
            P(lean=1, fh=(2, -7), bh=(-1, -3), wang=-90, ff=(3, 0), bf=(-2, 0), glow=3, cape=2, hat=2),
            P(lean=0, fh=(3, -1), bh=(-1, 4), wang=-85, cape=1),
        ]
    else:
        anims["AttackDiag"] = [
            P(lean=0, fh=(4, -3), bh=(2, -2), wang=0, string=0, arrow=1, aim=-38),
            P(lean=-1, fh=(4, -3), bh=(0, -2), wang=0, string=3, arrow=1, aim=-38, ff=(3, 0), bf=(-4, 0)),
            P(lean=0, fh=(4, -3), bh=(-2, -1), wang=0, string=0, arrow=0, aim=-38, ff=(3, 0), bf=(-4, 0)),
            P(lean=0, fh=(4, 0), bh=(-1, 4), wang=60, string=0),
        ]
        anims["AttackUp"] = [
            P(lean=0, fh=(2, -6), bh=(1, -5), wang=0, string=0, arrow=1, aim=-78),
            P(lean=-1, fh=(2, -7), bh=(0, -5), wang=0, string=3, arrow=1, aim=-78, ff=(3, 0), bf=(-4, 0)),
            P(lean=0, fh=(2, -7), bh=(-1, -4), wang=0, string=0, arrow=0, aim=-78, ff=(3, 0), bf=(-4, 0)),
            P(lean=0, fh=(3, 0), bh=(-1, 4), wang=60, string=0),
        ]
    anims["Cast"] = [
        P(lean=0, fh=(2, -5), bh=(1, -5), wang=-90 if not staff else -85, glow=1, cape=1, hat=1),
        P(lean=-1, fh=(2, -7), bh=(1, -7), wang=-95 if not staff else -88, glow=2, cape=2, hat=2, bob=-1),
        P(lean=1, fh=(4, -3), bh=(2, -2), wang=-45 if not staff else -60, glow=3, cape=2, hat=1),
    ]
    anims["Hurt"] = [P(lean=-2, bob=1, fh=(-1, 4), bh=(-3, 3), wang=idle_w + 30, eyes=0, cape=-2)]
    anims["Dead"] = [
        P(bob=3, lean=1, ff=(4, 0), bf=(-3, 0), fh=(3, 5), bh=(0, 6), wang=70, eyes=0),
        P(bob=5, lean=-2, ff=(4, 0), bf=(-4, 0), fh=(1, 6), bh=(-2, 6), wang=80, eyes=0),
        "LYING",
    ]
    return anims


# ---------------------------------------------------------------------------
# Generic creature figures (enemies / NPCs) using the same skeleton idea

def draw_generic(style, pal, p, w, h, hx, hy, ground, k=1.0):
    """Humanoid variants: skeleton, cultist, brute, knight(boss), smith, alchemist, dummy."""
    c = Canvas(w, h)
    L = lambda v: v * k  # noqa: E731
    hip = (hx, hy + p["bob"])
    sx, sy = hx + L(p["lean"]), hy - L(8) + p["bob"]
    fs = (sx + L(2), sy + L(1))
    bs = (sx - L(2), sy + L(1))
    ffoot = (hx + L(p["ff"][0]), ground - L(p["ff"][1]))
    bfoot = (hx + L(p["bf"][0]), ground - L(p["bf"][1]))
    fhand = (fs[0] + L(p["fh"][0]), fs[1] + L(p["fh"][1]))
    bhand = (bs[0] + L(p["bh"][0]), bs[1] + L(p["bh"][1]))
    lw = max(1, round(3 * k)) if style not in ("skeleton",) else max(1, round(1.4 * k))
    aw = max(1, round(2 * k)) if style not in ("skeleton",) else 1
    l1 = L(5) * (hy + L(9) - hy) / L(9) if False else L(5)

    head_w, head_h = L(8), L(8)
    hx0, hy0 = sx - head_w / 2, sy - head_h - L(1)
    hx1, hy1 = sx + head_w / 2, sy - L(1)

    if style == "skeleton":
        bone, bone_d = pal["bone"], pal["bone_d"]
        limb(c, (hip[0] - 1, hip[1]), bfoot, bone_d, lw, L(5), L(5), 1)
        limb(c, bs, bhand, bone_d, aw, L(4), L(4), -1)
        # spine + ribs
        c.line([(hip[0], hip[1]), (sx, sy)], bone, 2)
        for i in range(3):
            yy = sy + 1 + i * 2
            c.line([(sx - 3 + i * 0.3, yy), (sx + 3, yy)], bone if i % 2 == 0 else bone_d)
        c.rect(hip[0] - 3, hip[1] - 1, hip[0] + 3, hip[1], bone_d)  # pelvis
        c.rect(hip[0] - 3, hip[1] - 2, hip[0] + 3, hip[1] - 2, pal["cloth"])  # rag belt
        c.poly([(hip[0] - 3, hip[1]), (hip[0] + 3, hip[1]), (hip[0] + 2, hip[1] + 3), (hip[0] - 4, hip[1] + 4)], pal["cloth"])
        limb(c, (hip[0] + 1, hip[1]), ffoot, bone, lw, L(5), L(5), 1)
        c.rect(ffoot[0] - 1, ffoot[1], ffoot[0] + 2, ffoot[1], bone)
        c.rect(bfoot[0] - 1, bfoot[1], bfoot[0] + 2, bfoot[1], bone_d)
        # skull
        c.rect(hx0 + 1, hy0, hx1, hy1 - 2, bone)
        c.rect(hx0 + 2, hy1 - 2, hx1 - 1, hy1, bone)
        c.rect(hx0 + 1, hy0 + 1, hx0 + 2, hy1 - 3, bone_d)
        c.rect(hx1 - 4, hy0 + 3, hx1 - 3, hy0 + 4, "#140d14")
        c.rect(hx1 - 1, hy0 + 3, hx1 - 1, hy0 + 4, "#140d14")
        c.px(hx1 - 3, hy0 + 3, pal["eye"])
        c.px(hx1 - 1, hy0 + 3, pal["eye"])
        c.rect(hx1 - 3, hy1 - 1, hx1, hy1 - 1, "#140d14")
        c.px(hx1 - 2, hy1 - 1, bone)
        limb(c, fs, fhand, bone, aw, L(4), L(4), -1)
        if pal.get("bow"):
            _draw_weapon(c, "Arquera", pal, p, fhand, bhand)
        else:
            _blade(c, fhand, p["wang"], L(12), pal["blade"], pal["blade_d"], pal["hilt"], 2)
    elif style == "cultist":
        sway = p["cape"]
        robe, robe_d = pal["robe"], pal["robe_d"]
        c.poly([(sx - L(4), sy), (sx + L(4), sy), (hip[0] + L(5), hip[1]), (hx + L(6) + sway, ground),
                (hx - L(7) - sway, ground), (hip[0] - L(5), hip[1])], robe)
        c.poly([(sx - L(4), sy), (sx - L(1), sy), (hx - L(3) - sway, ground), (hx - L(7) - sway, ground)], robe_d)
        c.rect(hip[0] - L(5), hip[1] - 1, hip[0] + L(5), hip[1], pal["trim"])
        for i in range(0, 12, 3):
            c.px(hx - L(6) + i, ground, pal["trim"])
        limb(c, bs, bhand, robe_d, aw, L(4), L(4), -1)
        # hood
        c.poly([(hx0 - 1, hy1 + 1), (hx0, hy0 + 1), (sx - 1, hy0 - 2), (hx1 + 1, hy0 + 2), (hx1 + 1, hy1 + 1)], robe)
        c.poly([(hx0 - 1, hy1 + 1), (hx0, hy0 + 1), (sx - 2, hy0 - 1), (sx - 2, hy1 + 1)], robe_d)
        c.rect(hx1 - 4, hy0 + 2, hx1, hy1, "#120a12")
        c.px(hx1 - 3, hy0 + 4, pal["eye"])
        c.px(hx1 - 1, hy0 + 4, pal["eye"])
        limb(c, fs, fhand, robe, aw, L(4), L(4), -1)
        c.rect(fhand[0], fhand[1], fhand[0] + 1, fhand[1] + 1, pal["skin"])
        if p["glow"]:
            g = pal["magic"]
            c.ellipse(fhand[0] - 2, fhand[1] - 2, fhand[0] + 3, fhand[1] + 3, mix(g, "#ffffff", 0.2 * p["glow"]))
            c.px(fhand[0], fhand[1], "#ffffff")
            for gx, gy in [(-3, -3), (4, -2), (3, 4)][: p["glow"]]:
                c.px(fhand[0] + gx, fhand[1] + gy, g)
    elif style == "queen":
        sway = p["cape"]
        dress, dress_d = pal["dress"], pal["dress_d"]
        # tall collar / cape behind
        c.poly([(sx - L(3), sy - L(6)), (sx - L(8) - sway, sy - L(9)), (sx - L(8) - sway, sy + L(3)), (hx - L(9) - sway, ground - L(2)), (sx - L(2), sy + L(2))], pal["cape"])
        limb(c, bs, bhand, dress_d, aw, L(4), L(4), -1)
        # flowing gown
        c.poly([(sx - L(4), sy), (sx + L(4), sy), (hip[0] + L(6), hip[1]), (hx + L(8) + sway, ground), (hx - L(9) - sway, ground), (hip[0] - L(6), hip[1])], dress)
        c.poly([(sx - L(4), sy), (sx - L(1), sy), (hx - L(4) - sway, ground), (hx - L(9) - sway, ground), (hip[0] - L(6), hip[1])], dress_d)
        c.rect(hip[0] - L(5), hip[1] - 1, hip[0] + L(5), hip[1] + L(1), pal["trim"])
        c.line([(sx - L(2), sy + L(1)), (sx + L(2), sy + L(5)), (sx, sy + L(8))], pal["glow"])
        for i in range(0, int(L(16)), 3):
            c.px(hx - L(8) + i, ground, pal["trim"])
        # head: pale face, long hair, crown
        c.rect(hx0, hy0 + L(1), hx1, hy1, pal["skin"])
        c.rect(hx0 - L(1), hy0, hx0 + L(2), hy1 + L(4), pal["hair"])
        c.rect(hx0, hy0, hx1, hy0 + L(2), pal["hair"])
        c.px(hx1 - L(3), hy0 + L(4), pal["eye"])
        c.px(hx1 - L(1), hy0 + L(4), pal["eye"])
        c.rect(hx1 - L(3), hy1 - L(1), hx1 - L(1), hy1 - L(1), pal["glow"])
        c.rect(hx0, hy0 - L(1), hx1, hy0, pal["trim"])
        for i in range(4):
            tx = hx0 + L(1) + i * L(2.2)
            c.poly([(tx, hy0 - L(1)), (tx + L(1.1), hy0 - L(4)), (tx + L(2.2), hy0 - L(1))], pal["trim"])
        c.px(hx0 + L(3.3), hy0 - L(3), pal["glow"])
        # scepter arm
        limb(c, fs, fhand, dress, aw, L(4), L(4), -1)
        c.rect(fhand[0], fhand[1], fhand[0] + 1, fhand[1] + 1, pal["skin"])
        rod = rot([(fhand[0] + 0.5, fhand[1] + 0.5), (fhand[0] + 0.5 + L(13), fhand[1] + 0.5)], p["wang"] - 60, fhand[0] + 0.5, fhand[1] + 0.5)
        c.line(rod, pal["trim"], max(1, round(L(1))))
        tip = rod[1]
        c.ellipse(tip[0] - L(2.2), tip[1] - L(2.2), tip[0] + L(2.2), tip[1] + L(2.2), pal["glow"])
        c.px(tip[0], tip[1], "#ffffff")
        if p["glow"]:
            for gx, gy in [(-3, -4), (5, -2), (3, 4), (-4, 3)][: p["glow"] + 1]:
                c.px(tip[0] + L(gx), tip[1] + L(gy), pal["glow"])
    elif style in ("brute",):
        skin, skin_d = pal["skin"], pal["skin_d"]
        limb(c, (hip[0] - L(1), hip[1]), bfoot, skin_d, lw, L(5), L(5), 1)
        limb(c, bs, bhand, skin_d, aw + 1, L(4), L(4), -1)
        # hunched big torso
        c.poly([(sx - L(6), sy - L(1)), (sx + L(4), sy - L(2)), (sx + L(6), sy + L(4)), (hip[0] + L(4), hip[1]),
                (hip[0] - L(5), hip[1]), (sx - L(7), sy + L(4))], skin)
        c.poly([(sx - L(6), sy - L(1)), (sx - L(2), sy - L(1)), (hip[0] - L(2), hip[1]), (hip[0] - L(5), hip[1]), (sx - L(7), sy + L(4))], skin_d)
        c.rect(hip[0] - L(5), hip[1] - L(1), hip[0] + L(4), hip[1] + L(1), pal["cloth"])
        c.line([(sx - L(3), sy + L(2)), (sx + L(3), sy + L(3))], pal["scar"])
        limb(c, (hip[0] + L(1), hip[1]), ffoot, skin, lw, L(5), L(5), 1)
        c.rect(ffoot[0] - L(1), ffoot[1] - 1, ffoot[0] + L(2), ffoot[1], skin_d)
        c.rect(bfoot[0] - L(1), bfoot[1] - 1, bfoot[0] + L(2), bfoot[1], shade(skin_d, 0.8))
        # small head, horns, jaw
        hx0, hy0 = sx + L(1), sy - L(6)
        c.rect(hx0, hy0, hx0 + L(6), hy0 + L(6), skin)
        c.rect(hx0, hy0 + L(4), hx0 + L(6), hy0 + L(6), skin_d)
        c.px(hx0 + L(4), hy0 + L(2), pal["eye"])
        c.px(hx0 + L(5.5), hy0 + L(2), pal["eye"])
        c.rect(hx0 + L(3), hy0 + L(5), hx0 + L(6), hy0 + L(5), "#f0e6c8")
        c.poly([(hx0, hy0 + 1), (hx0 - L(2), hy0 - L(3)), (hx0 + L(1), hy0)], pal["horn"])
        c.poly([(hx0 + L(4), hy0), (hx0 + L(5), hy0 - L(3)), (hx0 + L(6), hy0 + 1)], pal["horn"])
        limb(c, fs, fhand, skin, aw + 1, L(4), L(4), -1)
        _club(c, fhand, p["wang"], L(13), pal)
    elif style == "knight":
        _draw_knight(c, pal, p, hip, sx, sy, fs, bs, ffoot, bfoot, fhand, bhand, k, ground, hx)
    elif style in ("smith", "alchemist"):
        skin = pal["skin"]
        limb(c, (hip[0] - 1, hip[1]), bfoot, shade(pal["pants"], 0.75), lw, L(5), L(5), 1)
        limb(c, bs, bhand, shade(skin if style == "smith" else pal["robe"], 0.8), aw, L(4), L(4), -1)
        c.poly([(sx - 5, sy), (sx + 5, sy), (hip[0] + 5, hip[1] + 1), (hip[0] - 5, hip[1] + 1)], pal["shirt"])
        if style == "smith":
            c.poly([(sx - 2, sy + 2), (sx + 4, sy + 2), (hip[0] + 4, hip[1] + 5), (hip[0] - 3, hip[1] + 5)], pal["apron"])
        else:
            c.poly([(sx - 5, sy), (sx + 5, sy), (hip[0] + 6, ground), (hip[0] - 6, ground)], pal["robe"])
            c.rect(hip[0] - 5, hip[1], hip[0] + 5, hip[1], pal["trim"])
        limb(c, (hip[0] + 1, hip[1]), ffoot, pal["pants"], lw, L(5), L(5), 1)
        c.rect(ffoot[0] - 1, ffoot[1] - 1, ffoot[0] + 2, ffoot[1], pal["boots"])
        c.rect(bfoot[0] - 1, bfoot[1] - 1, bfoot[0] + 2, bfoot[1], shade(pal["boots"], 0.7))
        c.rect(hx0, hy0, hx1, hy1, skin)
        c.rect(hx0, hy0, hx1, hy0 + 2, pal["hair"])
        c.rect(hx0, hy0, hx0 + 2, hy1 - 2, pal["hair"])
        c.px(hx1 - 2, hy0 + 4, "#1a1420")
        if style == "smith":
            c.rect(hx0 + 3, hy1 - 2, hx1, hy1 + 1, pal["hair"])  # beard
        else:
            c.poly([(hx0 - 1, hy1), (hx0 - 1, hy0), (sx, hy0 - 3), (hx1 + 1, hy0), (hx1 + 1, hy0 + 2), (hx0 + 2, hy0 + 2), (hx0 + 2, hy1)], pal["robe"])
        limb(c, fs, fhand, skin if style == "smith" else pal["robe"], aw, L(4), L(4), -1)
        c.rect(fhand[0], fhand[1], fhand[0] + 1, fhand[1] + 1, skin)
        if style == "smith":
            hh = rot([(fhand[0] + 0.5, fhand[1] + 0.5), (fhand[0] + 7, fhand[1] + 0.5)], p["wang"], fhand[0] + 0.5, fhand[1] + 0.5)
            c.line(hh, pal["wood"], 1)
            hd = rot([(fhand[0] + 6, fhand[1] - 1.5), (fhand[0] + 9, fhand[1] - 1.5), (fhand[0] + 9, fhand[1] + 2.5), (fhand[0] + 6, fhand[1] + 2.5)],
                     p["wang"], fhand[0] + 0.5, fhand[1] + 0.5)
            c.poly(hd, "#6f7682")
        elif pal.get("book"):
            c.rect(fhand[0] - 1, fhand[1] - 5, fhand[0] + 4, fhand[1] + 1, pal["book"])
            c.rect(fhand[0] - 1, fhand[1] - 5, fhand[0], fhand[1] + 1, shade(pal["book"], 0.6))
            c.rect(fhand[0] + 1, fhand[1] - 4, fhand[0] + 3, fhand[1] - 4, "#f0e6c0")
            c.rect(fhand[0] + 1, fhand[1] - 2, fhand[0] + 3, fhand[1] - 2, "#f0e6c0")
        else:
            c.rect(fhand[0] + 1, fhand[1] - 4, fhand[0] + 3, fhand[1], "#bfe8ff")
            c.rect(fhand[0] + 1, fhand[1] - 2, fhand[0] + 3, fhand[1], pal["potion"])
            c.px(fhand[0] + 2, fhand[1] - 5, "#8a6040")
    return c


def _blade(c, hand, ang, length, col, col_d, hilt, width=2):
    hxp, hyp = hand[0] + 0.5, hand[1] + 0.5
    blade = rot([(hxp + 2, hyp - width / 2), (hxp + length, hyp - width / 2), (hxp + length + 1, hyp), (hxp + length, hyp + width / 2), (hxp + 2, hyp + width / 2)], ang, hxp, hyp)
    c.poly(blade, col)
    c.line(rot([(hxp + 3, hyp + width / 2), (hxp + length, hyp + width / 2)], ang, hxp, hyp), col_d)
    c.line(rot([(hxp - 2, hyp), (hxp + 1, hyp)], ang, hxp, hyp), hilt, 2)
    c.poly(rot([(hxp + 1, hyp - 2), (hxp + 2, hyp - 2), (hxp + 2, hyp + 2), (hxp + 1, hyp + 2)], ang, hxp, hyp), hilt)


def _club(c, hand, ang, length, pal):
    hxp, hyp = hand[0] + 0.5, hand[1] + 0.5
    shaft = rot([(hxp - 3, hyp), (hxp + length * 0.55, hyp)], ang, hxp, hyp)
    c.line(shaft, pal["wood"], 3)
    head = rot([(hxp + length * 0.45, hyp - 3), (hxp + length, hyp - 5), (hxp + length + 2, hyp), (hxp + length, hyp + 5), (hxp + length * 0.45, hyp + 3)], ang, hxp, hyp)
    c.poly(head, pal["wood"])
    c.poly(rot([(hxp + length * 0.5, hyp + 1), (hxp + length, hyp + 3), (hxp + length + 1, hyp), (hxp + length * 0.5, hyp + 3)], ang, hxp, hyp), pal["wood_d"])
    for t in (0.6, 0.78, 0.95):
        for sgn in (-1, 1):
            sp = rot([(hxp + length * t, hyp + sgn * 3.5), (hxp + length * t, hyp + sgn * 5.5)], ang, hxp, hyp)
            c.line(sp, "#c9ced6")


def _draw_knight(c, pal, p, hip, sx, sy, fs, bs, ffoot, bfoot, fhand, bhand, k, ground, hx):
    L = lambda v: v * k  # noqa: E731
    arm, arm_d, arm_l = pal["armor"], pal["armor_d"], pal["armor_l"]
    ember = pal["ember"]
    sway = p["cape"]
    # tattered cape
    cape = [(sx - L(4), sy), (sx + L(1), sy), (hx - L(1), ground - L(3)), (hx - L(4), ground - L(1)),
            (hx - L(6) - sway, ground - L(3)), (hx - L(8) - sway, ground - L(1)), (hx - L(9) - sway, ground - L(6))]
    c.poly(cape, pal["cape"])
    c.poly([(sx - L(4), sy), (sx - L(2), sy), (hx - L(7) - sway, ground - L(4)), (hx - L(9) - sway, ground - L(6))], shade(pal["cape"], 0.7))
    lw = round(3.2 * k)
    limb(c, (hip[0] - L(1), hip[1]), bfoot, arm_d, lw, L(5), L(5), 1)
    c.rect(bfoot[0] - L(1.5), bfoot[1] - L(1.2), bfoot[0] + L(2.5), bfoot[1], shade(arm_d, 0.8))
    limb(c, bs, bhand, arm_d, round(2.4 * k), L(4), L(4), -1)
    # torso plate
    c.poly([(sx - L(5), sy), (sx + L(5), sy), (hip[0] + L(4.5), hip[1]), (hip[0] - L(4.5), hip[1])], arm)
    c.poly([(sx - L(5), sy), (sx - L(2), sy), (hip[0] - L(2), hip[1]), (hip[0] - L(4.5), hip[1])], arm_d)
    c.rect(sx + L(1), sy + L(1), sx + L(2), sy + L(4), arm_l)
    # ember cracks
    c.line([(sx - L(1), sy + L(2)), (sx + L(1), sy + L(4)), (sx, sy + L(6))], ember)
    c.px(sx + L(1), sy + L(4), "#ffe2a0")
    c.rect(hip[0] - L(4.5), hip[1] - L(1.2), hip[0] + L(4.5), hip[1] - L(0.4), shade(arm_d, 0.7))
    # skirt plates
    c.poly([(hip[0] - L(5), hip[1]), (hip[0] + L(5), hip[1]), (hip[0] + L(4), hip[1] + L(3)), (hip[0] - L(5), hip[1] + L(3))], arm_d)
    limb(c, (hip[0] + L(1), hip[1]), ffoot, arm, lw, L(5), L(5), 1)
    c.rect(ffoot[0] - L(1.5), ffoot[1] - L(1.2), ffoot[0] + L(2.5), ffoot[1], arm_d)
    # horned helm
    hx0, hy0, hx1, hy1 = sx - L(4.5), sy - L(9), sx + L(4.5), sy - L(0.5)
    c.rect(hx0, hy0, hx1, hy1, arm)
    c.rect(hx0, hy0, hx0 + L(2), hy1, arm_d)
    c.rect(hx0 + L(3), hy0 + L(3.5), hx1, hy0 + L(4.5), "#0e0a10")   # visor slit
    c.rect(hx1 - L(3), hy0 + L(3.6), hx1 - L(1.8), hy0 + L(4.4), ember)
    c.rect(hx1 - L(1.2), hy0 + L(3.6), hx1 - L(0.4), hy0 + L(4.4), ember)
    c.rect(hx0 + L(1), hy0, hx1 - L(1), hy0 + L(0.6), arm_l)
    c.poly([(hx0 + L(1), hy0 + L(1)), (hx0 - L(3), hy0 - L(4)), (hx0 - L(2), hy0 - L(6)), (hx0 - L(0.5), hy0 - L(2)), (hx0 + L(2.5), hy0)], pal["horn"])
    c.poly([(hx1 - L(2), hy0), (hx1 + L(1), hy0 - L(5)), (hx1 + L(2), hy0 - L(4)), (hx1, hy0 + L(1))], pal["horn"])
    # front arm, pauldron, greatsword
    limb(c, fs, fhand, arm, round(2.6 * k), L(4), L(4), -1)
    c.ellipse(fs[0] - L(3), fs[1] - L(3), fs[0] + L(2), fs[1] + L(1.5), arm_l)
    c.ellipse(fs[0] - L(2.5), fs[1] - L(1.5), fs[0] + L(1.5), fs[1] + L(1.5), arm)
    hxp, hyp = fhand[0] + 0.5, fhand[1] + 0.5
    ang = p["wang"]
    blen = L(19)
    blade = rot([(hxp + L(2), hyp - L(1.6)), (hxp + blen, hyp - L(1.6)), (hxp + blen + L(2), hyp), (hxp + blen, hyp + L(1.6)), (hxp + L(2), hyp + L(1.6))], ang, hxp, hyp)
    c.poly(blade, pal["blade"])
    c.poly(rot([(hxp + L(2), hyp + L(0.3)), (hxp + blen, hyp + L(0.3)), (hxp + blen + L(2), hyp), (hxp + blen, hyp + L(1.6)), (hxp + L(2), hyp + L(1.6))], ang, hxp, hyp), shade(pal["blade"], 0.7))
    c.line(rot([(hxp + L(4), hyp - L(1.6)), (hxp + blen, hyp - L(1.6))], ang, hxp, hyp), ember if p["glow"] else shade(pal["blade"], 1.3))
    c.poly(rot([(hxp + L(1), hyp - L(4)), (hxp + L(2.2), hyp - L(4)), (hxp + L(2.2), hyp + L(4)), (hxp + L(1), hyp + L(4))], ang, hxp, hyp), pal["horn"])
    c.line(rot([(hxp - L(3), hyp), (hxp + L(1), hyp)], ang, hxp, hyp), "#3a2418", round(1.6 * k))
    c.rect(fhand[0] - L(0.5), fhand[1] - L(0.5), fhand[0] + L(1.5), fhand[1] + L(1.5), arm_d)
    if p["glow"]:
        for i in range(3 + p["glow"]):
            t = (i + 1) / (4 + p["glow"])
            pt = rot([(hxp + blen * t, hyp - L(2.6))], ang, hxp, hyp)[0]
            c.px(pt[0], pt[1], ember if i % 2 else "#ffd27a")


def finish(canvas, lying=False, ground=None):
    """Outline, optionally rotate to lying pose. Returns PIL image."""
    im = canvas.im
    if lying:
        w, h = im.size
        bb = im.getbbox()
        if bb:
            part = im.crop(bb).rotate(90, expand=True)
            out = canvas.__class__(w, h)
            gx = (w - part.width) // 2 - 2
            gy = (ground if ground is not None else h - 3) - part.height + 1
            out.paste(part, gx, gy)
            im = out.im
    return outline(im)
