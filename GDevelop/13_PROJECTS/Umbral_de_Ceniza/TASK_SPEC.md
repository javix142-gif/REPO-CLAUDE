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

## Ampliación 1.1.0 (petición posterior del usuario)
Pedido: tercer golpe seguido potenciado; doble salto; uso de las plataformas flotantes; atributos repartibles tipo RPG;
nuevas actividades, lore, jefes y enemigos distintos; mazmorras mejoradas y un modo campaña/historia además de las
mazmorras; ataque en diagonal y hacia arriba; murciélagos que siguen tu salto con vuelo más natural; habilidades nuevas
cada 4–5 niveles.

Criterios:
- [x] Combo: 3 ataques básicos seguidos → el tercero es potenciado (prueba 10).
- [x] Doble salto; ataque hacia arriba y en diagonal con teclado y joystick táctil (pruebas 10 y 11).
- [x] Murciélagos con inercia que bajan a tu altura si saltas cerca y pican con aviso (prueba 12).
- [x] Salas con plataformas generadas siempre alcanzables, cofres, pinchos y enemigos apostados (prueba 13).
- [x] Puntos de atributo (3 por nivel), reinicio y menú de habilidades; 9 habilidades nuevas en los niveles 4, 8 y 12 (pruebas 14–17).
- [x] Enemigos nuevos (Arquero, Espectro, Gólem, Limo que se divide) y élites (pruebas 18 y 19).
- [x] Jefes de capítulo Reina Carmesí y Coloso del Umbral con patrones propios y final de la historia (pruebas 20 y 21).
- [x] Campaña de 12 etapas en 3 capítulos con tema propio, página de historia, diario y Archivista (prueba 22).
- [x] Coliseo (rondas sin fin, jefe cada 5 rondas, récord) y modo mazmorra con élite al azar (pruebas 23 y 24).
- [x] Una partida guardada por la versión 1.0.0 se carga y se puede jugar (prueba 25).
- [x] Balance con AUTO en las etapas 5, 8 y 12 con personajes del nivel recomendado (pruebas `balance`, 3/3).
- [x] APK 1.1.1 generado, firmado con la misma clave que el 1.0.0 y verificado en su capa web (`test/apk_check.mjs`, 13/13).
- [ ] APK 1.1.1 probado en un Android real (pendiente, fuera de este entorno).

Casos borde añadidos: varias unidades apostadas a la vez en la misma sala; plataformas generadas con el tema del
capítulo; élite invocando refuerzos; jefe muerto durante el coliseo (no abre portal); página final de la historia antes
de la victoria; partida guardada de la versión 1.0.0 (los campos nuevos toman sus valores por defecto).

## Ajuste 1.1.1 (nueva petición del usuario)
Pedido: (1) enemigos que se quedan «pasmados» al recibir un golpe (esqueletos al menos); (2) tres animaciones distintas para el
ataque básico según el golpe del combo, que deben encadenarse rápido o se reinicia al golpe 1; (3) el tercer golpe sin texto,
sólo con las partículas del golpe fuerte. Nada más.

- [x] Esqueleto, cultista, arquero y limo se recuperan del golpe en menos de 1,5 s y el esqueleto vuelve a caminar (prueba 27).
- [x] Las tres clases usan `Attack` → `Attack2` → `Attack3` en el combo; el 3.º no dice nada y lanza el impacto; el combo se reinicia si tardas (prueba 26).

## Pruebas
`tools/test/run_tests.mjs` (27 pruebas) + `balance` (etapas 5, 8 y 12; `BALANCE=1` para todo en una ejecución).

## Evidencia
`evidence/screenshots/`, `evidence/gameplay-tests/REPORT.md`.
