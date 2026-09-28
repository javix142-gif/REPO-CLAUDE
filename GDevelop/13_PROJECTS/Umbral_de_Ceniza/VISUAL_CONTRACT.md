# VISUAL_CONTRACT.md — Umbral de Ceniza

## Referencia
Género/lectura visual de RPG de acción pixel lateral para móvil (tipo *Darkrise*): personajes pequeños
con contorno oscuro, mazmorras de piedra azulada iluminadas por antorchas, botín con haz de color por
rareza, números de daño grandes, HUD compacto arriba-izquierda y racimo de botones abajo-derecha.
No se usa ningún asset, captura ni texto del juego de referencia.

## Cámara
- Tipo: 2D ortográfica, zoom 1.
- Seguimiento: centro X del jugador con `lerp` 0.12/frame; Y fijo en mazmorra (suelo a 600 px),
  suavizado en pueblo.
- Límites: en `Mazmorra`, bordes de la sala activa mientras hay enemigos; luego bordes del nivel.
- Área visible: 1280×720 lógicos, ancho ampliado en pantallas alargadas.

## Escala
- Densidad única de píxel **×3** para jugador, enemigos, props, FX y tiles (1 píxel de arte = 3 px).
- Fondos lejanos también ×3 (tiled horizontal).
- Jugador ≈ 84 px de alto visible (≈ 12 % de la altura). Enemigos comunes 60–110 px. Jefe ≈ 250 px.
- UI: iconos 16×16 de arte ×3 (48 px); botones táctiles 96–150 px de diámetro.

## Pivotes
- Origen de todos los sprites en (0,0) (esquina sup-izq), cuerpo centrado horizontalmente en el frame
  para que el volteo (`FlipX`) no desplace al personaje.
- Máscara de colisión personalizada idéntica en todos los frames de cada personaje (caja del cuerpo)
  para que el `PlatformerObject` no se "enganche" al cambiar de animación.

## Profundidad/z-order
| Capa | Contenido |
|---|---|
| `Fondo` | cielo/muros lejanos (parallax 0.25) |
| `Medio` | pilares/casas (parallax 0.55) |
| base `""` | suelo, plataformas, props (z 0–9), enemigos (z 10), jugador (z 20), FX (z 30), números (z 40) |
| `HUD` | barras, textos, botones táctiles, paneles |
| `Menu` | pausa / victoria / derrota / diálogos de tienda |

## HUD
- Anclas con `AnchorBehavior`: bloque de estado arriba-izquierda; oro/pausa arriba-derecha;
  joystick abajo-izquierda; botones abajo-derecha.
- Márgenes mínimos: 40 px laterales (notch), 24 px superior/inferior.
- Aspect ratios a validar: 16:9 (1280×720), 19.5:9 (1560×720), 4:3 (960×720 no soportado: se ve igual en ancho mínimo 1280).

## Tiles/seams
- Suelo `TiledSprite` 96×96 sin costuras (borde superior con piedras, relleno oscuro).
- Plataformas atravesables `TiledSprite` 96×30.
- Fondos diseñados para repetir en horizontal sin costura.

## Animación
- 10–12 FPS para personajes (0.08–0.1 s/frame), FX 0.05–0.06 s/frame.
- Jugador: Idle 4, Run 6, Jump 1, Fall 1, Attack 4, Cast 3, Hurt 1, Dead 3 (por clase).
- Enemigos: Idle/Walk/Attack/Hurt/Dead según tipo (ver `ASSET_MANIFEST.json`).

## Tolerancias
- Ningún sprite de gameplay con densidad distinta de ×3.
- Botones táctiles ≥ 88 px (≈ 9 mm en 5.5").
- Texto de HUD ≥ 22 px lógicos; contraste texto/fondo ≥ 4.5:1 (contorno negro de 3 px).

## Gate
No aprobar por descripción del agente: capturas reales del export HTML5 en `evidence/screenshots/`
(16:9 y 19.5:9). DEVICE_PASS exige captura en teléfono Android real.
