# GAME_SPEC.md — Umbral de Ceniza

## Pitch
RPG de acción pixel-art 2D de desplazamiento lateral (hack & slash) para móvil, en la línea de
*Darkrise*: eliges una clase, bajas a mazmorras oscuras sala por sala, limpias oleadas de monstruos,
recoges botín con rareza por colores, subes de nivel, derrotas al jefe y vuelves al pueblo a mejorar
tu equipo. Todo el arte, nombres, textos y sonidos son **originales** (no se copia contenido de Darkrise).

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
Pueblo → Portal (elige etapa) → Mazmorra: 4 salas con oleadas + sala del jefe → Botín/EXP/oro →
Victoria → Pueblo (Herrera/Alquimista) → etapa siguiente (más difícil).

## Controles
Táctil (Android):
- Joystick virtual izquierdo (`SpriteMultitouchJoystick` + `PlatformerMultitouchMapper`, extensión oficial).
- Derecha: **Atacar** (grande), **Habilidad 1/2/3** con enfriamiento visible, **Saltar**, **Poción**.
- Multitouch: moverse y atacar a la vez.
- Botón de pausa arriba a la derecha.
Teclado (pruebas/escritorio): ←/→ o A/D mover, Espacio/W saltar, J atacar, K/L/I habilidades, H poción, Esc pausa.

## Sistemas
- **Clases (3):** Guerrero (melee, mucha vida), Maga (proyectiles mágicos, mucho maná), Arquera (flechas rápidas).
  Cada una: ataque básico + 3 habilidades con coste de maná y enfriamiento.
- **Combate:** hitboxes y proyectiles del jugador; daño = ATK×multiplicador ± 10 %, 10 % crítico ×1,8,
  reducido por DEF. Números de daño flotantes, retroceso, parpadeo de invulnerabilidad.
- **Enemigos:** Esqueleto (cuerpo a cuerpo), Murciélago de ceniza (volador), Cultista (lanza orbes),
  Bruto (lento, golpe fuerte) y jefe **Caballero de Ceniza** (tajo, embestida, onda de choque, invocación).
  Estadísticas escalan con la etapa.
- **Botín:** oro, orbes de vida y equipo (arma/armadura) con rareza Común (blanco), Mágico (azul),
  Raro (amarillo), Épico (morado), Legendario (naranja). Si es mejor que lo equipado se equipa solo;
  si no, se vende automáticamente (inventario simplificado para móvil).
- **Progresión:** EXP → nivel (sube vida/maná/ataque/defensa, curación completa).
  Herrera: forjar arma (+ATK) y reforzar armadura (+vida/+DEF) con oro. Alquimista: pociones.
- **Etapas:** Capítulo 1 "Catacumbas Olvidadas" (1–5), Capítulo 2 "Fortaleza Carmesí" (6–10). Se desbloquean en orden.

## Escenas
| Escena | Rol |
|---|---|
| `Titulo` | Logo, Continuar / Nueva partida |
| `SeleccionClase` | Elegir Guerrero / Maga / Arquera con descripción y stats |
| `Pueblo` | Hub: Herrera, Alquimista, Portal (selector de etapa), maniquí de práctica |
| `Mazmorra` | Etapa jugable: salas, oleadas, jefe, victoria/derrota |

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
etapa máxima. Se guarda al salir de una etapa, al comprar y al subir de nivel.

## Rendimiento objetivo
60 FPS en gama media Android; ≤ 25 enemigos simultáneos; texturas ≤ 2048 px; sin física 2D.

## MVP
Las 4 escenas, 3 clases, 4 enemigos + jefe, 10 etapas, botín por rareza, nivel/EXP, tiendas, guardado,
controles táctiles + teclado, export HTML5 y Cordova/Android.

## Fuera de alcance
Multijugador/PvP, gremios, tienda con dinero real, anuncios, logros en línea, inventario con cuadrícula,
árbol de talentos, más capítulos.

## Definición de terminado
- El proyecto abre en GDevelop 5.6 y exporta sin errores (validado con libGD).
- Todas las instrucciones existen en el motor y con el número correcto de parámetros (validador).
- Gameplay tests automatizados en Chromium pasan (moverse, atacar, matar, botín, sala, jefe, victoria, guardado).
- Capturas reales del juego en `evidence/screenshots/`.
- Export Cordova generado; pasos de APK documentados. DEVICE_PASS requiere prueba en teléfono real.
