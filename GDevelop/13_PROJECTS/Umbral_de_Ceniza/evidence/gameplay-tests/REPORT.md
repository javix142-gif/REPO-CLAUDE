# Gameplay tests — 2026-09-29T14:52:22.047Z

Build: `builds/web` · Motor: GDevelop GDJS 5.6.269 · Navegador: Chromium headless (Playwright)

**1/1 PASS**

## ✅ 13 Plataformas con propósito: salas generadas, cofres alcanzables, pinchos y cultistas apostados (24s)

- PASS 4 salas generadas distintas cumplen las reglas de alcance (sin problemas; 20 cofres)
- INFO paso más difícil de la sala 1: hueco 127 px, subida -7 px
- PASS el paso más difícil se supera con salto + doble salto y se aterriza en la plataforma siguiente
- PASS al tocar el cofre se abre
- PASS el cofre da oro (+27) y cuenta en las estadísticas (1)
- PASS los pinchos hacen daño (120 → 110)
- PASS la oleada trae cultistas (3)
- INFO cultistas apostados: [{"y":493,"x":2436.0381679999996,"x0":2298,"x1":2506,"tipo":"Cultista","est":"mover","hp":48,"plat":[[2258,493,288]]},{"y":490,"x":2715,"x0":2715,"x1":2827,"tipo":"Cultista","est":"mover","hp":48,"plat":[[2675,490,192]]}]
- PASS los cultistas apostados (2) se quedan sobre su plataforma
- PASS no JavaScript errors in the page ()
