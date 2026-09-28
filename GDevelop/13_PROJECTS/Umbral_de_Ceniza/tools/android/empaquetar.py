"""Assembles the unsigned APK (called by tools/build_apk.mjs).

Usage: python3 empaquetar.py <aapt2 base.apk> <classes.dex> <www dir> <output.apk>

Copies aapt2's entries as they are (resources.arsc stays uncompressed, as Android 11+ requires) and adds classes.dex
plus the HTML5 export under assets/www/. Fixed timestamps so identical inputs give an identical ZIP. The 4-byte
alignment is done afterwards by zipalign, before signing.

index.html gets one change: GDevelop's session metrics (a request to GDevelop's servers 4 s after start) are turned
off with the public RuntimeGame.enableMetrics(false), since the APK does not use the network.
"""
import os
import sys
import zipfile

DATE = (2026, 1, 1, 0, 0, 0)
GAME_CTOR = "var game = new gdjs.RuntimeGame(gdjs.projectData, {});"


def entry(name, compress_type):
    info = zipfile.ZipInfo(name, DATE)
    info.compress_type = compress_type
    info.external_attr = 0o644 << 16
    return info


def main(base, dex, www, out):
    n = 0
    with zipfile.ZipFile(base) as zb, zipfile.ZipFile(out, "w") as zo:
        for info in zb.infolist():
            kind = zipfile.ZIP_STORED if info.filename == "resources.arsc" else info.compress_type
            zo.writestr(entry(info.filename, kind), zb.read(info.filename))
            n += 1
        with open(dex, "rb") as f:
            zo.writestr(entry("classes.dex", zipfile.ZIP_DEFLATED), f.read(), compresslevel=9)
        n += 1
        for root, _, files in sorted(os.walk(www)):
            for name in sorted(files):
                path = os.path.join(root, name)
                rel = os.path.relpath(path, www).replace(os.sep, "/")
                with open(path, "rb") as f:
                    data = f.read()
                if rel == "index.html":
                    html = data.decode("utf-8")
                    if GAME_CTOR not in html:
                        sys.exit("empaquetar: RuntimeGame constructor not found in index.html (GDevelop export changed?)")
                    data = html.replace(GAME_CTOR, GAME_CTOR + " game.enableMetrics(false);").encode("utf-8")
                zo.writestr(entry("assets/www/" + rel, zipfile.ZIP_DEFLATED), data, compresslevel=9)
                n += 1
    print(f"empaquetar: {n} entries -> {out} ({os.path.getsize(out) / 1e6:.1f} MB)")


if __name__ == "__main__":
    main(*sys.argv[1:5])
