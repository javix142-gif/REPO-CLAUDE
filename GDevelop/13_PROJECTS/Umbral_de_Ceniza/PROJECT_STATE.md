# PROJECT_STATE.md — Umbral de Ceniza

## Objetivo
RPG de acción pixel-art lateral para Android, del género de *Darkrise* (clases, mazmorras por salas, botín por
rareza, pueblo con herrería/alquimista, jefes), con arte/audio originales. Ver `GAME_SPEC.md`.

## Versión GDevelop
Proyecto generado y validado con **libGD / GDJS 5.6.269** (`gdcore-tools@2.0.0-gd-v5.6.269-autobuild`).
Abre en GDevelop 5.6.269 o posterior. Extensión incluida: *Multitouch joystick and buttons (sprite)* 1.9.0 (oficial).
Versión del proyecto: **1.1.1** (versionCode 10101; actualiza el APK 1.0.0 si se firma con la misma clave).

## Estado
Jugable completo en HTML5 (export oficial). **APK de prueba** instalable generado con `tools/build_apk.mjs`
(`builds/UmbralDeCeniza-1.1.1.apk`, firmado con clave de depuración) y verificado en su capa web; el proyecto Cordova
del export oficial también se genera. Sin prueba en dispositivo real todavía.

Contenido de la versión 1.1.0 (segunda ronda de peticiones del usuario): combo de 3 golpes, doble salto, ataque hacia
arriba/diagonal, plataformas flotantes con cofres y enemigos apostados, murciélagos con vuelo natural, atributos
repartibles, 9 habilidades nuevas (niveles 4, 8 y 12), campaña con historia (12 etapas, 3 capítulos), 12 jefes, 4
enemigos nuevos (Arquero, Espectro, Gólem, Limo) + élites, modo mazmorra y Coliseo de la Ceniza, Archivista y diario.

## Escenas
| Escena | Contenido |
|---|---|
| `Titulo` | Logo, Continuar (si hay partida) / Nueva partida, música |
| `SeleccionClase` | 3 tarjetas con vista previa animada (tocar = ataque), crea partida nueva y abre el prólogo |
| `Pueblo` | Hub 4200 px: Herrera (forjar/reforzar), Alquimista (pociones), Archivista (diario), Portal del Umbral (Campaña / Mazmorra / Coliseo), Consejos, maniquí de práctica, ficha del personaje (atributos, habilidades, diario), pausa |
| `Mazmorra` | Campaña, mazmorra o coliseo según `Juego.Modo`: 5 salas de 1800 px (4 con oleadas + jefe) con plataformas/cofres/pinchos generados en cada partida, puertas que se abren al limpiar, cámara encerrada en la sala, parallax, AUTO, páginas de historia, pausa/victoria/derrota, 3 temas (catacumbas, fortaleza, abismo de cristal) |

## Sistemas
- Eventos externos: `EV_Entrada` (stats + controles), `EV_Jugador` (estados, ataque con combo y apuntado, doble salto, 18 habilidades con búfer de entrada, poción, efectos), `EV_Combate` (daño con críticos/defensa, congelación, aturdimiento, muerte, EXP/nivel, botín, guardado, barras de vida), `EV_HUD` (barras, enfriamientos radiales, avisos, sistema de menús), `EV_Enemigos` (init por tipo/etapa/élite + IA de 8 enemigos (más el limo pequeño) y 3 jefes de capítulo).
- Datos de contenido en `tools/scenes/`: `skills.mjs` (habilidades), `historia.mjs` (capítulos, jefes, mezcla de enemigos por etapa, prólogo, páginas, finales y diario), `personaje.mjs` (ficha/atributos/habilidades/diario). Se cargan como variables globales (`Skills`, `Relato`, `Diario`).
- Modos (`Juego.Modo`): `campana` (historia; único que avanza `Save.EtapaMax`/`Save.Historia`), `mazmorra` (élite al azar del capítulo), `arena` (coliseo, se abre en la etapa 3, récord `Save.ArenaMax`).
- Guardado: `Save` (global) → `localStorage["GDJS_UmbralSave"]`, en cada compra/nivel/botín/atributo/salida.
- Escalado: estadísticas enemigas × (1 + 0,45·(etapa−1)); coliseo × (1 + 0,1·(ronda−1)); élites con vida × 3–15 según el tipo; EXP siguiente = 50·nivel^1,45; nivel máximo 60.
- Generación: cada sala genera 3–4 plataformas (subida ≤ 100 px, hueco ≤ 150 px), un cofre en la más alta y pinchos; la mezcla de enemigos sale de una cadena de 20 letras por etapa (`Relato.Pool`).

## Extensiones
`SpriteMultitouchJoystick` 1.9.0 (copiada del ejemplo oficial `starting-platformer-pixel`, MIT). Behaviors nativos: PlatformerObject, Platform, Anchor. Sin JavaScript propio.

## Archivos importantes
- `source/game.json` — proyecto GDevelop (fuente de verdad a partir de ahora).
- `source/assets/`, `source/fonts/` — recursos (604 PNG, 28 WAV). `source/make_art.py` + `source/art/*.py`, `source/make_audio.py` — generadores.
- `tools/` — generador/validador (`build_project.mjs`), export (`export.mjs`), pruebas (`test/`).
- `tools/build_apk.mjs` + `tools/android/` — APK de prueba (actividad WebView propia) sin Android Studio.
- `.github/workflows/android-apk.yml` — APK de depuración vía Cordova en GitHub Actions (no ejecutado aún).
- `evidence/` — capturas reales e informe de pruebas.

## Decisiones
- Arte por código (Pillow) para garantizar originalidad y licencia limpia; densidad de píxel única ×3.
- Proyecto generado por un DSL validado contra los metadatos del motor en lugar de escribir JSON a mano.
- Inventario simplificado para móvil: el equipo mejor se equipa solo y el peor se vende (en lugar de rejilla).
- Controles: extensión oficial de joystick multitouch (no JS propio); `AUTO` reutiliza las mismas variables de entrada.
- Resolución 1280×720 con `adaptWidth`; HUD con `AnchorBehavior`; capa `Menu` con cámara centrada.
- Salas generadas al iniciar la escena (no plataformas fijas): alcanzables por construcción con salto + doble salto.
- Élites = un enemigo normal reescalado (una sola IA por tipo) en lugar de 9 jefes distintos programados; los 3 jefes de
  capítulo sí tienen patrones propios.
- Sólo la campaña avanza la historia; la mazmorra y el coliseo sirven para conseguir botín/EXP y no bloquean nada.
- APK de prueba con un envoltorio WebView propio (servidor de assets en `https://appassets.androidplatform.net`,
  Atrás = Esc, eventos `pause`/`resume` para el audio) porque el SDK de Google no era descargable; `targetSdk 34`
  para que Android 15 no fuerce el borde a borde bajo la cámara. El export oficial (Cordova) sigue siendo el camino
  para Google Play.

## Bugs
Encontrados y corregidos durante las pruebas (ronda 1): golpes del jugador que no expiraban, sala dada por limpia en
el mismo frame en que aparecía la oleada, textos con `\n`, parámetros de recurso con comillas, vida inicial
incompleta, joystick fuera de pantalla.
Ronda 2 (esta versión): lectura del doble salto tras aterrizar, plataformas inalcanzables con cofre, espectro que nunca
disparaba (tiempo de preparación mayor que su animación de lanzar), invocación del Coloso cortada por el final de su
animación, plataformas generadas sin la textura del capítulo, espectros y murciélagos que salían de la sala por el
lado, **enemigos apostados que se salían de su plataforma cuando había varios a la vez** (el límite comparaba sólo la
primera instancia; ahora se procesa con «Para cada»).
Ronda 3 (1.1.1): **esqueletos, cultistas, arqueros y limos se quedaban «pasmados» para siempre tras un golpe**: la
condición de recuperación usaba `NOT(OR(...))` con condiciones de objeto, que no filtra bien y nunca se cumplía; ahora son
dos comparaciones de tipo simples (prueba 27).
Abiertos: ninguno conocido.

## Gates
Ver `GATE_STATUS.json` y `evidence/gameplay-tests/REPORT.md`.
- Functional: PASS — 30/30 pruebas de gameplay en una sola ejecución (27 de juego + 3 de balance; `evidence/gameplay-tests/REPORT.md`), más 13/13 comprobaciones de la capa web del APK.
- Gameplay: PASS — etapa 1 completa con bot y con AUTO; campaña, coliseo y mazmorra recorridos por prueba; balance con AUTO en las etapas 5 (Guerrero nv. 9), 8 (Maga nv. 15) y 12 (Arquera nv. 23) superado. Ojo: con AUTO las clases a distancia terminan las etapas 8 y 12 casi sin daño (posible dificultad baja; sin datos de jugadores reales).
- Visual: PASS_WITH_WARNINGS — capturas reales 16:9 y 19.5:9; falta captura en dispositivo.
- Mobile: PASS_WITH_WARNINGS — multitouch simulado (CDP), anclajes y orientación verificados; APK de prueba
  verificado en su capa web (`APK_CHECK.md`, 20:9); falta DEVICE_PASS.
- Performance: BLOCKED — sin dispositivo de referencia (en Chromium headless con render por software funciona fluido a efectos de las pruebas).
- Release: BLOCKED — hay APK de prueba (sideload, clave de depuración); faltan prueba en dispositivo y AAB firmado
  para Google Play (export oficial de GDevelop).

## Evidencia
`evidence/screenshots/*.png` (capturas del juego exportado), `evidence/gameplay-tests/REPORT.md`, `report.json` y
`APK_CHECK.md` (capa web del APK).

## Próximo paso
1. Instalar `builds/UmbralDeCeniza-1.1.1.apk` en un teléfono (ver `README.md > Android`).
2. Validar en dispositivo: tacto (apuntar arriba/diagonal con el joystick, doble salto), notch, rendimiento (60 FPS en
   gama media con oleadas grandes y jefes), pausa al minimizar, audio, botón Atrás.
3. Ajustar balance con jugadores reales (élites, jefes de capítulo, coliseo); ideas: tablón de encargos, 4.ª clase.
