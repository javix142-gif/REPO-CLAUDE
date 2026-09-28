"""Generate original pixel art for Umbral de Ceniza. Requires Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw
import math
import random

OUT = Path(__file__).resolve().parent / "assets"
OUT.mkdir(parents=True, exist_ok=True)
R = Image.Resampling.NEAREST
random.seed(17)


def save_scaled(im, name, factor=2):
    im.resize((im.width * factor, im.height * factor), R).save(OUT / name)


def hero(name, stride=0, sword=False):
    im = Image.new("RGBA", (48, 48))
    d = ImageDraw.Draw(im)
    # Deep teal cloak, brass trim, bone mask and a copper blade.
    d.polygon([(15, 14), (31, 14), (35, 37), (29, 43), (12, 42), (11, 34)], fill="#102e3b")
    d.polygon([(17, 14), (31, 14), (33, 34), (29, 40), (15, 39)], fill="#176072")
    d.rectangle((17, 32, 29, 36), fill="#bb7e38")
    d.rectangle((17, 35, 24, 41), fill="#173641")
    d.rectangle((27, 35, 33, 41), fill="#173641")
    d.rectangle((16 + stride, 40, 22 + stride, 45), fill="#15202c")
    d.rectangle((26 - stride, 40, 33 - stride, 45), fill="#15202c")
    d.rectangle((14, 13, 34, 28), fill="#10252f")
    d.polygon([(14, 15), (17, 7), (30, 5), (36, 14), (32, 19), (17, 19)], fill="#1e6572")
    d.polygon([(19, 17), (30, 17), (29, 27), (21, 28), (17, 24)], fill="#c2c9b5")
    d.rectangle((21, 19, 28, 21), fill="#1c2b30")
    d.rectangle((25, 19, 27, 20), fill="#f5be6c")
    d.rectangle((13, 28, 18, 36), fill="#bb7e38")
    d.rectangle((32, 28, 37, 36), fill="#bb7e38")
    if sword:
        d.polygon([(35, 29), (45, 9), (47, 9), (40, 31)], fill="#e9d9a5")
        d.line([(33, 30), (41, 34)], fill="#f0a64f", width=3)
    else:
        d.polygon([(36, 32), (39, 11), (42, 10), (40, 34)], fill="#d6dde0")
        d.line([(33, 32), (42, 33)], fill="#f0b357", width=2)
    save_scaled(im, name)


hero("hero_idle.png")
hero("hero_run_1.png", 2)
hero("hero_run_2.png", -2)
hero("hero_attack.png", sword=True)


def shadow_enemy(name, horn=0):
    im = Image.new("RGBA", (44, 44))
    d = ImageDraw.Draw(im)
    d.ellipse((6, 9, 39, 42), fill="#221c35")
    d.polygon([(10, 17), (9, 3), (19, 12), (26, 12), (36, 3), (34, 18)], fill="#322740")
    d.polygon([(12, 8), (17, 13), (13, 15)], fill="#6b4468")
    d.polygon([(34, 8), (28, 13), (34, 15)], fill="#6b4468")
    d.rectangle((13, 23, 18, 26), fill="#ed6774")
    d.rectangle((27, 23, 32, 26), fill="#ed6774")
    d.rectangle((11, 32, 36, 39), fill="#181c2b")
    for x in (10, 19, 29):
        d.polygon([(x, 37), (x+5, 37), (x+3, 44)], fill="#687184")
    if horn:
        d.polygon([(17, 14), (20, 0), (25, 13)], fill="#6d7891")
    save_scaled(im, name, 2)


shadow_enemy("enemy.png")
shadow_enemy("enemy_elite.png", 1)

boss = Image.new("RGBA", (72, 72))
d = ImageDraw.Draw(boss)
d.ellipse((10, 11, 62, 67), fill="#1a2034")
d.polygon([(14, 22), (13, 2), (29, 18), (43, 17), (58, 2), (59, 24)], fill="#4b385a")
d.polygon([(19, 22), (52, 22), (56, 51), (46, 63), (25, 63), (16, 50)], fill="#40304f")
d.polygon([(23, 25), (49, 25), (47, 43), (26, 43)], fill="#222339")
d.rectangle((25, 30, 32, 34), fill="#ff8b80")
d.rectangle((41, 30, 48, 34), fill="#ff8b80")
d.polygon([(28, 45), (44, 45), (36, 51)], fill="#b8a3b0")
for x in (15, 26, 43, 54):
    d.polygon([(x, 57), (x+6, 57), (x+3, 69)], fill="#687184")
save_scaled(boss, "boss.png", 2)

slash = Image.new("RGBA", (72, 56))
d = ImageDraw.Draw(slash)
d.arc((1, 1, 69, 55), 295, 72, fill="#fbe3a4", width=5)
d.arc((7, 7, 67, 53), 295, 70, fill="#ef9c52", width=3)
d.polygon([(54, 3), (70, 7), (65, 21)], fill="#fff1c9")
save_scaled(slash, "slash.png", 2)

orb = Image.new("RGBA", (24, 24))
d = ImageDraw.Draw(orb)
d.ellipse((1, 1, 22, 22), fill="#32767b")
d.ellipse((4, 4, 19, 19), fill="#65d3ba")
d.rectangle((10, 5, 13, 18), fill="#e0fff2")
d.rectangle((5, 10, 18, 13), fill="#e0fff2")
save_scaled(orb, "heal_orb.png", 2)

gate = Image.new("RGBA", (96, 144))
d = ImageDraw.Draw(gate)
d.polygon([(11, 137), (11, 35), (25, 13), (71, 13), (85, 35), (85, 137)], fill="#343143")
d.polygon([(26, 137), (26, 42), (35, 29), (61, 29), (70, 42), (70, 137)], fill="#0d2534")
d.ellipse((30, 47, 66, 107), fill="#206879")
d.ellipse((37, 52, 59, 103), fill="#6ac8b4")
d.rectangle((8, 129, 88, 142), fill="#786269")
for x in (16, 76):
    d.rectangle((x, 35, x+4, 122), fill="#967577")
save_scaled(gate, "gate.png", 1)

# Landscape at 1/4 logical resolution. It repeats seamlessly under the static sky camera.
bg = Image.new("RGB", (320, 180), "#101a2d")
d = ImageDraw.Draw(bg)
for y in range(180):
    t = y / 180
    d.line((0, y, 319, y), fill=(int(14+20*t), int(25+20*t), int(42+27*t)))
d.ellipse((236, 18, 268, 50), fill="#c7c0ab")
d.ellipse((244, 13, 274, 46), fill="#142033")
for x,y,r in [(19,24,1),(62,45,1),(92,18,1),(121,37,1),(182,26,1),(301,38,1),(284,20,1)]:
    d.rectangle((x,y,x+r,y+r), fill="#adbcc2")
d.polygon([(0,108),(35,66),(70,107),(109,61),(157,106),(200,74),(250,108),(294,67),(320,106),(320,180),(0,180)], fill="#253449")
d.polygon([(0,132),(50,93),(97,132),(146,87),(201,131),(266,89),(320,130),(320,180),(0,180)], fill="#1c2f3d")
for x in range(-12, 340, 28):
    height = 17 + ((x*7) % 15)
    d.rectangle((x, 128-height, x+5, 155), fill="#142733")
    d.polygon([(x-7,135-height),(x+2,108-height),(x+12,135-height)], fill="#1a333a")
    d.polygon([(x-5,123-height),(x+2,100-height),(x+10,123-height)], fill="#21413f")
for x in (39, 175, 292):
    d.rectangle((x, 86, x+12, 151), fill="#1e2735")
    d.rectangle((x-4, 83, x+16, 89), fill="#394150")
    d.polygon([(x-2,84),(x+6,72),(x+14,84)], fill="#384157")
    d.rectangle((x+5,101,x+7,114), fill="#d08565")
save_scaled(bg, "background.png", 4)

ground = Image.new("RGBA", (32, 32), "#443e45")
d = ImageDraw.Draw(ground)
d.rectangle((0, 0, 31, 4), fill="#52746b")
d.rectangle((0, 4, 31, 7), fill="#827465")
for i in range(42):
    x=random.randrange(32);y=random.randrange(9,32)
    d.rectangle((x,y,x+random.randrange(1,4),y+1), fill=random.choice(["#5d5153","#2e3039","#6d5b5b"]))
save_scaled(ground, "ground.png", 2)

def button(name, symbol, color):
    im=Image.new("RGBA", (52,52));d=ImageDraw.Draw(im)
    d.ellipse((1,1,50,50), fill="#142638", outline="#5b6973", width=2)
    d.ellipse((6,6,45,45), fill="#283e4d", outline=color, width=2)
    if symbol=="up":
        d.polygon([(26,10),(38,30),(30,30),(30,39),(22,39),(22,30),(14,30)], fill=color)
    elif symbol=="sword":
        d.polygon([(15,33),(33,12),(39,11),(37,17),(19,37)], fill=color)
        d.line((13,28,24,39), fill="#efe1bf", width=4)
    elif symbol=="dash":
        d.polygon([(17,13),(36,26),(17,39),(21,28),(9,28),(9,24),(21,24)], fill=color)
    save_scaled(im,name,2)

button("jump_button.png","up","#6ad6c0")
button("attack_button.png","sword","#f6b065")
button("dash_button.png","dash","#c28bd4")

joy=Image.new("RGBA",(70,70));d=ImageDraw.Draw(joy)
d.ellipse((2,2,67,67),fill="#142638",outline="#6d7e83",width=3)
d.ellipse((12,12,57,57),outline="#4b8d8e",width=2)
save_scaled(joy,"joystick_border.png",2)
thumb=Image.new("RGBA",(32,32));d=ImageDraw.Draw(thumb)
d.ellipse((1,1,30,30),fill="#567f86",outline="#93d0c5",width=2)
save_scaled(thumb,"joystick_thumb.png",2)

bar=Image.new("RGBA",(220,18),"#b84f5d")
d=ImageDraw.Draw(bar);d.rectangle((0,0,219,3),fill="#e1887b")
bar.save(OUT/"health_fill.png")
print("Generated", len(list(OUT.glob('*.png'))), "assets in",OUT)
