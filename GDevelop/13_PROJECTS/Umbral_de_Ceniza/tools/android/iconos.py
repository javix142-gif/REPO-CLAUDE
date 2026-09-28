"""Launcher icons for the test APK (called by tools/build_apk.mjs).

Usage: python3 iconos.py <output res dir>

- mipmap-*dpi/ic_launcher.png: the game's square icon (source/assets/icono, the same one GDevelop uses).
- Adaptive icon (Android 8+): 108 dp layers drawn with the same art library as the square icon: background = the
  burning gate of the title screen, foreground = the sword, kept inside the 66 dp safe zone so no launcher mask
  (circle, squircle...) crops it.
"""
import os
import shutil
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.normpath(os.path.join(HERE, "..", "..", "source"))
sys.path.insert(0, SOURCE)

from art.env import title_background  # noqa: E402
from art.ui import icon  # noqa: E402

# density -> (48 dp square icon, 108 dp adaptive layer) in pixels
DENSITIES = {"mdpi": (48, 108), "hdpi": (72, 162), "xhdpi": (96, 216), "xxhdpi": (144, 324), "xxxhdpi": (192, 432)}
ART = 72  # art pixels per 108 dp layer: 48 art px across the 72 visible dp, like the square icon


def layers():
    # Same framing as ui.app_icon (240x240 around the gate), at 72 art px.
    back = title_background().crop((95, 0, 335, 240)).resize((ART, ART), Image.Resampling.BOX).convert("RGBA")
    front = Image.new("RGBA", (ART, ART), (0, 0, 0, 0))
    sword = icon("sword", size=30)  # 30 art px, as in the square icon
    front.alpha_composite(sword, ((ART - 30) // 2, (ART - 30) // 2))
    return back, front


def main(res):
    back, front = layers()
    for density, (square, layer) in DENSITIES.items():
        folder = os.path.join(res, f"mipmap-{density}")
        os.makedirs(folder, exist_ok=True)
        shutil.copyfile(os.path.join(SOURCE, "assets", "icono", f"icono_{square}.png"), os.path.join(folder, "ic_launcher.png"))
        back.resize((layer, layer), Image.Resampling.NEAREST).save(os.path.join(folder, "ic_launcher_fondo.png"))
        front.resize((layer, layer), Image.Resampling.NEAREST).save(os.path.join(folder, "ic_launcher_frente.png"))
    print(f"iconos: {len(DENSITIES)} densities in {res}")


if __name__ == "__main__":
    main(sys.argv[1])
