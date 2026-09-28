# Licencias y origen de los recursos

| Recurso | Origen | Licencia |
|---|---|---|
| Sprites, fondos, tiles, FX, UI, iconos (`assets/**.png`) | Generados por código para este proyecto (`make_art.py`, `art/`). No derivan de ningún juego ni asset de terceros. | Del propietario del proyecto |
| Efectos de sonido y música (`assets/audio/*.wav`) | Sintetizados por código (`make_audio.py`, sólo librería estándar de Python). | Del propietario del proyecto |
| Pixelify Sans (`fonts/PixelifySans-SemiBold.ttf`) | Google Fonts, vía npm `@expo-google-fonts/pixelify-sans@0.4.2` | SIL OFL 1.1 (`fonts/OFL-PixelifySans.txt`) |
| Jersey 10 (`fonts/Jersey10-Regular.ttf`) | Google Fonts, vía npm `@expo-google-fonts/jersey-10@0.4.1` | SIL OFL 1.1 (`fonts/OFL-Jersey10.txt`) |
| Extensión *Multitouch joystick and buttons (sprite)* 1.9.0 (dentro de `game.json`) | Copiada del ejemplo oficial `starting-platformer-pixel` (GDevelop-examples, incluido en el kit) | MIT |
| Runtime GDJS / motor GDevelop (en los builds) | GDevelop 5.6.269 | MIT (ver `LICENSE.GDevelop.txt` en cada build) |
| Envoltorio Android del APK de prueba (`tools/android/`) | Código propio del proyecto (actividad WebView). `android.jar` (API 34) se usa sólo para compilar y no va dentro del APK. | Del propietario del proyecto |

*Darkrise* se usó sólo como referencia de **género y mecánicas** (ARPG lateral móvil). No se copió arte, audio,
textos, nombres, interfaz ni código de ese juego.
