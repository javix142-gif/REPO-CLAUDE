# Gameplay tests — 2026-09-29T19:12:30.794Z

Build: `builds/web` · Motor: GDevelop GDJS 5.6.269 · Navegador: Chromium headless (Playwright)

**30/30 PASS**

## ✅ 01 flujo título → clase → pueblo → tiendas → portal (28s)

- PASS arranca en la escena Titulo
- PASS la clase elegida se guarda en Save.Clase
- PASS vida inicial completa (160/160)
- PASS animación de reposo por clase (Guerrero_Idle)
- PASS el jugador se desplaza a la derecha (480 → 607)
- PASS el maniquí recibe un golpe por tajo (3 golpes en 1,3 s)
- PASS aparecen números de daño
- PASS cerca del alquimista aparece la interacción
- PASS el botón táctil de acción se muestra
- PASS tocar el botón de acción abre la tienda
- PASS comprar poción descuenta 30 de oro y suma 1 poción
- PASS el botón X cierra el menú
- PASS la herrería se abre con la tecla E
- PASS sin oro no se puede forjar ("No tienes suficiente oro")
- PASS forjar sube Forja a 1 y ATQ de 12 a 15
- PASS la ficha del personaje se abre (retrato / tecla C)
- PASS el portal abre el selector de etapa
- PASS el portal ofrece campaña, mazmorra y coliseo (Campaña (historia) | Mazmorra (repetir etapa) | Coliseo de la Ceniza (arena))
- PASS la campaña entra a la etapa 1
- PASS la primera vez en cada etapa se lee la página de la historia
- PASS Continuar cierra la página y la etapa no vuelve a mostrarla
- PASS no JavaScript errors in the page ()

## ✅ 02 Guerrero completa la etapa 1 (bot): salas, puertas, jefe, botín, victoria, guardado (109s)

- INFO t=0s sala 1 (nivel 1)
- INFO t=10s sala 2 (nivel 1)
- INFO t=30s sala 3 (nivel 2)
- INFO t=52s sala 4 (nivel 2)
- INFO t=70s sala 5 (nivel 3)
- PASS la etapa termina con el menú de victoria (menú="victoria", estado=libre)
- PASS enemigos derrotados: 27
- PASS se desbloquea la etapa 2 (Save.EtapaMax = 2)
- PASS el personaje sube de nivel (nivel 4)
- PASS se obtiene oro (196)
- PASS las 4 puertas de sala se abrieron
- PASS el botín recogido se equipa (4 objetos; bonus de equipo 60)
- PASS al volver, el jugador aparece junto al portal
- PASS la flecha derecha del portal apunta a la derecha
- PASS con la etapa 2 desbloqueada, la flecha selecciona la etapa 2
- PASS la partida está guardada en localStorage (GDJS_UmbralSave: clase Guerrero, nivel 4, etapa máx. 2)
- PASS tras recargar, el título ofrece "CONTINUAR  (Guerrero nv. 4)"
- PASS Continuar carga la partida guardada en el pueblo
- PASS no JavaScript errors in the page ()

## ✅ 03 Maga: bola de fuego, nova (congela), meteoro (explosión) y barrera (17s)

- PASS el ataque básico lanza una bola de fuego
- PASS la bola de fuego impacta al esqueleto
- PASS se ve el anillo de escarcha
- PASS la nova de escarcha congela al enemigo
- PASS el meteoro cae del cielo
- PASS el meteoro explota al tocar el suelo
- PASS la explosión del meteoro hace daño en área
- PASS la barrera arcana activa el escudo 6 s
- PASS se ve el efecto de escudo
- PASS no JavaScript errors in the page ()

## ✅ 04 Arquera: flecha, disparo triple, lluvia de flechas y paso sombrío (15s)

- PASS el ataque básico dispara una flecha
- PASS la flecha impacta al bruto
- PASS el disparo triple lanza 3 flechas (3)
- PASS las 3 flechas salen en abanico (velocidades verticales distintas)
- PASS la lluvia de flechas genera flechas desde el cielo (3 en vuelo)
- PASS el paso sombrío retrocede 237 px con invulnerabilidad
- PASS no JavaScript errors in the page ()

## ✅ 05 Controles táctiles multitouch (joystick + botones a la vez) (14s)

- PASS arrastrar el joystick a la derecha mueve al jugador (220 → 406)
- PASS con el joystick pulsado, un segundo dedo en ATACAR ataca (estado="ataque")
- PASS el botón de habilidad 1 lanza Torbellino y muestra el enfriamiento (cd 4.5 s, máscara 14/16)
- PASS el botón de salto hace saltar (600 → 498)
- PASS no JavaScript errors in the page ()

## ✅ 06 Pausa, derrota y reintento (16s)

- PASS el botón de pausa abre el menú de pausa
- PASS el juego queda detenido (escala de tiempo 0)
- PASS Continuar reanuda el juego
- PASS al morir aparece el menú de derrota
- PASS se reproduce la animación de muerte
- PASS Reintentar reinicia la etapa con vida completa
- PASS no JavaScript errors in the page ()

## ✅ 07 Jefe: Caballero de Ceniza (barra de vida, ataques y furia) (37s)

- PASS aparece la barra de vida del jefe
- INFO t=0s sala 5 (nivel 1)
- PASS el jefe usa sus ataques (mover, golpe, carga, invocar, muerto)
- PASS derrotar al jefe de capítulo y entrar al portal abre la página final de la historia (menú="final")
- PASS tras la historia llega la victoria y se desbloquea la etapa 5
- PASS no JavaScript errors in the page ()

## ✅ 08 Pantalla 19.5:9 (1560×720): HUD anclado y capítulo 2 (13s)

- PASS la resolución se adapta al ancho (1560×720)
- PASS el botón de ataque sigue anclado a la derecha (x=1390)
- PASS el botón de pausa sigue anclado a la derecha (x=1490)
- PASS la etapa 6 usa el capítulo Fortaleza Carmesí
- PASS no JavaScript errors in the page ()

## ✅ 09 Combate automático (AUTO): la Maga completa la etapa 1 sin tocar nada más (91s)

- PASS AUTO empieza desactivado
- PASS tocar AUTO lo activa (botón dorado)
- INFO t=0s sala 2 (nivel 2, vida 100/100)
- INFO t=12s sala 3 (nivel 2, vida 99/147)
- INFO t=28s sala 4 (nivel 3, vida 145/158)
- INFO t=42s sala 5 (nivel 3, vida 132/158)
- PASS AUTO avanza, combate, vence al jefe y entra al portal (menú="victoria")
- PASS AUTO usa habilidades (21)
- PASS la etapa 2 queda desbloqueada
- PASS no JavaScript errors in the page ()

## ✅ balance Guerrero nivel 9 en etapa 5 (AUTO) (103s)

- INFO arma +25 ATQ, armadura +80 VIDA, forja/refuerzo 2
- INFO t=0s sala 1 (nivel 9, vida 414/414)
- INFO t=10s sala 2 (nivel 9, vida 375/414)
- INFO t=31s sala 3 (nivel 9, vida 285/414)
- INFO t=52s sala 4 (nivel 9, vida 191/414)
- INFO t=69s sala 5 (nivel 10, vida 309/432)
- INFO resultado: menú="victoria", vida 386/432, pociones restantes 8
- PASS el personaje del nivel recomendado supera la etapa 5 (menú="victoria")
- PASS no JavaScript errors in the page ()

## ✅ balance Maga nivel 15 en etapa 8 (AUTO) (165s)

- INFO arma +40 ATQ, armadura +125 VIDA, forja/refuerzo 4
- INFO t=0s sala 1 (nivel 15, vida 439/439)
- INFO t=19s sala 2 (nivel 15, vida 290/439)
- INFO t=72s sala 3 (nivel 15, vida 262/439)
- INFO t=108s sala 4 (nivel 15, vida 264/439)
- INFO t=131s sala 5 (nivel 16, vida 391/450)
- INFO resultado: menú="final", vida 461/522, pociones restantes 7
- PASS el personaje del nivel recomendado supera la etapa 8 (menú="final")
- PASS no JavaScript errors in the page ()

## ✅ balance Arquera nivel 23 en etapa 12 (AUTO) (155s)

- INFO arma +60 ATQ, armadura +186 VIDA, forja/refuerzo 6
- INFO t=0s sala 1 (nivel 23, vida 704/704)
- INFO t=19s sala 2 (nivel 23, vida 520/704)
- INFO t=54s sala 3 (nivel 23, vida 368/704)
- INFO t=85s sala 4 (nivel 24, vida 570/718)
- INFO t=114s sala 5 (nivel 24, vida 691/718)
- INFO resultado: menú="final", vida 732/732, pociones restantes 8
- PASS el personaje del nivel recomendado supera la etapa 12 (menú="final")
- PASS no JavaScript errors in the page ()

## ✅ 10 Doble salto, ataque hacia arriba/diagonal y combo de tres golpes (19s)

- PASS un salto normal despega (altura 108 px)
- PASS el segundo toque en el aire consume el doble salto (Saltos=1)
- PASS el doble salto llega más alto (190 px frente a 108 px)
- PASS al aterrizar se recupera el doble salto
- PASS no hay triple salto (un tercer toque no vuelve a impulsar)
- PASS Arriba + atacar: el golpe aparece sobre la cabeza (dx 0, dy -130, anim Guerrero_AttackUp)
- PASS usa la animación de ataque hacia arriba
- PASS Arriba + derecha + atacar: golpe en diagonal (dx 45, dy -106)
- PASS usa la animación de ataque en diagonal
- INFO secuencia de combo observada: 1 (daño x1) → 2 (daño x1) → 3 (daño x1.9, fuerte) → 1 (daño x1) → 2 (daño x1) → 3
- PASS atacar seguido recorre el combo 1 → 2 → 3
- PASS el tercer golpe es potenciado (daño x1,9 y empuje fuerte)
- PASS los dos primeros golpes son normales
- PASS no JavaScript errors in the page ()

## ✅ 11 Ataque hacia arriba con proyectiles (Maga/Arquera) y apuntado con el joystick táctil (11s)

- PASS empujar el joystick hacia arriba da In.AY negativo (-0.79)
- PASS con el joystick arriba, ATACAR lanza un proyectil
- PASS la bola de fuego sube (vx 0, vy -720, ángulo -90°)
- PASS diagonal hacia arriba-izquierda (vx -509, vy -509)
- PASS no JavaScript errors in the page ()

## ✅ 12 Murciélagos: vuelo con inercia, siguen tu salto y pican con aviso (18s)

- PASS el murciélago se mueve sin saltos bruscos (máx 8.0 px por muestra de 50 ms)
- PASS ondula al volar (altura relativa -226…-181)
- PASS tiene velocidad e inercia (VX/VY)
- PASS al saltar cerca de él, el murciélago baja a tu altura (dy -222 → 45)
- PASS el murciélago ataca (estado "atacar" durante 36 muestras)
- PASS aviso lento y picado rápido (90 → 649 px/s)
- PASS pica atravesando la posición del héroe y sigue de largo (dist. mín. 10 px)
- PASS no JavaScript errors in the page ()

## ✅ 13 Plataformas con propósito: salas generadas, cofres alcanzables, pinchos y cultistas apostados (23s)

- PASS 4 salas generadas distintas cumplen las reglas de alcance (sin problemas; 20 cofres)
- INFO paso más difícil de la sala 1: hueco 136 px, subida 87 px
- PASS el paso más difícil se supera con salto + doble salto y se aterriza en la plataforma siguiente
- PASS al tocar el cofre se abre
- PASS el cofre da oro (+36) y cuenta en las estadísticas (1)
- PASS los pinchos hacen daño (114 → 104)
- PASS la oleada trae cultistas (3)
- INFO cultistas apostados: [{"y":417,"x":2685.457632,"x0":2599,"x1":2807,"tipo":"Cultista","est":"mover","hp":48,"plat":[[2559,417,288]]},{"y":380,"x":3007,"x0":3007,"x1":3215,"tipo":"Cultista","est":"mover","hp":48,"plat":[[2967,380,288]]},{"y":417,"x":2685.457632,"x0":2599,"x1":2807,"tipo":"Cultista","est":"mover","hp":48,"plat":[[2559,417,288]]}]
- PASS los cultistas apostados (3) se quedan sobre su plataforma
- PASS no JavaScript errors in the page ()

## ✅ 14 RPG: reparto de puntos de atributo, habilidades nuevas y menú de habilidades (28s)

- PASS en el nivel 1 no hay puntos que repartir
- PASS nivel 5 = 12 puntos de atributo (12)
- PASS el HUD avisa de los puntos (“+12 PUNTOS”)
- PASS la tecla C abre la ficha del personaje
- PASS el botón Atributos abre el reparto de puntos
- PASS los botones reparten los puntos (F3 V2 D1 E2, quedan 4)
- PASS Fuerza: +1 ATQ por punto (22 → 25)
- PASS Vitalidad: +8 vida por punto (232 → 248)
- PASS Destreza: +0,5% crítico (0.1 → 0.10500000000000001)
- PASS Espíritu: +3 maná y menos enfriamiento (maná 52 → 58, cd 5 → 4.94)
- PASS sin puntos no se puede seguir subiendo (Fuerza 7, puntos 0)
- PASS reiniciar puntos los devuelve y cuesta oro
- PASS al llegar al nivel 4 se equipa la habilidad nueva de la ranura 2 (nivel 22)
- PASS el icono de la ranura 2 cambia (Guerrero2)
- PASS coste y enfriamiento de Salto sísmico (18 maná, 8.0 s)
- PASS la ficha abre el menú de habilidades
- PASS la ranura 1 sigue con la habilidad inicial antes del nivel 8
- PASS la ranura 2 vuelve a la habilidad inicial si se cambia
- PASS y se puede volver a equipar la nueva
- PASS en el nivel 8 se puede equipar el Ciclón de acero (coste 22)
- PASS no JavaScript errors in the page ()

## ✅ 15 Guerrero: Ciclón de acero, Salto sísmico y Espada giratoria (22s)

- INFO tajos simultáneos máx 1; vida enemigos [90000,90000,90000] → [89716,89825,89855]
- PASS el Ciclón de acero daña a los 3 enemigos alrededor (3/3)
- PASS genera golpes giratorios
- PASS el Salto sísmico eleva al héroe (191 px)
- PASS al caer crea una onda de choque ancha y fuerte (>= 400 px)
- PASS la onda daña al enemigo cercano (89855 → 89703)
- PASS el héroe vuelve a estar libre tras el aterrizaje
- PASS lanza una espada que perfora
- PASS la espada atraviesa y daña a los 3 enemigos en línea (3/3)
- PASS no JavaScript errors in the page ()

## ✅ 16 Maga: Tormenta de rayos, Aura ígnea y Cataclismo (25s)

- PASS caen varios rayos a la vez (3)
- PASS los tres enemigos reciben un rayo (3/3)
- PASS el Aura ígnea queda activa durante 4.1 s
- PASS quema al enemigo cercano varias veces (6 golpes en 2,4 s)
- PASS el Cataclismo crea una explosión de 1100 px
- PASS daña a todos los enemigos de la pantalla (4/4)
- PASS no JavaScript errors in the page ()

## ✅ 17 Arquera: Flecha explosiva, Ráfaga y Disparo celestial (19s)

- PASS la flecha explota al impactar
- PASS la explosión daña a los dos enemigos juntos (90000,90000 → 89697,89806)
- PASS la Ráfaga dispara 8 flechas (8 detectadas)
- PASS y salen hacia arriba cuando se apunta arriba
- PASS la flecha celestial es enorme y perfora
- PASS atraviesa a los tres enemigos alineados (4/3)
- PASS no JavaScript errors in the page ()

## ✅ 18 Enemigos nuevos: arquero, espectro, gólem y limo (se divide en dos) (27s)

- PASS el arquero esquelético dispara flechas a distancia
- PASS el espectro lanza orbes
- PASS el espectro se desvanece para teletransportarse
- PASS vuela por encima del suelo (altura mínima y=428)
- PASS el gólem lanza una onda de choque por el suelo
- INFO estado del gólem al atacar: mover
- PASS un limo grande se divide en dos pequeños (LimoMini, LimoMini)
- PASS los limos pequeños usan su propia animación (LimoMini_Walk, LimoMini_Walk)
- PASS no JavaScript errors in the page ()

## ✅ 19 Élites: un enemigo normal con más vida, más grande y con refuerzos (14s)

- PASS el élite tiene ~4,5 veces la vida del enemigo base (2142 vs 476)
- PASS y más daño (84 vs 62)
- PASS y es más grande (252 vs 180 px)
- PASS el élite invoca refuerzos (2 → 4 enemigos)
- PASS no JavaScript errors in the page ()

## ✅ 20 Jefe del capítulo 2: Reina Carmesí (orbes, lluvia de sangre, teletransporte y refuerzos) (53s)

- PASS el jefe de la etapa 8 es la Reina (Reina, 3735 de vida)
- PASS la barra muestra su nombre ("REINA CARMESÍ")
- PASS aparece la barra de vida del jefe
- PASS lanza orbes de sangre en abanico (estados: mover, invocar, desvanecer, corte, orbes, sangre)
- PASS invoca la lluvia de sangre (con aviso en el suelo)
- PASS se desvanece y tajea por la espalda
- PASS herida, invoca murciélagos
- PASS no JavaScript errors in the page ()

## ✅ 21 Jefe del capítulo 3: Coloso del Umbral (puñetazo, barrido, cristales y limos) y final de la historia (34s)

- PASS el jefe de la etapa 12 es el Coloso (Coloso, 7140 de vida)
- PASS la barra muestra su nombre ("COLOSO DEL UMBRAL")
- PASS puñetazo con ondas de choque (estados: mover, invocar, rocas, golpe, barrido)
- PASS barrido de área
- PASS lluvia de cristales
- PASS a media vida invoca limos
- PASS derrotar al Coloso completa la historia (Save.Historia = 1)
- PASS tras el final de la historia llega la victoria de la campaña
- PASS sólo ofrece volver al pueblo (Volver al pueblo)
- PASS la etapa máxima queda en 12
- PASS no JavaScript errors in the page ()

## ✅ 22 Campaña: 3 capítulos con su tema, relato de cada etapa, diario y Archivista (25s)

- PASS la etapa 5 pertenece al capítulo "Fortaleza Carmesí"
- PASS la etapa 5 abre su página de historia
- PASS suelo, plataformas y muros usan el tema "fortaleza" (suelo_fortaleza.png, plataforma_fortaleza.png, muro_fortaleza.png)
- PASS la etapa 9 pertenece al capítulo "Abismo de Cristal"
- PASS la etapa 9 abre su página de historia
- PASS suelo, plataformas y muros usan el tema "abismo" (suelo_abismo.png, plataforma_abismo.png, muro_abismo.png)
- PASS cerca del Archivista aparece la interacción
- PASS el Archivista abre su menú
- PASS 'Leer el diario' abre el códice de historia
- PASS las flechas pasan las páginas del diario
- PASS no JavaScript errors in the page ()

## ✅ 23 Coliseo: rondas sin fin, jefe cada 5 rondas, récord guardado y derrota (27s)

- PASS el coliseo arranca como modo arena
- PASS la dificultad base sigue tu nivel (etapa 6)
- PASS la primera ronda genera enemigos sin abrir puertas
- PASS superar la ronda da oro (60 → 76)
- PASS el récord del coliseo sube a la ronda 1
- PASS el récord del coliseo sube a la ronda 2
- PASS el récord del coliseo sube a la ronda 3
- PASS el récord del coliseo sube a la ronda 4
- PASS la ronda 5 trae un jefe (Bruto, Grom, el Devorador)
- PASS el récord conserva las rondas superadas (4)
- PASS 'Otro combate' reinicia el coliseo en la ronda 1
- PASS no JavaScript errors in the page ()

## ✅ 24 Mazmorra: repite una etapa con un élite al azar del capítulo y no avanza la historia (28s)

- PASS la mazmorra no muestra páginas de historia
- PASS el jefe sale del capítulo 2 (élite nº 5)
- PASS es un élite (Espectro) con nombre en la barra ("La Dama de los Lamentos")
- PASS la mazmorra no muestra páginas de historia
- PASS el jefe sale del capítulo 2 (élite nº 7)
- PASS la mazmorra no muestra páginas de historia
- PASS el jefe sale del capítulo 2 (élite nº 7)
- INFO élites vistos (índices): 5, 7
- PASS la mazmorra no cambia la etapa máxima de la campaña
- PASS no JavaScript errors in the page ()

## ✅ 25 Partida guardada por la versión 1.0.0: carga y usa lo nuevo con valores por defecto (19s)

- PASS el título ofrece "CONTINUAR  (Maga nv. 7)"
- PASS se conservan nivel, etapa máxima y oro
- PASS los puntos de atributo se derivan del nivel (18 = 3 × 6)
- PASS las habilidades equipadas son las iniciales (1, 1, 1)
- PASS las habilidades de la Maga tienen coste y enfriamiento (16 PM)
- PASS la ficha del personaje se abre con la partida antigua
- PASS la campaña sigue en la etapa 4 y muestra su página de historia
- PASS la habilidad 1 de la Maga se lanza con normalidad
- PASS no JavaScript errors in the page ()

## ✅ 26 Combo: tres animaciones distintas por clase, el 3.º sin texto y se reinicia si tardas (49s)

- PASS Guerrero: los tres golpes usan tres animaciones distintas (Guerrero_Attack → Guerrero_Attack2 → Guerrero_Attack3)
- PASS Guerrero: el 2.º golpe muestra "Combo x2" y el 3.º ya no dice ningún texto
- PASS Guerrero: el golpe fuerte lanza sus partículas de impacto
- PASS Guerrero: si pasa demasiado tiempo el combo vuelve al golpe 1
- PASS Guerrero: un segundo ataque tardío tampoco enlaza (sigue en el golpe 1)
- PASS Maga: los tres golpes usan tres animaciones distintas (Maga_Attack → Maga_Attack2 → Maga_Attack3)
- PASS Maga: el 2.º golpe muestra "Combo x2" y el 3.º ya no dice ningún texto
- PASS Maga: el golpe fuerte lanza sus partículas de impacto
- PASS Maga: si pasa demasiado tiempo el combo vuelve al golpe 1
- PASS Maga: un segundo ataque tardío tampoco enlaza (sigue en el golpe 1)
- PASS Arquera: los tres golpes usan tres animaciones distintas (Arquera_Attack → Arquera_Attack2 → Arquera_Attack3)
- PASS Arquera: el 2.º golpe muestra "Combo x2" y el 3.º ya no dice ningún texto
- PASS Arquera: el golpe fuerte lanza sus partículas de impacto
- PASS Arquera: si pasa demasiado tiempo el combo vuelve al golpe 1
- PASS Arquera: un segundo ataque tardío tampoco enlaza (sigue en el golpe 1)
- PASS no JavaScript errors in the page ()

## ✅ 27 Enemigos golpeados: se recuperan del golpe y vuelven a actuar (19s)

- PASS Esqueleto: el golpe lo deja herido un momento
- PASS Esqueleto: se recupera solo en menos de 1,5 s (estado "mover")
- PASS el esqueleto vuelve a caminar hacia el héroe (420 → 330)
- PASS Cultista: el golpe lo deja herido un momento
- PASS Cultista: se recupera solo en menos de 1,5 s (estado "mover")
- PASS Arquero: el golpe lo deja herido un momento
- PASS Arquero: se recupera solo en menos de 1,5 s (estado "mover")
- PASS Limo: el golpe lo deja herido un momento
- PASS Limo: se recupera solo en menos de 1,5 s (estado "mover")
- PASS no JavaScript errors in the page ()
