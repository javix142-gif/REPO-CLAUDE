# PROJECT_STATE.md — Umbral de Ceniza

## Objetivo
RPG de acción pixel-art lateral para Android, del género de *Darkrise* (clases, mazmorras por salas, botín por
rareza, pueblo con herrería/alquimista, jefe), con arte/audio originales. Ver `GAME_SPEC.md`.

## Versión GDevelop
Proyecto generado y validado con **libGD / GDJS 5.6.269** (`gdcore-tools@2.0.0-gd-v5.6.269-autobuild`).
Abre en GDevelop 5.6.269 o posterior. Extensión incluida: *Multitouch joystick and buttons (sprite)* 1.9.0 (oficial).

## Estado
MVP jugable completo en HTML5 (export oficial) y proyecto Cordova para Android generado. APK no compilado en este
entorno (SDK de Android no descargable). Sin prueba en dispositivo real todavía.

## Escenas
| Escena | Contenido |
|---|---|
| `Titulo` | Logo, Continuar (si hay partida) / Nueva partida, música |
| `SeleccionClase` | 3 tarjetas con vista previa animada (tocar = ataque), crea partida nueva |
| `Pueblo` | Hub 4200 px: Herrera (forjar/reforzar), Alquimista (pociones), Portal (selector de etapa 1–10), Consejos, maniquí de práctica, ficha del personaje, pausa |
| `Mazmorra` | 5 salas de 1800 px (4 con oleadas + jefe), puertas que se abren al limpiar, cámara encerrada en la sala, parallax, AUTO, pausa/victoria/derrota, 2 capítulos |

## Sistemas
- Eventos externos: `EV_Entrada` (stats + controles), `EV_Jugador` (estados, ataque, 9 habilidades con búfer de entrada, poción, efectos), `EV_Combate` (daño con críticos/defensa, congelación, aturdimiento, muerte, EXP/nivel, botín, guardado, barras de vida), `EV_HUD` (barras, enfriamientos radiales, avisos, sistema de menús), `EV_Enemigos` (init por tipo/etapa + IA de 4 enemigos y jefe).
- Guardado: `Save` (global) → `localStorage["GDJS_UmbralSave"]`, en cada compra/nivel/botín/salida.
- Escalado: estadísticas enemigas × (1 + 0,45·(etapa−1)); EXP siguiente = 50·nivel^1,45.

## Extensiones
`SpriteMultitouchJoystick` 1.9.0 (copiada del ejemplo oficial `starting-platformer-pixel`, MIT). Behaviors nativos: PlatformerObject, Platform, Anchor. Sin JavaScript propio.

## Archivos importantes
- `source/game.json` — proyecto GDevelop (fuente de verdad a partir de ahora).
- `source/assets/`, `source/fonts/` — recursos. `source/make_art.py`, `source/make_audio.py` — generadores.
- `tools/` — generador/validador (`build_project.mjs`), export (`export.mjs`), pruebas (`test/`).
- `.github/workflows/android-apk.yml` — APK de depuración en GitHub Actions (no ejecutado aún).
- `evidence/` — capturas reales e informe de pruebas.

## Decisiones
- Arte por código (Pillow) para garantizar originalidad y licencia limpia; densidad de píxel única ×3.
- Proyecto generado por un DSL validado contra los metadatos del motor en lugar de escribir JSON a mano.
- Inventario simplificado para móvil: el equipo mejor se equipa solo y el peor se vende (en lugar de rejilla).
- Controles: extensión oficial de joystick multitouch (no JS propio); `AUTO` reutiliza las mismas variables de entrada.
- Resolución 1280×720 con `adaptWidth`; HUD con `AnchorBehavior`; capa `Menu` con cámara centrada.

## Bugs
Encontrados y corregidos durante las pruebas: golpes del jugador que no expiraban (daño repetido), sala dada por
limpia en el mismo frame en que aparecía la oleada, textos con `\n` (el motor los vaciaba), parámetros de recurso con
comillas (textura de "recurso faltante" en el capítulo 2), vida inicial incompleta, joystick fuera de pantalla.
Abiertos: ninguno conocido.

## Gates
- Functional: PASS — 9/9 pruebas de gameplay (ver `evidence/gameplay-tests/REPORT.md`).
- Gameplay: PASS — etapa completa con bot y con AUTO; balance comprobado en etapas 5 y 10 (pruebas `balance`).
- Visual: PASS_WITH_WARNINGS — capturas reales 16:9 y 19.5:9; falta captura en dispositivo.
- Mobile: PASS_WITH_WARNINGS — multitouch simulado (CDP), anclajes y orientación verificados; falta DEVICE_PASS.
- Performance: BLOCKED — sin dispositivo de referencia (en Chromium headless con render por software funciona fluido a efectos de las pruebas).
- Release: BLOCKED — APK/AAB no compilado aquí (SDK no descargable); pasos documentados en `README.md`.

## Evidencia
`evidence/screenshots/*.png` (24 capturas del juego exportado), `evidence/gameplay-tests/REPORT.md` y `report.json`.

## Próximo paso
1. Compilar el APK (GDevelop *Exportar → Android* o el workflow de GitHub) e instalarlo en un teléfono.
2. Validar en dispositivo: tacto, notch, rendimiento (60 FPS en gama media), pausa al minimizar, audio.
3. Ajustar balance con jugadores reales; luego contenido (más capítulos, 4.ª clase).
