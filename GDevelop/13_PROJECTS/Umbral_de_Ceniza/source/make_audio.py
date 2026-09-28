"""Procedural (original) sound effects and music loops for Umbral de Ceniza.

Pure standard library (wave + math). Output: assets/audio/*.wav (22.05 kHz mono).
Run: python make_audio.py
"""
from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path

RATE = 22050
OUT = Path(__file__).resolve().parent / "assets" / "audio"


def write(name, samples, gain=0.9):
    OUT.mkdir(parents=True, exist_ok=True)
    peak = max(1e-6, max(abs(s) for s in samples))
    k = gain / peak if peak > gain else 1.0
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s * k)) * 32000)) for s in samples))


def env(i, n, a=0.01, r=None):
    t = i / RATE
    dur = n / RATE
    r = dur - a if r is None else r
    if t < a:
        return t / a
    return max(0.0, 1 - (t - a) / max(1e-4, r)) ** 2


def noise_burst(dur, lp=0.3, seed=1):
    rnd = random.Random(seed)
    n = int(dur * RATE)
    out, y = [], 0.0
    for i in range(n):
        y += lp * (rnd.uniform(-1, 1) - y)
        out.append(y * env(i, n, 0.003))
    return out


def tone(freq0, freq1, dur, wave_="sq", vol=0.5, a=0.005):
    n = int(dur * RATE)
    out, ph = [], 0.0
    for i in range(n):
        f = freq0 + (freq1 - freq0) * i / n
        ph += 2 * math.pi * f / RATE
        if wave_ == "sq":
            v = 1.0 if math.sin(ph) > 0 else -1.0
        elif wave_ == "tri":
            v = 2 / math.pi * math.asin(math.sin(ph))
        elif wave_ == "saw":
            v = ((ph / (2 * math.pi)) % 1) * 2 - 1
        else:
            v = math.sin(ph)
        out.append(v * vol * env(i, n, a))
    return out


def mixl(*tracks):
    n = max(len(t) for t in tracks)
    return [sum(t[i] for t in tracks if i < len(t)) for i in range(n)]


def delay(samples, secs, fb=0.35, mix=0.4):
    d = int(secs * RATE)
    out = list(samples) + [0.0] * d * 3
    for i in range(d, len(out)):
        out[i] += out[i - d] * fb * mix
    return out


def sfx():
    write("tajo.wav", mixl(noise_burst(0.16, 0.55, 2), tone(900, 300, 0.12, "saw", 0.15)))
    write("golpe.wav", mixl(noise_burst(0.1, 0.25, 3), tone(180, 60, 0.12, "sq", 0.5)))
    write("critico.wav", mixl(noise_burst(0.14, 0.3, 4), tone(300, 80, 0.16, "sq", 0.5), tone(1200, 600, 0.08, "sq", 0.2)))
    write("fuego.wav", mixl(noise_burst(0.3, 0.12, 5), tone(220, 110, 0.25, "saw", 0.2)))
    write("flecha.wav", mixl(noise_burst(0.12, 0.7, 6), tone(1400, 900, 0.08, "tri", 0.2)))
    write("explosion.wav", mixl(noise_burst(0.7, 0.08, 7), tone(120, 30, 0.6, "sq", 0.5)))
    write("hielo.wav", delay(mixl(tone(1500, 2400, 0.25, "tri", 0.3), tone(2000, 3000, 0.2, "sin", 0.2), noise_burst(0.2, 0.9, 8)), 0.06))
    write("grito.wav", mixl(tone(160, 120, 0.45, "saw", 0.4), tone(240, 170, 0.45, "sq", 0.2), noise_burst(0.3, 0.15, 9)))
    write("escudo.wav", delay(mixl(tone(500, 900, 0.35, "sin", 0.4), tone(750, 1350, 0.35, "tri", 0.25)), 0.08))
    write("salto.wav", tone(300, 600, 0.12, "sq", 0.25))
    write("moneda.wav", mixl(tone(1320, 1320, 0.06, "sq", 0.25), [0] * int(0.05 * RATE) + tone(1760, 1760, 0.14, "sq", 0.25)))
    write("pocion.wav", delay(mixl(tone(400, 800, 0.3, "sin", 0.4), tone(600, 1200, 0.3, "tri", 0.2)), 0.05))
    write("botin.wav", delay(mixl(*[[0] * int(i * 0.07 * RATE) + tone(f, f, 0.12, "tri", 0.35) for i, f in enumerate((660, 880, 1100, 1320))]), 0.09))
    write("nivel.wav", delay(mixl(*[[0] * int(i * 0.11 * RATE) + tone(f, f, 0.22, "sq", 0.22) for i, f in enumerate((523, 659, 784, 1046, 1318))]), 0.12))
    write("herido.wav", mixl(tone(400, 150, 0.18, "sq", 0.35), noise_burst(0.12, 0.4, 10)))
    write("muerte_enemigo.wav", mixl(tone(300, 60, 0.35, "saw", 0.3), noise_burst(0.3, 0.2, 11)))
    write("orbe.wav", mixl(tone(300, 500, 0.3, "sin", 0.35), tone(310, 520, 0.3, "tri", 0.2)))
    write("jefe_rugido.wav", mixl(tone(90, 55, 1.1, "saw", 0.55), tone(135, 80, 1.1, "sq", 0.25), noise_burst(1.0, 0.05, 12)))
    write("impacto_suelo.wav", mixl(noise_burst(0.5, 0.06, 13), tone(80, 30, 0.5, "sq", 0.6)))
    write("puerta.wav", mixl(noise_burst(0.8, 0.04, 14), tone(70, 50, 0.8, "saw", 0.3)))
    write("portal.wav", delay(mixl(tone(200, 800, 0.6, "sin", 0.35), tone(300, 1200, 0.6, "tri", 0.15)), 0.1))
    write("click.wav", tone(900, 700, 0.05, "sq", 0.2))
    write("victoria.wav", delay(mixl(*[[0] * int(i * 0.16 * RATE) + tone(f, f, 0.3, "sq", 0.2) for i, f in enumerate((392, 523, 659, 784, 1046))]), 0.14))
    write("derrota.wav", delay(mixl(*[[0] * int(i * 0.3 * RATE) + tone(f, f * 0.98, 0.5, "tri", 0.3) for i, f in enumerate((392, 349, 311, 262))]), 0.2))


NOTE = {n: 440 * 2 ** ((i - 9) / 12) for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def freq(name, octave):
    return NOTE[name] * 2 ** (octave - 4)


def music(name, prog, bpm, melody, lead_wave="sq", bass_oct=2, pad=True, bars=None):
    beat = 60 / bpm
    total = int(len(prog) * 4 * beat * RATE)
    out = [0.0] * total
    # bass + pad
    for bi, chord in enumerate(prog):
        root, quality = chord
        third = 3 if quality == "m" else 4
        rootf = freq(root, bass_oct)
        for b in range(4):
            start = int((bi * 4 + b) * beat * RATE)
            t = tone(rootf, rootf, beat * 0.9, "tri", 0.35)
            for i, v in enumerate(t):
                if start + i < total:
                    out[start + i] += v
        if pad:
            start = int(bi * 4 * beat * RATE)
            n = int(4 * beat * RATE)
            for semis in (0, third, 7):
                f = rootf * 2 * 2 ** (semis / 12)
                ph = 0
                for i in range(n):
                    ph += 2 * math.pi * f / RATE
                    a = min(1, i / (0.3 * RATE)) * min(1, (n - i) / (0.3 * RATE))
                    out[start + i] += 0.07 * a * math.sin(ph)
    # melody (list of (note, octave, beats) with None for rest)
    pos = 0.0
    for m in melody:
        n_, o, beats = m
        if n_:
            f = freq(n_, o)
            t = tone(f, f, beats * beat * 0.92, lead_wave, 0.16, 0.01)
            start = int(pos * beat * RATE)
            for i, v in enumerate(t):
                if start + i < total:
                    out[start + i] += v
        pos += beats
    # soft percussion
    for b in range(len(prog) * 4):
        start = int(b * beat * RATE)
        k = noise_burst(0.05, 0.1 if b % 2 == 0 else 0.6, b)
        for i, v in enumerate(k):
            if start + i < total:
                out[start + i] += v * (0.25 if b % 2 == 0 else 0.08)
    write(name, out, 0.8)


def songs():
    # Dungeon: dark minor loop (A minor, i - VI - III - VII)
    prog = [("A", "m"), ("F", ""), ("C", ""), ("G", ""), ("A", "m"), ("F", ""), ("E", ""), ("E", "")]
    mel = [("A", 4, 1), ("C", 5, 1), ("E", 5, 2), ("D", 5, 1), ("C", 5, 1), ("A", 4, 2),
           ("F", 4, 1), ("A", 4, 1), ("C", 5, 2), ("B", 4, 2), ("G", 4, 2),
           ("A", 4, 1), ("E", 5, 1), ("D", 5, 1), ("C", 5, 1), ("B", 4, 2), ("G#", 4, 2),
           ("A", 4, 3), (None, 0, 1), ("E", 4, 2), ("G#", 4, 2)]
    music("musica_mazmorra.wav", prog, 96, mel, "sq")
    # Town: calmer (D dorian-ish)
    prog = [("D", "m"), ("G", ""), ("D", "m"), ("A", "m"), ("F", ""), ("C", ""), ("G", ""), ("A", "")]
    mel = [("D", 5, 2), ("F", 5, 1), ("E", 5, 1), ("D", 5, 2), ("A", 4, 2), ("B", 4, 2), ("D", 5, 2), ("C", 5, 4),
           ("A", 4, 2), ("C", 5, 2), ("D", 5, 2), ("E", 5, 2), ("F", 5, 2), ("E", 5, 1), ("D", 5, 1), ("C#", 5, 4)]
    music("musica_pueblo.wav", prog, 78, mel, "tri")
    # Boss: faster, driving
    prog = [("E", "m"), ("E", "m"), ("C", ""), ("D", ""), ("E", "m"), ("E", "m"), ("C", ""), ("B", "")]
    mel = []
    for rep in range(2):
        mel += [("E", 5, 0.5), ("E", 5, 0.5), ("G", 5, 0.5), ("E", 5, 0.5), ("B", 5, 1), ("A", 5, 1),
                ("G", 5, 0.5), ("F#", 5, 0.5), ("E", 5, 1), ("D", 5, 1), ("B", 4, 1),
                ("C", 5, 1), ("E", 5, 1), ("G", 5, 1), ("C", 6, 1), ("B", 5, 2), ("F#", 5, 2)]
    music("musica_jefe.wav", prog, 132, mel, "saw", pad=False)
    # Title: slow and ominous
    prog = [("C", "m"), ("G#", ""), ("D#", ""), ("G", "")]
    mel = [("G", 4, 2), ("C", 5, 2), ("D#", 5, 3), ("D", 5, 1), ("C", 5, 4), ("B", 4, 4)]
    music("musica_titulo.wav", prog, 70, mel, "tri")


if __name__ == "__main__":
    sfx()
    songs()
    print("Audio written to", OUT)
