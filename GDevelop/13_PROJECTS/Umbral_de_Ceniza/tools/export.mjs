// Exports source/game.json with the official GDevelop exporter (libGD + GDJS 5.6.269).
//
//   node export.mjs web       -> builds/web              (HTML5, playable in a browser)
//   node export.mjs cordova   -> builds/android-cordova  (Cordova project for an Android APK/AAB)
//
// Any expression/code-generation error reported by the engine fails the export.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as gdtools from "gdcore-tools";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const GAME = path.join(ROOT, "source", "game.json");
const target = process.argv[2] || "web";
const out = path.join(ROOT, "builds", target === "cordova" ? "android-cordova" : "web");

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const before = gdtools.gd_internal_logs.length;
const project = await gdtools.loadProject(GAME);
gdtools.exportProject(project, out, target === "cordova" ? "cordova" : undefined);
project.delete();

const logs = gdtools.gd_internal_logs.slice(before).split("\n")
  .filter((l) => l.trim() && !l.includes("sharedPropertyDescriptors") && !l.startsWith("Copying all resources"));
// The official SpriteMultitouchJoystick extension yields exactly 2 'in: "" (number)' messages (same as the official example).
const known = logs.filter((l) => /error/i.test(l) && l.includes('in: "" (number)'));
const errors = logs.filter((l) => /error/i.test(l) && !l.includes('in: "" (number)'));
if (known.length > 2) errors.push(...known.slice(2));
logs.forEach((l) => console.log("[gd]", l));
if (target === "cordova") {
  // Lock landscape from the very first frame on Android (standard Cordova preference; GDevelop's own
  // screen-orientation plugin also locks it at runtime).
  const cfgPath = path.join(out, "config.xml");
  let cfg = fs.readFileSync(cfgPath, "utf8");
  if (!cfg.includes('name="Orientation"')) {
    cfg = cfg.replace("<preference name=\"Fullscreen\" value=\"true\" />",
      "<preference name=\"Fullscreen\" value=\"true\" />\n    <preference name=\"Orientation\" value=\"landscape\" />");
    fs.writeFileSync(cfgPath, cfg);
  }
}
const files = fs.readdirSync(out).length;
console.log(`[export] ${target} -> ${path.relative(ROOT, out)} (${files} entries)`);
if (errors.length) {
  console.error(`[export] ${errors.length} engine error(s) reported`);
  process.exit(1);
}
