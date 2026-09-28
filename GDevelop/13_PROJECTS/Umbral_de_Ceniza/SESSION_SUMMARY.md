# SESSION_SUMMARY.md

## Fecha
2026-09-28

## Objetivo
Crear con el kit GDevelop un juego 2D para Android muy similar a *Darkrise* (ARPG lateral móvil).

## Cambios
- Especificación (`GAME_SPEC.md`, `VISUAL_CONTRACT.md`, `TASK_SPEC.md`).
- Arte pixel original por código (393 PNG: 3 héroes × 8 animaciones, 4 enemigos + jefe, NPCs, FX, escenarios de
  mazmorra/fortaleza/pueblo, UI táctil, iconos de app) y audio procedural (24 efectos + 4 músicas).
- Proyecto GDevelop `source/game.json` (4 escenas, 5 eventos externos, ~3.450 instrucciones) generado y validado
  con libGD 5.6.269; export HTML5 y Cordova con el exportador oficial.
- Combate automático (AUTO), búfer de entrada de habilidades, guardado local, 2 capítulos / 10 etapas.
- Pruebas de gameplay en Chromium (9 + 2 de balance) con capturas y workflow de GitHub para APK.

## Archivos
`13_PROJECTS/Umbral_de_Ceniza/{source,tools,evidence}/**`, contratos del proyecto, `.github/workflows/android-apk.yml`,
`README.md` raíz.

## Pruebas
`node tools/test/run_tests.mjs` → ver `evidence/gameplay-tests/REPORT.md`. `node tools/test/run_tests.mjs balance`
→ etapas 5 y 10 superadas en AUTO con personajes del nivel recomendado.

## Evidencia
`evidence/screenshots/` (capturas del build real), `evidence/gameplay-tests/`.

## Decisiones
Ver `PROJECT_STATE.md > Decisiones`.

## Riesgos
- APK sin compilar ni probar en dispositivo (bloqueo de red del entorno).
- Si se re-ejecuta `tools/build_project.mjs` tras editar en GDevelop, se pierden los cambios del editor.
- Balance ajustado con bot/AUTO, no con jugadores.

## Contexto mínimo
Abrir `source/game.json` en GDevelop. La lógica compartida está en los eventos externos; los objetos compartidos
son globales. `README.md` del proyecto explica controles, Android y pipeline.

## Próxima instrucción
"Compila el APK desde GDevelop (Exportar → Android) o con el workflow de GitHub, pruébalo en un Android real y
reporta tacto/notch/rendimiento para cerrar los gates MOBILE, PERFORMANCE y RELEASE."
