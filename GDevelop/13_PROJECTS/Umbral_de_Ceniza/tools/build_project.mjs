// Builds source/game.json for "Umbral de Ceniza".
//
//   node build_project.mjs
//
// 1. Reads the art manifest (source/assets/manifest.json).
// 2. Assembles objects, scenes, external events, variables and resources.
// 3. Copies the official "SpriteMultitouchJoystick" extension from the official
//    example bundled with the kit (starting-platformer-pixel, MIT).
// 4. Expands and validates every action/condition against the engine metadata
//    (libGD 5.6.269 via gdcore-tools) — unknown types, wrong parameter counts,
//    unknown objects/behaviours/variables fail the build.
// 5. Loads the result with libGD and saves it back, so game.json is exactly what
//    the GDevelop editor itself would write.
//
// After the hand-off, game.json is the source of truth: open it in GDevelop.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Finalizer } from "./lib/finalize.mjs";
import { resetUuid } from "./lib/objects.mjs";
import { globalObjects, globalVariables } from "./scenes/common.mjs";
import { evJugador, evEntrada } from "./scenes/ev_jugador.mjs";
import { evCombate } from "./scenes/ev_combate.mjs";
import { evHud } from "./scenes/ev_hud.mjs";
import { evEnemigos } from "./scenes/ev_enemigos.mjs";
import { mazmorraScene, mazmorraObjects } from "./scenes/mazmorra.mjs";
import { puebloScene, puebloObjects } from "./scenes/pueblo.mjs";
import { tituloScene, tituloObjects, claseScene, claseObjects } from "./scenes/menus_iniciales.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SRC = path.join(ROOT, "source");
const KIT = path.resolve(ROOT, "..", "..");
const EXAMPLE = path.join(KIT, "04_OFFICIAL_REFERENCES/GDevelop-examples-pin/examples/starting-platformer-pixel/starting-platformer-pixel.json");
const GAME = path.join(SRC, "game.json");

const log = (...a) => console.log("[build]", ...a);

// ------------------------------------------------------------------ inputs
const manifest = JSON.parse(fs.readFileSync(path.join(SRC, "assets/manifest.json"), "utf8"));
const example = JSON.parse(fs.readFileSync(EXAMPLE, "utf8"));
const joystickExt = example.eventsFunctionsExtensions.find((e) => e.name === "SpriteMultitouchJoystick");
if (!joystickExt) throw new Error("SpriteMultitouchJoystick extension not found in the official example");

// ------------------------------------------------------------------ resources
function collectResources() {
  const images = new Set(["assets/sistema/caja.png"]);
  for (const s of Object.values(manifest.sprites)) for (const a of s.anims) a.frames.forEach((f) => images.add(f));
  Object.values(manifest.images).forEach((f) => images.add(f));
  const res = [...images].sort().map((file) => ({ file, kind: "image", metadata: "", name: file, smoothed: false, userAdded: false }));
  const audioDir = path.join(SRC, "assets/audio");
  for (const f of fs.readdirSync(audioDir).filter((x) => x.endsWith(".wav")).sort()) {
    const music = f.startsWith("musica_");
    const file = `assets/audio/${f}`;
    res.push({ file, kind: "audio", metadata: "", name: file, preloadAsMusic: music, preloadAsSound: !music, preloadInCache: false, userAdded: false });
  }
  for (const f of ["fonts/PixelifySans-SemiBold.ttf", "fonts/Jersey10-Regular.ttf"]) {
    res.push({ file: f, kind: "font", metadata: "", name: f, userAdded: false });
  }
  for (const r of res) if (!fs.existsSync(path.join(SRC, r.file))) throw new Error(`missing resource file ${r.file}`);
  return res;
}

// ------------------------------------------------------------------ helpers
const CAPABILITY_SHARED = [
  { name: "Animation", type: "AnimatableCapability::AnimatableBehavior" },
  { name: "Effect", type: "EffectCapability::EffectBehavior" },
  { name: "Flippable", type: "FlippableCapability::FlippableBehavior" },
  { name: "Opacity", type: "OpacityCapability::OpacityBehavior" },
  { name: "Resizable", type: "ResizableCapability::ResizableBehavior" },
  { name: "Scale", type: "ScalableCapability::ScalableBehavior" },
  { name: "Text", type: "TextContainerCapability::TextContainerBehavior" },
];

function sharedData(objects) {
  const map = new Map(CAPABILITY_SHARED.map((b) => [b.name, b]));
  for (const o of objects) for (const b of o.behaviors || []) map.set(b.name, { name: b.name, type: b.type });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const GLOBAL_FOLDERS = {
  Jugador: ["Jugador", "GolpeJugador", "ProyectilJugador", "Efecto", "TextoDano"],
  Enemigos: ["Enemigo", "GolpeEnemigo", "ProyectilEnemigo", "PintorBarras"],
  Botin: ["Moneda", "OrbeVida", "Botin"],
  Nivel: ["Suelo", "Relleno", "Plataforma", "Muro", "Puerta", "Portal"],
  HUD: ["MarcoHUD", "BarraVida", "BarraMana", "BarraExp", "Retrato", "TextoNivel", "TextoVida", "TextoOro", "IconoMoneda",
    "TextoAviso", "TextoPociones", "MascaraCD", "TextoCD"],
  "Controles táctiles": ["Joystick", "BotonAtaque", "BotonHab1", "BotonHab2", "BotonHab3", "BotonSalto", "BotonPocion", "BotonAccion", "BotonPausa"],
  Menus: ["Panel", "BotonMenu", "TextoBoton", "TextoTitulo", "TextoMenu", "BotonCerrar", "Flecha"],
};

function folderStructure(objects, folders = null) {
  const names = objects.map((o) => o.name);
  if (!folders) return { folderName: "__ROOT", children: names.map((n) => ({ objectName: n })) };
  const used = new Set();
  const children = Object.entries(folders).map(([folderName, list]) => ({
    folderName, children: list.filter((n) => names.includes(n)).map((n) => (used.add(n), { objectName: n })),
  }));
  names.filter((n) => !used.has(n)).forEach((n) => children.push({ objectName: n }));
  return { folderName: "__ROOT", children };
}

function layoutJson(scene, objects, allObjectsForShared) {
  const [r, v, b] = scene.background;
  return {
    b, disableInputWhenNotFocused: true, mangledName: scene.name, name: scene.name, r, standardSortMethod: true,
    stopSoundsOnStartup: true, title: "Umbral de Ceniza", v, // window/tab title while the scene runs
    uiSettings: { grid: false, gridType: "rectangular", gridWidth: 32, gridHeight: 32, gridDepth: 32, gridOffsetX: 0, gridOffsetY: 0,
      gridOffsetZ: 0, gridColor: 10401023, gridAlpha: 0.8, snap: false, zoomFactor: 0.5, windowMask: false, selectedLayer: "",
      gameEditorMode: "instances-editor" },
    objectsGroups: [], variables: scene.variables, instances: scene.instances, objects,
    objectsFolderStructure: folderStructure(objects), events: scene.events, layers: scene.layers,
    behaviorsSharedData: sharedData(allObjectsForShared),
  };
}

function varNames(vars) { return new Set(vars.map((v) => v.name)); }

function objectInfo(o) {
  return { type: o.type, behaviors: new Map((o.behaviors || []).map((b) => [b.name, b.type])), variables: varNames(o.variables || []) };
}

let RESOURCE_NAMES = new Set();
function context(name, objects, sceneVars, globalVars) {
  return {
    name,
    resources: RESOURCE_NAMES,
    objects: new Map(objects.map((o) => [o.name, objectInfo(o)])),
    groups: new Map(),
    vars: new Set([...varNames(sceneVars), ...varNames(globalVars)]),
  };
}

// ------------------------------------------------------------------ assemble
async function main() {
  resetUuid();
  const resources = collectResources();
  RESOURCE_NAMES = new Set(resources.map((r) => r.name));
  const gObjects = globalObjects(manifest);
  const gVars = globalVariables();

  const scenes = [
    { def: tituloScene(), objects: tituloObjects(manifest) },
    { def: claseScene(), objects: claseObjects(manifest) },
    { def: puebloScene(), objects: puebloObjects(manifest) },
    { def: mazmorraScene(), objects: mazmorraObjects(manifest) },
  ];
  const external = [
    { name: "EV_Entrada", associatedLayout: "Mazmorra", events: evEntrada(), usedBy: ["Pueblo", "Mazmorra"] },
    { name: "EV_Jugador", associatedLayout: "Mazmorra", events: evJugador(), usedBy: ["Pueblo", "Mazmorra"] },
    { name: "EV_Combate", associatedLayout: "Mazmorra", events: evCombate(), usedBy: ["Pueblo", "Mazmorra"] },
    { name: "EV_HUD", associatedLayout: "Mazmorra", events: evHud(), usedBy: ["Pueblo", "Mazmorra"] },
    { name: "EV_Enemigos", associatedLayout: "Mazmorra", events: evEnemigos(), usedBy: ["Mazmorra"] },
  ];

  const project = {
    firstLayout: "Titulo",
    gdVersion: { build: 269, major: 5, minor: 6, revision: 0 },
    properties: {
      adaptGameResolutionAtRuntime: true, antialiasingMode: "none", antialisingEnabledOnMobile: false, folderProject: false,
      orientation: "landscape", packageName: "com.umbraldeceniza.juego", pixelsRounding: true, projectUuid: "6a1c5e0e-4d2b-4c55-9d8e-2f5b7c1a9e31",
      scaleMode: "nearest", sizeOnStartupMode: "adaptWidth", templateSlug: "", version: "1.0.0", name: "Umbral de Ceniza",
      description: "RPG de acción pixel-art 2D para móvil: elige clase, limpia mazmorras sala por sala, consigue botín por rareza y derrota al Caballero de Ceniza.",
      author: "", windowWidth: 1280, windowHeight: 720, latestCompilationDirectory: "", maxFPS: 60, minFPS: 20, verticalSync: false,
      platformSpecificAssets: {
        "android-icon-144": "assets/icono/icono_144.png", "android-icon-192": "assets/icono/icono_192.png",
        "android-icon-36": "assets/icono/icono_36.png", "android-icon-48": "assets/icono/icono_48.png",
        "android-icon-72": "assets/icono/icono_72.png", "android-icon-96": "assets/icono/icono_96.png",
        "android-windowSplashScreenAnimatedIcon": "assets/icono/icono_192.png", "desktop-icon-512": "assets/icono/icono_512.png",
      },
      loadingScreen: { backgroundColor: 460554, backgroundFadeInDuration: 0.2, backgroundImageResourceName: "", gdevelopLogoStyle: "light",
        logoAndProgressFadeInDuration: 0.2, logoAndProgressLogoFadeInDelay: 0, minDuration: 1.5, progressBarColor: 16750122,
        progressBarHeight: 16, progressBarMaxWidth: 240, progressBarMinWidth: 40, progressBarWidthPercent: 30, showGDevelopSplash: true,
        showProgressBar: true },
      watermark: { placement: "bottom", showWatermark: true },
      authorIds: [], authorUsernames: [], categories: ["action", "rpg"], playableDevices: ["mobile", "keyboard"], extensionProperties: [],
      platforms: [{ name: "GDevelop JS platform" }], currentPlatform: "GDevelop JS platform",
    },
    resources: { resources },
    objects: gObjects,
    objectsFolderStructure: folderStructure(gObjects, GLOBAL_FOLDERS),
    objectsGroups: [],
    variables: gVars,
    layouts: scenes.map(({ def, objects }) => layoutJson(def, objects, [...gObjects, ...objects])),
    externalEvents: external.map((e) => ({ associatedLayout: e.associatedLayout, lastChangeTimeStamp: 0, name: e.name, events: e.events })),
    eventsFunctionsExtensions: [joystickExt],
    externalLayouts: [],
  };

  // --- load engine + extension metadata (skeleton with no events)
  const gdtools = await import("gdcore-tools");
  const { gd, loadProject, saveProject } = gdtools;
  const skeleton = structuredClone(project);
  skeleton.layouts.forEach((l) => { l.events = []; });
  skeleton.externalEvents.forEach((e) => { e.events = []; });
  const skelPath = path.join(SRC, ".build_skeleton.json");
  fs.writeFileSync(skelPath, JSON.stringify(skeleton));
  const skelProject = await loadProject(skelPath);
  skelProject.delete();
  fs.rmSync(skelPath);

  // --- finalize + validate
  const fin = new Finalizer(gd);
  const ctxOf = {};
  for (const { def, objects } of scenes) ctxOf[def.name] = context(def.name, [...gObjects, ...objects], def.variables, gVars);
  project.layouts.forEach((l) => fin.events(l.events, ctxOf[l.name]));
  for (const e of external) {
    const [first, ...others] = e.usedBy;
    for (const other of others) fin.events(structuredClone(e.events), { ...ctxOf[other], name: `${e.name}@${other}` });
    fin.events(project.externalEvents.find((x) => x.name === e.name).events, { ...ctxOf[first], name: `${e.name}@${first}` });
  }
  if (fin.errors.length) {
    console.error(`[build] ${fin.errors.length} validation error(s):`);
    [...new Set(fin.errors)].slice(0, 80).forEach((m) => console.error("  - " + m));
    process.exit(1);
  }
  log(`validated ${fin.stats.instructions} instructions in ${fin.stats.events} events`);

  // --- write, reload with libGD, save normalized
  fs.writeFileSync(GAME, JSON.stringify(project, null, 2));
  const loaded = await loadProject(GAME);
  log(`libGD loaded "${loaded.getName()}": ${loaded.getLayoutsCount()} scenes, ${loaded.getExternalEventsCount()} external events, ` +
    `${loaded.getObjects().getObjectsCount()} global objects, ${loaded.getResourcesManager().getAllResourceNames().size()} resources`);
  await saveProject(loaded, GAME);
  loaded.delete();
  const size = fs.statSync(GAME).size;
  log(`saved normalized ${path.relative(ROOT, GAME)} (${(size / 1024).toFixed(0)} KB)`);

  // --- expression check: generate the game code with the official exporter and read the engine diagnostics
  const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), "umbral-check-"));
  const before = gdtools.gd_internal_logs.length;
  const again = await loadProject(GAME);
  gdtools.exportProject(again, tmpOut);
  again.delete();
  fs.rmSync(tmpOut, { recursive: true, force: true });
  const errs = gdtools.gd_internal_logs.slice(before).split("\n").filter((l) => /Error/.test(l));
  // The official SpriteMultitouchJoystick extension itself yields exactly these 2 (same with the official example).
  const known = errs.filter((l) => l.includes('in: "" (number)'));
  const real = errs.filter((l) => !l.includes('in: "" (number)'));
  if (real.length || known.length > 2) {
    console.error(`[build] ${real.length + Math.max(0, known.length - 2)} expression error(s) reported by the engine:`);
    real.slice(0, 40).forEach((l) => console.error("  - " + l.slice(0, 300)));
    process.exit(1);
  }
  log(`engine code generation OK (${known.length} known warnings from the official joystick extension)`);
}

// ------------------------------------------------------------------ ASSET_MANIFEST.json (kit asset contract)
const ROLES = [
  [/^Jugador$/, "character.player"], [/^HeroePreview$/, "ui.class-preview"], [/^Enemigo$/, "character.enemy"], [/^NPC$/, "character.npc"],
  [/^Proyectil/, "projectile"], [/^Efecto$/, "fx"], [/^(Moneda|OrbeVida|Botin)$/, "pickup"],
  [/^(Puerta|Portal|Antorcha|Estandarte|Calaveras|Velas|Barril|Caja|Farol|Forja|Puesto|Pozo|Letrero|Arbol)$/, "environment.prop"],
  [/^FondoTitulo$/, "ui.background"], [/./, "ui"],
];
const ORIGINAL = "Original del proyecto, generado por código (sin assets de terceros).";
function writeAssetManifest() {
  const assets = [];
  for (const [obj, s] of Object.entries(manifest.sprites)) {
    const role = ROLES.find(([re]) => re.test(obj))[1];
    for (const a of s.anims) {
      assets.push({
        asset_id: `${obj}.${a.name}`, role, object: obj, animation: a.name, files: a.frames, type: "png", size_px: { width: a.size[0], height: a.size[1] },
        alpha: true, pivot: { x: a.origin[0], y: a.origin[1] }, collision: a.mask || "bounding-box", frames: a.frames.length,
        frame_time_s: a.dt, loop: a.loop, directions: role.startsWith("character") ? "derecha (FlipX para la izquierda)" : "única",
        pixel_scale: manifest.scale, variant: "", license: ORIGINAL, origin: "source/make_art.py",
      });
    }
  }
  for (const [id, file] of Object.entries(manifest.images)) {
    assets.push({ asset_id: `imagen.${id}`, role: id.startsWith("icono") ? "app.icon" : (/fondo|cielo|casas|suelo|relleno|plataforma|muro/.test(id) ? "environment.tile" : "ui"),
      files: [file], type: "png", alpha: true, pixel_scale: manifest.scale, license: ORIGINAL, origin: "source/make_art.py" });
  }
  for (const f of fs.readdirSync(path.join(SRC, "assets/audio")).filter((x) => x.endsWith(".wav")).sort()) {
    assets.push({ asset_id: `audio.${f.replace(".wav", "")}`, role: f.startsWith("musica_") ? "music" : "sfx", files: [`assets/audio/${f}`],
      type: "wav PCM 16-bit mono 22050 Hz", license: ORIGINAL, origin: "source/make_audio.py" });
  }
  assets.push({ asset_id: "fuente.PixelifySans", role: "font.ui", files: ["fonts/PixelifySans-SemiBold.ttf"], type: "ttf",
    license: "SIL Open Font License 1.1 (fonts/OFL-PixelifySans.txt)", origin: "Pixelify Sans (Google Fonts) vía npm @expo-google-fonts/pixelify-sans 0.4.2" });
  assets.push({ asset_id: "fuente.Jersey10", role: "font.title", files: ["fonts/Jersey10-Regular.ttf"], type: "ttf",
    license: "SIL Open Font License 1.1 (fonts/OFL-Jersey10.txt)", origin: "Jersey 10 (Google Fonts) vía npm @expo-google-fonts/jersey-10 0.4.1" });
  fs.writeFileSync(path.join(ROOT, "ASSET_MANIFEST.json"), JSON.stringify({ version: 2, pixel_scale: manifest.scale,
    note: "Generado por tools/build_project.mjs a partir de source/assets/manifest.json. Rutas relativas a source/.", assets }, null, 1));
  log(`ASSET_MANIFEST.json: ${assets.length} assets`);
}

main().then(writeAssetManifest).catch((e) => { console.error(e); process.exit(1); });
