"""Generate ALL original pixel art for Umbral de Ceniza + assets/manifest.json.

Requires Pillow. Run from anywhere:  python make_art.py
Every image is drawn at art resolution and upscaled x3 (nearest) so the whole
game shares one pixel density (see VISUAL_CONTRACT.md). The manifest describes
sprite objects (animations, frame timing, origin, collision mask) and is read
by tools/build_project.mjs to create the GDevelop project.
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

from art.pixel import scale
from art import figures, creatures, fx, env, ui

HERE = Path(__file__).resolve().parent
OUT = HERE / "assets"
K = 3
FONT_TITLE = HERE / "fonts" / "Jersey10-Regular.ttf"

manifest = {"scale": K, "sprites": {}, "images": {}}


def save(img, rel, k=K):
    p = OUT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    (scale(img, k) if k != 1 else img).save(p, optimize=True)
    return "assets/" + rel


def add_anim(obj, name, frames, dt, loop, origin=None, mask=None, center_origin=False):
    entry = manifest["sprites"].setdefault(obj, {"anims": []})
    w, h = frames[0].width * K, frames[0].height * K
    if center_origin:
        origin = (w // 2, h // 2)
    entry["anims"].append({"name": name, "frames": frames_paths[obj + ":" + name], "dt": dt, "loop": loop,
                           "origin": list(origin) if origin else [0, 0],
                           "mask": [list(p) for p in mask] if mask else None, "size": [w, h]})


frames_paths: dict[str, list[str]] = {}


def sprite(obj, name, frames, folder, dt=0.1, loop=True, origin=None, mask=None, center=False, prefix=None):
    base = (prefix or f"{obj}_{name}").lower()
    paths = [save(im, f"{folder}/{base}_{i}.png") for i, im in enumerate(frames)]
    frames_paths[obj + ":" + name] = paths
    add_anim(obj, name, frames, dt, loop, origin, mask, center)


def box(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for child in OUT.iterdir():  # keep assets/audio (written by make_audio.py)
        if child.is_dir() and child.name != "audio":
            shutil.rmtree(child)

    # ---------------------------------------------------------------- heroes
    timing = {"Idle": (0.14, True), "Run": (0.08, True), "Jump": (0.1, True), "Fall": (0.1, True),
              "Attack": (0.06, False), "Attack2": (0.06, False), "Attack3": (0.07, False),
              "AttackDiag": (0.06, False), "AttackUp": (0.06, False),
              "Cast": (0.09, False), "Hurt": (0.1, False), "Dead": (0.16, False)}
    hero_mask = box(60, 45, 87, 126)
    portraits = {}
    for cls in ("Guerrero", "Maga", "Arquera"):
        anims = figures.hero_poses(cls)
        for an, poses in anims.items():
            imgs = []
            for p in poses:
                if p == "LYING":
                    imgs.append(figures.finish(figures.draw_hero(cls, anims["Dead"][1]), lying=True, ground=41))
                else:
                    imgs.append(figures.finish(figures.draw_hero(cls, p)))
            dt, loop = timing[an]
            sprite("Jugador", f"{cls}_{an}", imgs, "jugador", dt, loop, origin=(72, 126), mask=hero_mask)
            if an == "Idle":
                portraits[cls] = imgs[0]
    # preview for class selection (same resources, no behaviours)
    for cls in ("Guerrero", "Maga", "Arquera"):
        for an in ("Idle", "Attack", "Cast"):
            frames_paths[f"HeroePreview:{cls}_{an}"] = frames_paths[f"Jugador:{cls}_{an}"]
            src = next(a for a in manifest["sprites"]["Jugador"]["anims"] if a["name"] == f"{cls}_{an}")
            manifest["sprites"].setdefault("HeroePreview", {"anims": []})["anims"].append(
                dict(src, loop=(an == "Idle"), mask=None, dt=src["dt"] * (2 if an != "Idle" else 1)))
    for cls, im in portraits.items():
        sprite("Retrato", cls, [ui.portrait(im)], "ui", 1, False, center=True)

    # ---------------------------------------------------------------- enemies
    E = "Enemigo"
    ct = {"Idle": (0.3, True), "Walk": (0.14, True), "Attack": (0.11, False), "Cast": (0.13, False),
          "Hurt": (0.12, False), "Dead": (0.12, False), "Fly": (0.08, True), "Slash": (0.1, False),
          "Charge": (0.07, True), "Slam": (0.11, False), "Summon": (0.16, False), "Sweep": (0.11, False)}
    geo = {"Esqueleto": ((60, 126), box(48, 45, 75, 126)),
           "Cultista": ((60, 126), box(45, 45, 78, 126)),
           "Bruto": ((90, 162), box(60, 57, 117, 162)),
           "Jefe": ((165, 354), box(129, 171, 201, 354)),
           "Arquero": ((60, 126), box(48, 45, 75, 126)),
           "Golem": ((114, 205), box(76, 72, 148, 205)),
           "Coloso": ((156, 291), box(104, 109, 203, 291)),
           "Reina": ((165, 354), box(129, 171, 201, 354))}
    for name in ("Esqueleto", "Cultista", "Bruto", "Jefe", "Arquero", "Golem", "Coloso", "Reina"):
        A = creatures.creature_frames(name)
        origin, mask = geo[name]
        for an, imgs in A.items():
            dt, loop = ct[an]
            if name == "Jefe" and an == "Idle":
                dt = 0.18
            sprite(E, f"{name}_{an}", imgs, "enemigos", dt, loop, origin=origin, mask=mask)
    for an, imgs in creatures.bat_frames().items():
        dt, loop = ct[an]
        sprite(E, f"Murcielago_{an}", imgs, "enemigos", dt if an != "Attack" else 0.06, loop if an != "Attack" else True,
               origin=(54, 42), mask=box(27, 21, 81, 63))
    for an, imgs in creatures.ghost_frames().items():
        dt, loop = {"Fly": (0.14, True), "Cast": (0.13, False), "Hurt": (0.12, False), "Dead": (0.12, False)}[an]
        sprite(E, f"Espectro_{an}", imgs, "enemigos", dt, loop, origin=(60, 66), mask=box(33, 30, 87, 120))
    for nm, size, origin, mask in (("Limo", 1.0, (60, 93), box(24, 45, 96, 93)), ("LimoMini", 0.6, (36, 56), box(14, 27, 58, 56))):
        for an, imgs in creatures.slime_frames(size).items():
            dt, loop = {"Idle": (0.35, True), "Walk": (0.1, True), "Hurt": (0.12, False), "Dead": (0.12, False)}[an]
            sprite(E, f"{nm}_{an}", imgs, "enemigos", dt, loop, origin=origin, mask=mask)
    for an, imgs in creatures.dummy_frames().items():
        sprite(E, f"Maniqui_{an}", imgs, "enemigos", 0.07, an == "Idle", origin=(48, 126), mask=box(27, 36, 69, 126))

    # ---------------------------------------------------------------- NPCs
    for name in ("Herrera", "Alquimista", "Archivista"):
        A = creatures.creature_frames(name)
        sprite("NPC", f"{name}_Idle", A["Idle"], "npc", 0.22 if name == "Herrera" else 0.35, True, origin=(66, 126))

    # ---------------------------------------------------------------- projectiles
    PJ = "ProyectilJugador"
    sprite(PJ, "Fuego", fx.fireball_frames(), "proyectiles", 0.06, True, center=True)
    sprite(PJ, "Flecha", fx.arrow_frame(), "proyectiles", 1, True, center=True)
    sprite(PJ, "Meteoro", fx.meteor_frames(), "proyectiles", 0.06, True, center=True)
    sprite(PJ, "Hielo", fx.ice_shard_frame(), "proyectiles", 1, True, center=True)
    sprite(PJ, "Espada", fx.sword_spin_frames(), "proyectiles", 0.05, True, center=True)
    sprite(PJ, "Explosiva", fx.explosive_arrow_frame(), "proyectiles", 1, True, center=True)
    PE = "ProyectilEnemigo"
    sprite(PE, "Orbe", fx.orb_frames(), "proyectiles", 0.1, True, center=True)
    sprite(PE, "Onda", fx.shockwave_frames(), "proyectiles", 0.08, True, center=True)
    sprite(PE, "Flecha", fx.arrow_frame(), "proyectiles", 1, True, center=True)
    sprite(PE, "OrbeRojo", fx.orb_frames("#ff4a5a"), "proyectiles", 0.1, True, center=True)
    sprite(PE, "Roca", fx.rock_frames(), "proyectiles", 0.1, True, center=True)
    sprite(PE, "Cristal", fx.rock_frames(True), "proyectiles", 0.1, True, center=True)

    # ---------------------------------------------------------------- effects
    F = "Efecto"
    sprite(F, "Tajo", fx.slash_frames(), "fx", 0.05, False, center=True)
    sprite(F, "Torbellino", fx.whirl_frames(), "fx", 0.05, True, center=True)
    sprite(F, "Nova", fx.nova_frames(), "fx", 0.06, False, center=True)
    sprite(F, "Explosion", fx.explosion_frames(), "fx", 0.06, False, center=True)
    sprite(F, "Impacto", fx.meteor_impact_frames(), "fx", 0.06, False, center=True)
    sprite(F, "Chispa", fx.spark_frames(), "fx", 0.04, False, center=True)
    sprite(F, "ChispaHielo", fx.spark_frames("#e0f8ff", "#6ac8ff"), "fx", 0.04, False, center=True)
    sprite(F, "ChispaRoja", fx.spark_frames("#ffd0d0", "#ff4a4a"), "fx", 0.04, False, center=True)
    sprite(F, "Curacion", fx.heal_frames(), "fx", 0.1, False, center=True)
    sprite(F, "Nivel", fx.levelup_frames(), "fx", 0.1, False, center=True)
    sprite(F, "Escudo", fx.shield_frames(), "fx", 0.2, True, center=True)
    sprite(F, "Portal", fx.portal_frames(), "fx", 0.08, False, center=True)
    sprite(F, "PortalFuego", fx.portal_frames("#ff8a3a", "#3a1008"), "fx", 0.08, False, center=True)
    sprite(F, "Polvo", fx.dust_frames(), "fx", 0.06, False, center=True)
    sprite(F, "Humo", fx.smoke_frames(), "fx", 0.08, False, center=True)
    sprite(F, "Grito", fx.warcry_frames(), "fx", 0.07, False, center=True)
    sprite(F, "Destello", fx.flash_frames(), "fx", 0.04, False, center=True)
    sprite(F, "Salto", fx.jump_ring_frames(), "fx", 0.05, False, center=True)
    sprite(F, "Aviso", fx.warning_frames(), "fx", 0.12, True, center=True)
    sprite(F, "Rayo", fx.lightning_frames(), "fx", 0.05, False, origin=(51, 348))
    sprite(F, "Aura", fx.aura_frames(), "fx", 0.08, True, center=True)

    # ---------------------------------------------------------------- pickups
    sprite("Moneda", "Gira", fx.coin_frames(), "botin", 0.09, True, center=True)
    sprite("OrbeVida", "Brilla", fx.life_orb_frames(), "botin", 0.2, True, center=True)
    rar_col = ["#ffffff", "#e1e1e1", "#5aaaff", "#ffd746", "#c46eff", "#ff912d"]
    for kind in ("Espada", "Baculo", "Arco", "Armadura"):
        for r in range(1, 6):
            img = fx.loot_with_beam(kind, rar_col[r], r)
            sprite("Botin", f"{kind}_{r}", [img], "botin", 1, False, origin=(img.width * K // 2, img.height * K))
    # invisible hitbox texture (semi-transparent red if ever shown for debugging)
    from PIL import Image
    box_img = Image.new("RGBA", (16, 16), (255, 40, 40, 90))
    (OUT / "sistema").mkdir(parents=True, exist_ok=True)
    box_img.save(OUT / "sistema" / "caja.png")
    # app icons (Android / desktop)
    for size in (36, 48, 72, 96, 144, 192, 512):
        p = OUT / "icono" / f"icono_{size}.png"
        p.parent.mkdir(parents=True, exist_ok=True)
        ui.app_icon(size).save(p)
        manifest["images"][f"icono_{size}"] = f"assets/icono/icono_{size}.png"

    # ---------------------------------------------------------------- environment
    for theme in ("mazmorra", "fortaleza", "abismo"):
        manifest["images"][f"fondo_{theme}_lejos"] = save(env.dungeon_far(theme), f"entorno/fondo_{theme}_lejos.png")
        manifest["images"][f"fondo_{theme}_medio"] = save(env.dungeon_mid(theme), f"entorno/fondo_{theme}_medio.png")
        manifest["images"][f"muro_{theme}"] = save(env.wall_tile(theme), f"entorno/muro_{theme}.png")
    for theme in ("mazmorra", "fortaleza", "abismo", "pueblo"):
        manifest["images"][f"suelo_{theme}"] = save(env.ground_tile(theme), f"entorno/suelo_{theme}.png")
        manifest["images"][f"relleno_{theme}"] = save(env.fill_tile(theme), f"entorno/relleno_{theme}.png")
        manifest["images"][f"plataforma_{theme}"] = save(env.platform_tile(theme), f"entorno/plataforma_{theme}.png")
    manifest["images"]["cielo_pueblo"] = save(env.town_sky(), "entorno/cielo_pueblo.png")
    manifest["images"]["casas_pueblo"] = save(env.town_houses(), "entorno/casas_pueblo.png")

    for an, imgs in env.gate_frames("mazmorra").items():
        sprite("Puerta", an, imgs, "entorno", 0.25 if an == "Cerrada" else 0.1, an == "Cerrada", origin=(42, 276))
    sprite("Antorcha", "Arde", env.torch_frames(), "entorno", 0.12, True, origin=(60, 144))
    sprite("Estandarte", "Ondea", env.banner_frames(), "entorno", 0.45, True)
    sprite("Calaveras", "Quieto", [env.skull_pile()], "entorno", 1, False)
    sprite("Velas", "Arde", env.candles_frames(), "entorno", 0.3, True)
    sprite("Barril", "Quieto", [env.barrel()], "entorno", 1, False)
    sprite("Caja", "Quieto", [env.crate()], "entorno", 1, False)
    sprite("Cofre", "Cerrado", [env.chest(False)], "entorno", 1, False, origin=(42, 66))
    sprite("Cofre", "Abierto", [env.chest(True)], "entorno", 1, False, origin=(42, 66))
    sprite("Pinchos", "Quieto", [env.spikes()], "entorno", 1, False, origin=(72, 48), mask=box(6, 6, 138, 48))
    sprite("Farol", "Arde", env.lamp_frames(), "entorno", 0.35, True)
    sprite("Forja", "Arde", env.forge_frames(), "entorno", 0.12, True)
    sprite("Puesto", "Quieto", [env.potion_stand()], "entorno", 1, False)
    sprite("Pozo", "Quieto", [env.well()], "entorno", 1, False)
    sprite("Letrero", "Quieto", [env.signpost()], "entorno", 1, False)
    sprite("Arbol", "Quieto", [env.dead_tree()], "entorno", 1, False)
    sprite("Portal", "Mazmorra", env.portal_arch_frames("mazmorra"), "entorno", 0.1, True, origin=(78, 228),
           mask=box(40, 90, 116, 228))
    sprite("Portal", "Salida", env.portal_arch_frames("salida"), "entorno", 0.1, True, origin=(78, 228),
           mask=box(40, 90, 116, 228))
    sprite("FondoTitulo", "Quieto", [env.title_background()], "entorno", 1, False)

    # ---------------------------------------------------------------- UI
    for cls in ("Guerrero", "Maga", "Arquera"):
        sprite("BotonAtaque", cls, [ui.attack_button(cls)], "ui", 1, False, center=True)
        for s in range(3):
            sprite(f"BotonHab{s + 1}", cls, [ui.skill_button(cls, s)], "ui", 1, False, center=True)
            sprite(f"BotonHab{s + 1}", cls + "2", [ui.skill_button(cls, s, 2)], "ui", 1, False, center=True)
    sprite("BotonSalto", "Normal", [ui.simple_button("jump", 32, "#8ae8d0")], "ui", 1, False, center=True)
    sprite("BotonPocion", "Normal", [ui.simple_button("potion", 32, "#ff6a7a")], "ui", 1, False, center=True)
    sprite("BotonPausa", "Normal", [ui.simple_button("pause", 22, "#d8b04a")], "ui", 1, False, center=True)
    sprite("BotonAccion", "Normal", [ui.simple_button("talk", 32, "#ffd35a")], "ui", 1, False, center=True)
    sprite("MascaraCD", "Ciclo", ui.cooldown_frames(36, 16), "ui", 10, False, center=True)
    font_ui = str(HERE / "fonts" / "PixelifySans-SemiBold.ttf")
    sprite("BotonAuto", "Off", [ui.auto_button(False, font_ui)], "ui", 1, False, center=True)
    sprite("BotonAuto", "On", [ui.auto_button(True, font_ui)], "ui", 1, False, center=True)
    manifest["images"]["joystick_borde"] = save(ui.joystick_border(), "ui/joystick_borde.png")
    manifest["images"]["joystick_pulgar"] = save(ui.joystick_thumb(), "ui/joystick_pulgar.png")
    sprite("MarcoHUD", "Quieto", [ui.hud_frame()], "ui", 1, False)
    sprite("BarraVida", "Quieto", [ui.bar_fill(100, 7, "#ff5a5a", "#a81c2c")], "ui", 1, False)
    sprite("BarraMana", "Quieto", [ui.bar_fill(100, 5, "#6ab0ff", "#2a4aa8")], "ui", 1, False)
    sprite("BarraExp", "Quieto", [ui.bar_fill(100, 3, "#ffe07a", "#c08a1a")], "ui", 1, False)
    sprite("BarraJefeMarco", "Quieto", [ui.boss_bar_frame()], "ui", 1, False)
    sprite("BarraJefe", "Quieto", [ui.bar_fill(166, 7, "#ff8a3a", "#a8201c")], "ui", 1, False)
    for kind, obj in (("coin", "IconoMoneda"), ("skull", "IconoCalavera")):
        sprite(obj, "Quieto", [ui.icon(kind, size=18)], "ui", 1, False, center=True)
    sprite("Flecha", "Izq", [ui.simple_button("left", 26, "#d8b04a")], "ui", 1, False, center=True)
    sprite("Flecha", "Der", [ui.simple_button("right", 26, "#d8b04a")], "ui", 1, False, center=True)
    sprite("BotonCerrar", "Normal", [ui.simple_button("close", 24, "#d8b04a", pad=5)], "ui", 1, False, center=True)
    manifest["images"]["panel"] = save(ui.panel_texture(), "ui/panel.png")
    manifest["images"]["boton_menu"] = save(ui.menu_button_texture(), "ui/boton_menu.png")
    if FONT_TITLE.exists():
        sprite("Logo", "Quieto", [ui.logo(str(FONT_TITLE))], "ui", 1, False, center=True)

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1, ensure_ascii=False))
    n = sum(1 for _ in OUT.rglob("*.png"))
    print(f"Generated {n} PNG files in {OUT}")


if __name__ == "__main__":
    main()
