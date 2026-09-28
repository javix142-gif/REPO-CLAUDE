# Resumen ejecutivo  
GDevelop es un motor de juegos 2D/3D libre y multiplataforma con abundante documentación y recursos. En las secciones siguientes se describen los recursos oficiales y comunitarios más destacados: desde la documentación y tutoriales oficiales (wiki y *GDevelop Academy*), hasta cursos formales, repositorios de ejemplos, plantillas y *asset packs*, extensiones (oficiales y de la comunidad), foros/comunidades y blogs. Cada recurso incluye idioma, licencia, nivel recomendado y fecha de actualización (si se conoce). Se muestran tablas comparativas para cursos y repositorios clave. Al final se brindan sugerencias prácticas (flujo de trabajo con diagrama *mermaid*, plantillas y assets recomendados, buenas prácticas) para empezar a crear un juego 2D con GDevelop. 

## Documentación oficial  
- **Wiki GDevelop (gdevelop.io / wiki.gdevelop.io)** – Manual oficial en inglés (versión GDevelop 5), con guías completas de interfaz, *event sheets*, comportamientos, extensiones, API, etc. Cubre desde “Getting Started” hasta temas avanzados (comportamientos, multiplayer, etc). Formato: texto en web (wiki). Licencia MIT (open-source). Relevante por ser la fuente definitiva de información técnica y de referencia.  
- **Documentación del motor (docs.gdevelop.io)** – Documentación técnica generada (TypeDoc) del motor de juego (bibliotecas Core, GDJS y bindings). Detalla clases y APIs JavaScript para programadores. Formato: web (documentos auto-generados). Licencia MIT. Actualizado con cada versión de GDevelop (versión 5.x a 6?). Ideal para usuarios avanzados o desarrolladores de extensiones.  
- **GDevelop Academy (Academia GDevelop)** – Portal oficial de tutoriales y cursos. Aunque gran parte está en inglés, hay secciones en español (títulos y descripciones). Incluye tutoriales paso a paso en video/texto (intro al motor, game jams, mecánicas, extensiones), además de **cursos estructurados** (ver sección “Cursos”). Formato: videos incrustados, artículos y lecciones interactivas. Actualizado regularmente (se muestran fechas de 2026 en el blog oficial de GDevelop, el cual enlaza con la academia).  
- **GDevelop en otros idiomas** – El sitio permite cambiar de idioma (español, francés, portugués, etc). La documentación principal está en inglés, pero hay traducciones parciales. P.ej. la interfaz del editor aparece en español si se selecciona idioma, y algunas páginas de ayuda tienen versiones traducidas (Ver “English / Español” en footer). En general, la información más actual y completa suele estar en inglés.  

## Tutoriales paso a paso  
- **Tutoriales oficiales en la wiki** – La documentación incluye tutoriales guiados para crear juegos sencillos. Ejemplos:  
  - *Tank Shooter* (juego de disparos básico). Un tutorial para principiantes que enseña a crear un juego donde un tanque dispara enemigos. Idioma: inglés. Nivel: Principiante. Formato: artículo web. Licencia MIT. Por qué es relevante: introduce la interfaz, creación de escenas, objetos y eventos básicos.  
  - *Road Rider* (juego de carrera infinita). Tutorial intermedio para desarrollar un juego de carro donde el jugador esquiva tráfico. Idioma: inglés. Nivel: Principiante-Intermedio. Formato: artículo web. Licencia MIT. Útil para aprender a manejar objetos en movimiento, colisiones y puntuación.  
  - *Top-down Shooter*. Tutorial avanzado dividido en varias partes (crea un shooter visto desde arriba). Idioma: inglés. Nivel: Intermedio. Formato: artículos web multipartes. Cubren manejo de IA básica, salud de enemigos, etc.  
  Estos tutoriales oficiales están actualizados (publicaciones recientes en 2024-2026) y se integran con la versión actual del editor. Por ejemplo, el tutorial *Road Rider* inicia así: “This tutorial will help you get more familiar with GDevelop. Our primary focus... hacer un endless car game”.  

- **Tutoriales oficiales en video (YouTube)** – El canal oficial de GDevelop incluye tutoriales paso a paso en video (nivel básico e intermedio) en inglés. Algunos ejemplos: crear un juego de plataformas, entender el engine físico, multiplayer, etc. En la Academia GDevelop se agrupan estos videos (la mayoría en inglés). *Ejemplo:* el video “Platformer (In Depth Tutorial)” del canal GDevelop – enseña un juego de plataformas desde cero. No hemos encontrado equivalentes oficiales en español en video, pero existen canales de la comunidad: Omel Pixela y Gonzalo Oliver (tienen series en español sobre GDevelop, p.ej. “Curso de GDevelop 2025” en YouTube).  

- **Tutoriales comunitarios en español** – Hay varios recursos no oficiales en español:  
  - **Series de YouTube**: Omel Pixela (tutorial RPG, plataformas, lógica de enemigos), Gonzalo Oliver “Ninja” (“Curso GDevelop” con ejemplos básicos), y otros creadores latinos. Formato: video.  
  - **Blogs y sitios**: Algunos sitios como *Manual GDevelop* (Google Sites, vídeos tutoriales) recopilan contenido, aunque pueden estar desactualizados. Siempre hay que verificar la versión de GDevelop usada.  
  No siempre hay citas formales para estos, pero vale mencionarlos como recurso en español.  

## Cursos  
- **GDevelop Essentials Course (Curso Esencial de GDevelop)** – Curso oficial de GDevelop (accesible dentro del editor o web) para principiantes. Enseña “los conceptos básicos del desarrollo de juegos con GDevelop para crear, pulir y publicar tu primer juego casual”. Idioma: español/inglés (texto guía en español). Nivel: Principiante. Formato: lecciones interactivas en el editor. Duración: ~15–20 horas (estimado en 2025). Costo: €8.99 (pago único). Licencia: acceso limitado tras pago; contenido restringido a suscriptores (incluido en plan Premium Gold, ver abajo). Relevante por ser curso oficial actualizado.  
- **Introducción a JavaScript para GDevelop** – Otro curso oficial de la Academia orientado a usuarios intermedios. Enseña los fundamentos de JavaScript para extender GDevelop. Idioma: español/inglés. Nivel: Intermedio. Formato: lecciones en el editor. Duración: ~8–10 horas (estimado). Costo: €8.99 (pago único). Permite aprender a usar código personalizado en GDevelop.  
- **Cursos institucionales (ej. CADIF1)** – Plataformas educativas ofrecen cursos completos en español. Ejemplo: **Curso GDevelop – CADIF1 (Venezuela)**. Tiene niveles I y II (Desde conocer GDevelop hasta “Crear videojuegos avanzados”). Modalidad: cursos en línea/en vivo. Idioma: español. Nivel: Principiante a Avanzado. Duración: no especificada (programa modular). Costo: no publicado (por contacto). Incluye certificado “Programador de Videojuegos con GDevelop”. Relevancia: curso estructurado de tercero, orientado a principiantes y educadores.  
- **Otros cursos en línea**: Hay cursos en plataformas como Udemy (por ejemplo en portugués) o YouTube (cursos gratuitos básicos en español). También GDevelop anuncia planes Premium (Silver/Gold) que incluyen acceso ilimitado al curso Essentials. Por ejemplo, el plan Gold ofrece “Acceso ilimitado al curso GDevelop Essentials” junto con beneficios avanzados.  

*Tabla comparativa de cursos* (idioma, nivel, duración aprox. y costo):  

| Curso / Plataforma                           | Idioma     | Nivel         | Duración (aprox.) | Costo      | Formato       | Fuente                |
|----------------------------------------------|------------|---------------|-------------------|------------|---------------|-----------------------|
| **GDevelop Essentials (oficial)**            | Español/Inglés | Principiante | ~15–20 h          | €8.99      | Online (editor) | GDevelop Academy |
| **Introducción a JavaScript (oficial)**      | Español/Inglés | Intermedio   | ~8–10 h           | €8.99      | Online (editor) | GDevelop Academy |
| **Curso GDevelop – CADIF1 (institucional)**  | Español    | Principiante-Avanzado | por módulos (niveles I y II) | *No espec.* | Online/Presencial | CADIF1 |
| **Planes Premium (GDevelop Silver/Gold)**    | Español/Inglés | Varios     | –                 | $Monthly/$ anual | Suscripción (Editor) | GDevelop Pricing |

## Repositorios de ejemplo/plantillas  
- **GDevelop-examples (GitHub)** – Repositorio oficial que agrupa ejemplos de proyectos y *starters* para GDevelop 5. Contiene docenas de plantillas (plataformas, shooters, ARPG, puzzles, demos 3D, etc.), todas open-source (en MIT salvo indicación). Idioma: inglés. Formato: código en GitHub. Actualización: activo (contribuciones regulares). Nivel: desde Principiante a Avanzado (cada ejemplo indica su complejidad). Licencia: MIT. Relevancia: facilita comenzar un proyecto usando un ejemplo listo, estudiar buenas prácticas y experimentar. Todos los ejemplos pueden buscarse/descargarse desde el editor.  
- **Game Templates y Asset Packs oficiales** – GDevelop mantiene una galería de plantillas (templates) y paquetes de assets en su Asset Store (sitio web oficial). Hay plantillas gratuitas como *Platformer (rol)*, *Road Crosser*, *Brick Breaker*, etc., y *assets* (sprites, música, UI) tanto libres como de pago. Idioma: mixto (descripciones en inglés). Formato: descargas en web. Actualización: periódica (nuevos recursos en 2026). Licencia: depende (muchos assets libres son CC0/MIT, los pagos tienen su propia licencia). Relevancia: atajos prácticos – p.ej., usar el Template “Platformer (Free)” acelera el desarrollo inicial.  
- **Otros repositorios en GitHub**: Varios usuarios comparten ejemplos en GitHub/Itch.io. Ejemplo notable: la rama **examples/** en 4ian/GDevelop (anteriormente compilgames) contenía starters de demos. Pero lo principal es GDevelop-examples. Se aconseja clonar y modificar estos proyectos para aprender.  

*Tabla comparativa de repositorios oficiales de ejemplos y plantillas:*  

| Repositorio                      | Contenido                               | Licencia    | Actualización | Formato  |
|----------------------------------|-----------------------------------------|-------------|---------------|----------|
| **GDevelopApp/GDevelop-examples**    | Proyectos de ejemplo y templates GDevelop 5 (múltiples géneros) | MIT (Open Source) | Activo (commits frecuentes) | Código GitHub |
| **GDevelopApp/GDevelop-extensions**  | Extensiones oficiales (objetos, comportamientos) | MIT | Activo (1,200+ commits) | Código GitHub |
| **GDevelopApp/GDevelop-community-list** | Lista de extensiones de la comunidad (enlaces) | – (varía)    | Semiestático (20+ extensiones) | Lista en GitHub |

En la tabla anterior se resumen ejemplos destacados. Todos los recursos listados se pueden descargar/instalar directamente desde GDevelop. Además, en la tienda oficial hay plantillas y recursos gráficos listos para usar.  

## Packs de *assets*  
- **GDevelop Asset Store (tienda oficial)** – Contiene centenas de paquetes de recursos (sprites, tilesets, íconos, audios) tanto gratuitos como premium. Idioma: inglés (títulos y descripciones). Formato: packs listos para descarga. Última actualización: 2026 (nuevos packs cada mes). Licencia: los gratuitos son típicamente CC0 o MIT; los pagos tienen sus propias licencias comerciales. Ejemplos: “2D Pixel Quest” (pago) contiene múltiples sprites pixel art, “Player Avatar” (grátis) con avatares de personajes. Es un recurso oficial relevante para encontrar gráficos y sonidos sin buscar fuera de GDevelop.  
- **Recursos externos gratuitos**: Además, se recomiendan bibliotecas como **Kenney Assets** (CC0 gratuitos para 2D y 3D), **OpenGameArt** (variado, CC licencias), y colecciones de gráficos pixel (p.ej., CraftPix en su sección free). Estos repos se usan comúnmente con GDevelop.  

## Plugins / Extensiones  
- **GDevelop-extensions (GitHub oficial)** – Repositorio oficial con las extensiones “oficiales” de GDevelop (objetos especiales, comportamientos, acciones/condiciones extra). Contiene decenas de extensiones (ej. físicas Box2D/WebAssembly, comportamiento *top-down*, *platformer*, motores 3D Jolt, etc.). Idioma: inglés (código JSON/JS). Formato: código en GitHub. Nivel: Avanzado (para crear/extender juegos). Licencia: MIT. Relevancia: permite ampliar GDevelop sin programación, usando funcionalidades avanzadas probadas.  
- **Extensiones de la comunidad** – Muchas extensiones creadas por usuarios (ver **GDevelop-community-list**). Ejemplo: “If Else” para comparaciones de variables, “Encrypted storage” para cifrar guardados, etc. Idioma: inglés (principalmente). Formato: lista en GitHub con links; cada extensión se instala como archivo JSON en el proyecto. Licencia: cada autor puede aplicarle su propia licencia (revisar antes de usar). Nivel: Intermedio/Avanzado. Útiles para funcionalidades específicas no incluidas oficialmente. Nota: estas no son revisadas por el equipo oficial, por lo que hay que usarlas con precaución.  
- **Explorar extensiones en el editor** – El propio GDevelop incluye un gestor para buscar e instalar extensiones (oficiales y de la comunidad) directamente desde el editor, facilitando su uso.  

## Foros y comunidades  
- **Foro oficial GDevelop (forum.gdevelop.io)** – Comunidad global de soporte en inglés (categorías “General”, “How do I…?”, etc.). Contiene también un **Foro Español**: sección dedicada donde hispanohablantes plantean dudas y comparten recursos. Formato: discusiones web. Licencia: estándar de foro (no aplica contenido abierto). Relevancia: principal lugar de consulta de dudas; activa (nuevas publicaciones diarias).  
- **Discord de GDevelop** – Servidor oficial de chat en tiempo real (inglés). Miles de miembros (solo en 2019 ya eran ~5,700). Ofrece canales de ayuda, noticias, demostraciones, “gaming”. Idioma: mayoritariamente inglés. Permite soporte rápido y conversaciones informales con devs y usuarios.  
- **Subreddit /r/gdevelop** – Comunidad en Reddit (inglés, ~2K miembros semanales en 2026) donde usuarios comparten proyectos, dudas y tutoriales (ej. “Why use GDevelop vs AI?”). Relevancia: foro adicional para discusiones generales, aunque no tan activo como Discord/foro oficial.  
- **Otros canales**: Grupo de Facebook “GDevelop [ES]” (no oficial) para hispanos, #GDevelop en StackOverflow (pocas preguntas), y grupos de Telegram en español (limitados). También la página de GDevelop en Crowdin para traducción (parte de la comunidad global).  

## Artículos y blogs  
- **Blog oficial de GDevelop (gdevelop.io/blog)** – Publica noticias, estudios de caso y tutoriales en inglés. Ejemplos de entradas recientes: resultados de *Game Jams* organizados por GDevelop, historias de desarrolladores que usan GDevelop (teachers, estudios indie), y lanzamientos de nuevas versiones (p.ej. editor 3D). Idioma: inglés (algunos artículos traducidos al español). Formato: artículos web. Actualización: frecuente (varios posts al año; se registran actualizaciones en 2025-2026). Relevancia: fuente de novedades oficiales y motivación (ver que proyectos reales usan GDevelop).  
- **Blogs de terceros**: Hay blogs y artículos de la comunidad (p.ej. en sitios de gamedev o educación) que reseñan GDevelop o dan tutoriales. También posts en Medium/LinkedIn de usuarios que comparten guías (solo algunos en español, p.ej. *Ángel González: cómo GDevelop en educación*). No existe un blog comunitario único, pero el foro y redes suelen enlazar material interesante. Se recomienda buscar “tutorial GDevelop” o “game jam GDevelop” para encontrar artículos actualizados de la comunidad.  

## Sugerencias prácticas para empezar un proyecto 2D con GDevelop  

- **Flujo de trabajo recomendado**: Iniciar un *“Empty Game”* o usar una plantilla (p.ej. “Platformer” o “Top-down Shooter”) desde la pantalla de inicio. Preparar una carpeta para el proyecto. Importar recursos (sprites, audio). Organizar el proyecto por **escenas**: una escena por nivel o pantalla (menú, juego, fin). En cada escena, agregar objetos (Sprites, TileMap, textos, etc.) y definir sus comportamientos básicos (p.ej. *Platformer Character*, *TopDownMovement*, *Physics*, etc.) desde el panel de objetos. Luego, construir la lógica con **Hojas de eventos**: crear eventos condicionales (inicio de juego, controles del jugador, colisiones, puntaje, fin de juego, etc.) agrupándolos con comentarios o **sub-escenas** para mayor claridad. Probar frecuentemente con el botón de *Vista previa*. Al iterar, ajustar niveles de zoom, posición de cámara y optimizar (agrupando eventos, minimizando operaciones complejas). Finalmente, pulir UI (barras de vida, textos), integrar sonido, y exportar.  

```mermaid
graph LR
    A[Crea nuevo proyecto GDevelop] --> B[Importa o crea Assets (sprites, audio)]
    B --> C[Define escenas (niveles, menús)]
    C --> D[Agrega objetos: Sprites, TileMaps, textos]
    D --> E[Configura comportamientos (Platformer, TopDown, physics, etc.)]
    E --> F[Construye lógica con Eventos (controles, colisiones, puntaje)]
    F --> G[Prueba y depura en GDevelop (vista previa)]
    G --> H[Pulir: UI, efectos visuales/sonoros]
    H --> I[Exporta/juega en plataformas deseadas]
```  

- **Plantillas recomendadas**:  
  - *Platformer (juego de plataformas)* – plantilla básica con control de personaje saltando, útil para cualquier plataformaer 2D.  
  - *Top-down Shooter/RPG* – plantillas de juego de vista superior con movimiento direccional (ideal para juegos estilo Zelda o shooters).  
  - *Brick Breaker* o *Flappy Bird* – para entender colisiones sencillas y puntaje.  
  Estas plantillas (oficiales en la tienda) incluyen ya objetos y eventos preparados, acelerando el prototipo inicial.  

- **Assets esenciales**: Para un 2D básico, se recomiendan al menos:  
  - **Sprites del jugador y enemigos** (animaciones básicas: caminar, disparar). P.ej., gráficos pixel art de [Kenney](https://kenney.nl/assets) (gratuitos CC0) funcionan muy bien con GDevelop.  
  - **Tilesets para niveles** (ej. terreno, plataformas, paredes). El formato TileMap de GDevelop facilita cargar diseños de Tiled o usar imágenes tipo *sprite sheet*.  
  - **UI minimalista**: imágenes para vida/juego, texto (o usar fuentes incluidas) y botones. El Asset Store tiene packs de iconos y UI (p.ej. “Resource bars”, “Game over dialogs” en [Asset Store]).  
  - **Sonidos y música**: efectos de salto, explosiones, música de fondo. GDevelop incluye ejemplos libres; OpenGameArt o Freesound son buenas fuentes.  
  Importar estos assets a la carpeta del proyecto antes de referenciarlos en GDevelop.  

- **Buenas prácticas**:  
  - **Organización de eventos**: usar **Grupos de eventos** con nombre descriptivo, comentarios y eventos globales/externos para separar lógica por módulos. Ejemplo: separar “Movimiento jugador”, “IA enemigos”, “Gestión de puntaje”, “Menú principal”.  
  - **Variables limpias**: usar variables *de objeto* o *globales* con prefijos (e.g. objPlayer.x, Score) para claridad. Prestar atención a contexto (local vs global).  
  - **Depuración**: aprovechar el depurador de GDevelop para monitorear variables y eventos en ejecución. Insertar objetos *Text* con puntaje/vidas para visualizar valores.  
  - **Optimización**: no cargar escenas muy pesadas; dividir en múltiples. Usar capas para separar lógica/render. Eliminar eventos innecesarios y sprites ocultos.  
  - **Respaldo y control de versiones**: guardar el proyecto frecuentemente. Aunque GDevelop no integra Git, es buena idea mantener una copia de seguridad o usar Git externamente (archivo `.json` en carpeta del proyecto) para versiones.  
  - **Aprender con ejemplos**: examinar proyectos de ejemplo (del repositorio oficial) para ver cómo aplican patrones de eventos.  

Estas sugerencias, junto con los recursos listados arriba, permitirán a un principiante o usuario intermedio comenzar rápidamente con GDevelop, construyendo su primer juego 2D de forma organizada y apoyándose en la comunidad.  

**Fuentes:** Documentación y recursos oficiales de GDevelop (wiki, GitHub, blog), y sitios de terceros citados (curso CADIF1). Cada recurso citado proporciona detalles adicionales.