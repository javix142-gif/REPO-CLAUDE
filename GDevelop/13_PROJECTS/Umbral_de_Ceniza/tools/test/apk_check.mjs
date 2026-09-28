// Checks the web layer of the Android APK built by tools/build_apk.mjs, in Chromium: extracts assets/www from the
// APK and runs it the way MainActivity serves it (https://appassets.androidplatform.net/, Range -> 206, other
// hosts blocked). It also replays what the Android side sends to the page: "deviceready" after loading,
// "pause"/"resume" when the app goes to the background and back, and Esc for the Back button.
// What it cannot cover: the Java code itself on a device (WebView version, immersive mode, audio focus, touch).
//
//   node test/apk_check.mjs [path/to.apk]   -> evidence/gameplay-tests/APK_CHECK.md + screenshot 25_apk_20x9.png
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { launchAsApk } from "./harness.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const version = JSON.parse(fs.readFileSync(path.join(ROOT, "source", "game.json"), "utf8")).properties.version;
const apk = path.resolve(process.argv[2] || path.join(ROOT, "builds", `UmbralDeCeniza-${version}.apk`));
const unpacked = path.join(ROOT, "builds", "android-apk", "check");
fs.rmSync(unpacked, { recursive: true, force: true });
execFileSync("unzip", ["-q", apk, "assets/www/*", "-d", unpacked]);
const www = path.join(unpacked, "assets", "www");

const results = [];
const check = (ok, what) => { results.push(`${ok ? "PASS" : "FAIL"} ${what}`); console.log(`  ${ok ? "PASS" : "FAIL"} ${what}`); };
const music = (g) => g.eval((G) => { const m = G.getSoundManager().getMusicOnChannel(0); return m ? m.playing() : null; });

// A 20:9 phone in landscape (e.g. 2400x1080 at 2x -> 1200x540 CSS px).
const g = await launchAsApk(www, { width: 1200, height: 540 });
try {
  await g.waitScene("Titulo", 60000);
  check(true, "arranca en la escena Titulo desde los archivos del APK");
  check((await g.page.title()) === "Umbral de Ceniza", "título de ventana");
  await g.page.evaluate(() => document.dispatchEvent(new Event("deviceready"))); // what MainActivity does on page load
  await g.wait(1500);
  check((await music(g)) === true, "la música del título suena (audio HTML5 servido por rangos)");
  check(g.net.ranges > 0, `peticiones parciales Range respondidas con 206 (${g.net.ranges})`);
  await g.page.evaluate(() => { document.dispatchEvent(new Event("pause")); window.dispatchEvent(new Event("pause")); });
  await g.wait(300);
  check((await music(g)) === false, "evento 'pause' (app en segundo plano): la música se pausa");
  await g.page.evaluate(() => { document.dispatchEvent(new Event("resume")); window.dispatchEvent(new Event("resume")); });
  await g.wait(500);
  check((await music(g)) === true, "evento 'resume' (vuelve a la app): la música sigue");

  await g.clickObject("BotonMenu", 0);
  await g.waitScene("SeleccionClase");
  await g.clickObject("BotonMenu", 1);
  await g.waitScene("Pueblo");
  check((await g.v("Save.Clase", true)) === "Maga", "tocar Comenzar y elegir clase lleva al pueblo");
  const saved = await g.page.evaluate(() => localStorage.getItem("GDJS_UmbralSave"));
  check(!!saved && saved.includes("Maga"), "la partida se guarda en el localStorage del origen de la app");
  await g.wait(800);
  await g.tap("Escape"); // Back button
  await g.wait(400);
  check((await g.v("Menu")) === "pausa", "Atrás (Esc) abre la pausa");
  await g.shot(path.join(ROOT, "evidence", "screenshots", "25_apk_20x9.png"));
  await g.tap("Escape");
  await g.wait(400);
  check((await g.v("Menu")) === "", "Atrás (Esc) otra vez cierra la pausa");

  check(g.net.missing.length === 0, `todos los archivos pedidos están en el APK (${g.net.served} servidos, faltan: ${g.net.missing.join(", ") || "ninguno"})`);
  const external = [...new Set(g.net.blocked)];
  results.push(`INFO peticiones externas bloqueadas (el juego no necesita red): ${external.join(", ") || "ninguna"}`);
  const errors = g.errors.filter((e) => !e.includes("403"));
  check(errors.length === 0, `sin errores de JavaScript (${errors.join(" | ")})`);
} catch (e) {
  check(false, `ERROR: ${e.message.split("\n")[0]}`);
} finally {
  await g.close();
}

const pass = results.filter((r) => r.startsWith("PASS")).length;
const fail = results.filter((r) => r.startsWith("FAIL")).length;
const md = [`# APK: comprobación de la capa web — ${new Date().toISOString()}`, "",
  `APK: \`${path.relative(ROOT, apk)}\` (${(fs.statSync(apk).size / 1e6).toFixed(1)} MB) · origen https://appassets.androidplatform.net · Chromium headless 1200×540 (20:9)`, "",
  `**${pass}/${pass + fail} PASS**`, "", ...results.map((r) => `- ${r}`), "",
  "No cubre: el código Java en un dispositivo real (versión de WebView, modo inmersivo, foco de audio, tacto).", ""];
fs.writeFileSync(path.join(ROOT, "evidence", "gameplay-tests", "APK_CHECK.md"), md.join("\n"));
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
