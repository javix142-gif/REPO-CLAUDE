# TASK_SPEC.md

## Objetivo
Crear desde cero un juego 2D en GDevelop, muy similar en género y bucle a *Darkrise* (RPG de acción lateral
para móvil), pensado para Android, usando las herramientas del kit.

## Actual
El kit tenía la plantilla del proyecto `Umbral_de_Ceniza` vacía (spec en blanco) y un esbozo de `make_art.py`.

## Esperado
Proyecto GDevelop abrible y exportable con: título, selección de 3 clases, pueblo con tiendas y portal, mazmorra
con salas/oleadas/jefe, botín por rareza, niveles, guardado, controles táctiles y AUTO, HUD móvil, arte y audio
originales; export HTML5 probado y export Android preparado.

## Escena/módulo
`Titulo`, `SeleccionClase`, `Pueblo`, `Mazmorra` + eventos externos `EV_Entrada`, `EV_Jugador`, `EV_Combate`, `EV_HUD`, `EV_Enemigos`.

## Archivos editables
`13_PROJECTS/Umbral_de_Ceniza/**`, `.github/workflows/android-apk.yml`, `README.md` raíz.

## Archivos prohibidos
Resto del kit (`00_`–`12_`): sólo lectura (referencias, skills, ejemplos oficiales).

## Casos borde
Pantallas 16:9–21:9; multitouch (moverse y atacar a la vez); menú abierto durante combate; muerte con menú;
varios golpes/proyectiles solapados sobre un enemigo; oleada que aparece el mismo frame en que se evalúa la sala;
guardado y recarga; etapa 6+ con otro tema.

## Riesgos
JSON escrito a mano con identificadores inventados → mitigado validando cada instrucción contra libGD.
Imposible compilar APK aquí (SDK bloqueado) → export Cordova validado hasta `cordova prepare` + workflow.

## Criterios
- [x] `game.json` carga y se guarda con libGD 5.6.269; 0 errores de validación ni de generación de código.
- [x] Flujo completo título → clase → pueblo → mazmorra → victoria → pueblo → recarga.
- [x] Las 3 clases con ataque básico y 3 habilidades verificadas.
- [x] Controles táctiles multitouch verificados; HUD anclado en 19.5:9.
- [x] Etapa completa con bot y con AUTO; jefe con sus ataques; guardado persistente.
- [x] APK de prueba generado, firmado (v2/v3) y verificado en su capa web (`tools/build_apk.mjs`, `test/apk_check.mjs`).
- [ ] APK instalado y probado en un Android real (pendiente, fuera de este entorno).

## Pruebas
`tools/test/run_tests.mjs` (9 pruebas) + `balance` (etapas 5 y 10).

## Evidencia
`evidence/screenshots/`, `evidence/gameplay-tests/REPORT.md`.
