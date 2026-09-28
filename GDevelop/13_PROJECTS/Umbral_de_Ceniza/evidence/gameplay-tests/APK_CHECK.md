# APK: comprobación de la capa web — 2026-09-28T23:43:31.024Z

APK: `builds/UmbralDeCeniza-1.0.0.apk` (4.3 MB) · origen https://appassets.androidplatform.net · Chromium headless 1200×540 (20:9)

**12/12 PASS**

- PASS arranca en la escena Titulo desde los archivos del APK
- PASS título de ventana
- PASS la música del título suena (audio HTML5 servido por rangos)
- PASS peticiones parciales Range respondidas con 206 (5)
- PASS evento 'pause' (app en segundo plano): la música se pausa
- PASS evento 'resume' (vuelve a la app): la música sigue
- PASS tocar Comenzar y elegir clase lleva al pueblo
- PASS la partida se guarda en el localStorage del origen de la app
- PASS Atrás (Esc) abre la pausa
- PASS Atrás (Esc) otra vez cierra la pausa
- PASS todos los archivos pedidos están en el APK (539 servidos, faltan: ninguno)
- INFO peticiones externas bloqueadas (el juego no necesita red): ninguna
- PASS sin errores de JavaScript ()

No cubre: el código Java en un dispositivo real (versión de WebView, modo inmersivo, foco de audio, tacto).
