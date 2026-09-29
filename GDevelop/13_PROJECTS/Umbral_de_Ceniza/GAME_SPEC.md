# GAME_SPEC.md — Umbral de Ceniza

## Pitch
RPG de acción pixel-art 2D de desplazamiento lateral (hack & slash) para móvil, en la línea de
*Darkrise*: eliges una clase, bajas a mazmorras oscuras sala por sala, limpias oleadas de monstruos,
recoges botín con rareza por colores, subes de nivel y repartes atributos, derrotas a jefes con nombre y
vuelves al pueblo a mejorar tu equipo. Una campaña con historia (12 etapas, 3 capítulos) da sentido al descenso. Todo el arte, nombres, textos y sonidos son **originales** (no se copia contenido de Darkrise).

## Plataforma
- Objetivo principal: **Android** (export Cordova / "Android" de GDevelop).
- Secundario: HTML5 (navegador, para pruebas y demo).
- Motor: GDevelop 5.6 (proyecto validado con libGD/GDJS 5.6.269).

## Resolución/orientación
- Resolución lógica **1280×720**, orientación **landscape**.
- `sizeOnStartupMode = adaptWidth` + `adaptGameResolutionAtRuntime = true`: en pantallas 18:9–21:9
  se amplía el ancho visible; el HUD se ancla a los bordes con `AnchorBehavior`.
- `scaleMode = nearest` (pixel art nítido). Sprites pre-escalados ×3 (arte base ×1).

## Género/cámara
- Acción lateral con gravedad (`PlatformerObject`), suelo + plataformas atravesables.
- Cámara sigue al jugador en X con suavizado; en mazmorra queda **encerrada en la sala** actual hasta
  eliminar a todos los enemigos (arena lock). Capa de fondo con parallax.

## Loop principal
Pueblo → Portal del Umbral (Campaña / Mazmorra / Coliseo) → Mazmorra: 4 salas con oleadas + sala del jefe →
Botín/EXP/oro/cofres → Victoria → Pueblo (Herrera/Alquimista/Archivista/ficha del personaje) → etapa siguiente.

### Modos (Juego.Modo)
- **Campaña** (`campana`): 12 etapas; la primera vez en cada etapa se lee su página de historia; los jefes de capítulo
  (etapas 4, 8 y 12) tienen final propio; sólo la campaña avanza `Save.EtapaMax` y completa `Save.Historia`.
- **Mazmorra** (`mazmorra`): repetir una etapa desbloqueada (flechas del portal) con un **élite al azar** del capítulo
  como jefe; sin páginas de historia; sirve para conseguir botín y experiencia.
- **Coliseo de la Ceniza** (`arena`, se abre en la etapa 3): una sola sala, rondas sin fin con más enemigos y estadísticas
  más altas en cada una, jefe cada 5 rondas (los 12 jefes en orden), oro y algo de vida al superar cada ronda,
  récord `Save.ArenaMax`.

## Controles
Táctil (Android):
- Joystick virtual izquierdo (`SpriteMultitouchJoystick` + `PlatformerMultitouchMapper`, extensión oficial).
- Derecha: **Atacar** (grande), **Habilidad 1/2/3** con enfriamiento visible, **Saltar** (otra vez en el aire = **doble salto**), **Poción**.
- El joystick hacia arriba o en diagonal **apunta** el ataque básico y las habilidades que disparan.
- Multitouch: moverse y atacar a la vez.
- Botón de pausa arriba a la derecha.
Teclado (pruebas/escritorio): ←/→ o A/D mover, ↑ apuntar arriba, Espacio/W saltar, J atacar, K/L/I habilidades, H poción,
T combate automático, C ficha del personaje, Esc pausa.

## Sistemas
- **Clases (3):** Guerrero (melee, mucha vida), Maga (proyectiles mágicos, mucho maná), Arquera (flechas rápidas).
  Cada una: ataque básico y **6 habilidades** en 3 ranuras (coste de maná y enfriamiento). Las 3 iniciales están desde el
  nivel 1; una segunda habilidad por ranura se aprende en los niveles **4, 8 y 12** y se equipa desde la ficha.
- **Combate:** hitboxes y proyectiles del jugador; daño = ATK×multiplicador ± 10 %, 10 % crítico ×1,8, reducido por DEF.
  **Combo:** tres ataques básicos seguidos (ventana de 0,75 s) → el tercero es potenciado (×1,9 de daño, más grande, con
  retroceso fuerte). **Apuntado:** hacia delante, arriba o en diagonal (también en diagonal hacia abajo en el aire).
  **Doble salto.** Números de daño flotantes, retroceso, parpadeo de invulnerabilidad.
- **Atributos (RPG):** +3 puntos por nivel (`Save.Puntos`, derivados del nivel) para repartir en Fuerza (ataque), Vitalidad
  (vida y algo de defensa), Destreza (crítico y velocidad de ataque) y Espíritu (maná, regeneración y recarga de
  habilidades); reinicio pagando oro.
- **Enemigos:** Esqueleto (cuerpo a cuerpo, salta tras ti a las plataformas), Murciélago de ceniza (vuelo con inercia y
  ondulación; si saltas cerca baja a tu altura y pica con aviso), Cultista (orbes), Bruto (lento, golpe fuerte),
  Arquero esquelético (flechas desde plataformas), Espectro (vuela, orbes en abanico, se teletransporta), Gólem (onda de
  choque; no se tambalea), Limo (salta; al morir se divide en dos pequeños) y **élites** (un enemigo normal con mucha más
  vida, más daño y más grande; invoca refuerzos cada ~11 s y entra en furia con poca vida). Estadísticas escalan con la etapa.
- **Jefes (12):** cada etapa termina con un jefe con nombre. Etapas 1–3, 5–7 y 9–11: élites (Grom, Osvaldo el Insomne,
  Hermana Vesper, La Dama de los Lamentos, Halcón Sangriento, Verdugo Carmesí, Rey Gelatina, Custodio de Piedra, Sombra
  del Umbral). Jefes de capítulo con patrones propios: **Caballero de Ceniza** (4: tajo, embestida, onda de choque,
  invocación), **Reina Carmesí** (8: orbes en abanico, lluvia de sangre con aviso, teletransporte y tajo por la espalda,
  murciélagos) y **Coloso del Umbral** (12: puñetazo con ondas, barrido, lluvia de cristales con aviso, limos).
- **Mazmorras:** cada sala genera una cadena de plataformas flotantes (subidas ≤ 100 px, huecos ≤ 150 px: alcanzable con
  doble salto), un **cofre** en la más alta (monedas, orbe de vida, a veces poción) y, desde la 2.ª sala, **pinchos**;
  cultistas y arqueros se apostan en las plataformas. La mezcla de enemigos cambia en cada etapa.
- **Botín:** oro, orbes de vida y equipo (arma/armadura) con rareza Común (blanco), Mágico (azul),
  Raro (amarillo), Épico (morado), Legendario (naranja). Si es mejor que lo equipado se equipa solo;
  si no, se vende automáticamente (inventario simplificado para móvil).
- **Progresión:** EXP → nivel (sube vida/maná/ataque/defensa, curación completa; tope 60).
  Herrera: forjar arma (+ATK) y reforzar armadura (+vida/+DEF) con oro. Alquimista: pociones.
  Archivista: diario con la historia (una entrada nueva por etapa alcanzada).
- **Historia y lore:** prólogo al empezar, página de historia al entrar por primera vez en cada etapa, final tras cada
  jefe de capítulo y diario de 13 entradas (Villa Ceniza, la Orden de la Brasa, el Culto de la Ceniza, Sir Aldric, la reina
  Isaura, el Abismo de Cristal, el Coloso…). Textos originales.
- **Etapas:** Capítulo 1 "Catacumbas Olvidadas" (1–4), Capítulo 2 "Fortaleza Carmesí" (5–8), Capítulo 3 "Abismo de
  Cristal" (9–12). Se desbloquean en orden.

## Escenas
| Escena | Rol |
|---|---|
| `Titulo` | Logo, Continuar / Nueva partida |
| `SeleccionClase` | Elegir Guerrero / Maga / Arquera con descripción y stats |
| `Pueblo` | Hub: Herrera, Alquimista, Archivista, Portal (campaña / mazmorra / coliseo), maniquí de práctica, ficha del personaje |
| `Mazmorra` | Etapa jugable (campaña, mazmorra o coliseo): salas generadas, oleadas, cofres, jefe, historia, victoria/derrota |

Eventos compartidos como **eventos externos** (`EV_Jugador`, `EV_Combate`, `EV_HUD`) enlazados desde
`Pueblo` y `Mazmorra`; objetos compartidos son **objetos globales**.

## UX/HUD
- Arriba-izquierda: marco con retrato de clase, nivel, barra de vida (roja), maná (azul), EXP (dorada).
- Arriba-centro: nombre de etapa y sala ("Sala 2/5"), barra del jefe cuando aparece.
- Arriba-derecha: oro, pociones, pausa.
- Mensajes emergentes ("¡Nivel 5!", "Equipado: Espada Rara +34 ATQ").
- Márgenes ≥ 40 px a los bordes (notch / safe area).

## Dirección visual
Pixel art oscuro: piedra azulada, antorchas cálidas, niebla; paleta limitada con acentos de ceniza/brasas.
Arte generado por `source/make_art.py` (original, CC0 del proyecto). Ver `VISUAL_CONTRACT.md`.

## Audio
Efectos y música generados proceduralmente (`source/make_audio.py`): golpes, magia, flechas, monedas,
subida de nivel, jefe; un bucle ambiental para pueblo y otro para mazmorra.

## Persistencia
Almacenamiento local de GDevelop (`UmbralSave`): clase, nivel, EXP, oro, pociones, equipo, forja,
etapa máxima, atributos repartidos, habilidades equipadas, historia leída y récord del coliseo. Se guarda al salir de
una etapa, al comprar, al subir de nivel y al repartir puntos.

## Rendimiento objetivo
60 FPS en gama media Android; ≤ 25 enemigos simultáneos; texturas ≤ 2048 px; sin física 2D.

## MVP
Las 4 escenas, 3 clases (6 habilidades cada una), 8 tipos de enemigo (más el limo pequeño) + élites, 12 jefes, campaña de 12 etapas con
historia, mazmorras y coliseo, atributos, botín por rareza, nivel/EXP, tiendas, guardado, controles táctiles + teclado,
export HTML5 y Cordova/Android.

## Fuera de alcance
Multijugador/PvP, gremios, tienda con dinero real, anuncios, logros en línea, inventario con cuadrícula,
árbol de talentos, tablón de encargos, más capítulos.

## Definición de terminado
- El proyecto abre en GDevelop 5.6 y exporta sin errores (validado con libGD).
- Todas las instrucciones existen en el motor y con el número correcto de parámetros (validador).
- Gameplay tests automatizados en Chromium pasan (moverse, atacar, matar, botín, sala, jefe, victoria, guardado).
- Capturas reales del juego en `evidence/screenshots/`.
- Export Cordova generado; pasos de APK documentados. DEVICE_PASS requiere prueba en teléfono real.
