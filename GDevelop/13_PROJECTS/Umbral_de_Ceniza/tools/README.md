# tools — pipeline de generación, validación, export y pruebas

Todo corre con Node 22 y el núcleo oficial de GDevelop empaquetado en npm
(`gdcore-tools@2.0.0-gd-v5.6.269-autobuild` = libGD.js + runtime GDJS 5.6.269).

| Archivo | Qué hace |
|---|---|
| `build_project.mjs` | Ensambla `source/game.json` (objetos, escenas, eventos externos, variables, recursos), valida y normaliza con libGD, comprueba la generación de código del exportador oficial y escribe `ASSET_MANIFEST.json`. |
| `export.mjs web \| cordova` | Exporta con el exportador oficial a `builds/web` (HTML5) o `builds/android-cordova` (proyecto Cordova; fija orientación horizontal). |
| `build_apk.mjs` | APK de prueba instalable sin Android Studio: `android/` (actividad Java con WebView a pantalla completa que sirve `builds/web` desde `assets/www` en `https://appassets.androidplatform.net`, manifiesto, icono adaptable) → `aapt2` + `javac` + `d8`/`dx` + `zipalign` + `apksigner` (v2/v3). Ver cabecera del script para requisitos y clave de firma. |
| `test/apk_check.mjs [apk]` | Extrae `assets/www` del APK y lo ejecuta en Chromium con el mismo origen y reglas que la app (Range → 206, sin red), repitiendo lo que envía Android: `deviceready`, `pause`/`resume` y Esc para Atrás. Informe en `evidence/gameplay-tests/APK_CHECK.md`. |
| `test/run_tests.mjs [filtro]` | Pruebas de gameplay en Chromium headless (Playwright): estado real del runtime, teclado, ratón y multitouch (CDP). Capturas en `evidence/screenshots`, informe en `evidence/gameplay-tests`. El filtro es una subcadena del nombre (p. ej. `"20 Jefe"`); `balance` ejecuta además las pruebas lentas de balance (etapas 5, 8 y 12). `VERBOSE=1` imprime cada comprobación según se cumple. |
| `lib/dsl.mjs` | DSL mínimo para escribir eventos (`E`, `C`, `A`, `FOREACH`, `GROUP`, `LINK`…). Las instrucciones se escriben sólo con sus parámetros visibles. |
| `lib/finalize.mjs` | Expande cada instrucción con los **metadatos del motor** (huecos code-only = `""`) y falla si: el tipo no existe, faltan/sobran parámetros, un objeto, behavior, variable o recurso no existe. Reescribe `\n` en textos como `NewLine()` (GDevelop no admite `\n`). |
| `lib/objects.mjs` | Fábricas de objetos/behaviors/capas/instancias con los campos que serializa libGD 5.6.269. |
| `scenes/*.mjs` | Contenido del juego: `common` (objetos globales, variables, HUD, menús), `ev_entrada`/`ev_jugador` (en `ev_jugador.mjs`), `ev_combate`, `ev_hud` (+ sistema de menús), `ev_enemigos`, `pueblo`, `mazmorra` (campaña, mazmorra y coliseo, generación de salas), `menus_iniciales` (Título y Selección de clase), `skills` (tabla de las 18 habilidades), `personaje` (ficha, atributos, habilidades, diario), `historia` (capítulos, jefes, mezclas de enemigos, textos de la historia y del diario), `util` (avisos y textos flotantes). |

## Reglas aprendidas del motor (verificadas)

- Varias acciones **Crear** del mismo objeto en un mismo evento acumulan la selección → cada creación con
  configuración va en su propio sub-evento (`hitE`, `fxE`). Nunca crear `Enemigo` dentro de un «Para cada Enemigo».
- Comparaciones por instancia: usar condiciones de objeto (`PosX`, `NumberObjectVariable`…) o un «Para cada»;
  `CompareNumbers` con `Objeto.Variable` sólo mira la primera instancia.
- Parámetros de recurso (`imageResource`, `soundfile`…) van **sin comillas**; los textos, con comillas.
- Textos: `\n` no es válido dentro de una cadena de expresión; usar `NewLine()`.
- La extensión oficial del joystick produce 2 avisos `"" (number)` propios (igual en el ejemplo oficial); el build
  los tolera y falla ante cualquier otro error.

## Flujo de trabajo recomendado a partir de ahora

`source/game.json` es la fuente de verdad en cuanto se edite en GDevelop. El generador sirve para regenerar
desde cero o como referencia; si se vuelve a ejecutar, **sobrescribe** los cambios hechos en el editor.
