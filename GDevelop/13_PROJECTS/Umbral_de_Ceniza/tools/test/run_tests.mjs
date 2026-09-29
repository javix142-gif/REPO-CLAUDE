// Gameplay tests for the exported HTML5 build (builds/web), run in headless Chromium.
//
//   node test/run_tests.mjs [filter]
//
// Every assertion reads the real runtime state of the GDevelop game (scene, variables,
// instances); screenshots are saved to evidence/screenshots and a report to
// evidence/gameplay-tests. Keyboard, mouse and multitouch (CDP) input are simulated.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "./harness.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const BUILD = path.join(ROOT, "builds", "web");
const SHOTS = path.join(ROOT, "evidence", "screenshots");
const REPORTS = path.join(ROOT, "evidence", "gameplay-tests");
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(REPORTS, { recursive: true });

const results = [];
const filter = process.argv[2] || "";

class AssertionError extends Error {}
function check(cond, msg, log) {
  log.push(`${cond ? "PASS" : "FAIL"} ${msg}`);
  if (process.env.VERBOSE) console.log(`   ${cond ? "PASS" : "FAIL"} ${msg}`);
  if (!cond) throw new AssertionError(msg);
}

async function test(name, fn, opts = {}) {
  if (filter && !name.includes(filter)) return;
  if (!filter && !process.env.BALANCE && name.startsWith("balance")) return; // slow: `node test/run_tests.mjs balance`, or BALANCE=1 for everything
  const log = [];
  const t0 = Date.now();
  let g;
  let status = "PASS";
  let error = null;
  try {
    g = await launch(BUILD, opts);
    await fn(g, log);
    const errs = g.errors.filter((e) => !e.includes("ERR_TUNNEL") && !e.includes("net::"));
    check(errs.length === 0, `no JavaScript errors in the page (${errs.slice(0, 3).join(" | ")})`, log);
  } catch (e) {
    status = "FAIL";
    error = String(e && e.stack || e).split("\n").slice(0, 3).join(" ");
    if (g) await g.shot(path.join(SHOTS, `FAIL_${name.replace(/\W+/g, "_")}.png`)).catch(() => {});
  } finally {
    if (g) await g.close().catch(() => {});
  }
  const r = { name, status, seconds: Math.round((Date.now() - t0) / 1000), log, error };
  results.push(r);
  console.log(`\n[${status}] ${name} (${r.seconds}s)`);
  log.forEach((l) => console.log("   " + l));
  if (error) console.log("   ERROR " + error);
}

// ------------------------------------------------------------------ helpers
const shot = (g, file) => g.shot(path.join(SHOTS, file));

async function clickMenuSlot(g, slot) {
  const idx = await g.eval((G, S, s) => S.getObjects("BotonMenu").findIndex((o) => !o.isHidden() && o.getVariables().get("Slot").getAsNumber() === s), slot);
  if (idx < 0) throw new Error(`no visible menu button with slot ${slot}`);
  await g.clickObject("BotonMenu", idx);
}

async function newGame(g, cls, shotName = "", prologueShot = "") {
  await g.wait(2500);
  await g.setV("Save.Clase", "", true);
  if ((await g.scene()) !== "Titulo") throw new Error("not on title");
  // "Nueva partida" is slot 2 when a save exists, slot 1 otherwise
  const hay = await g.v("Juego.HayPartida", true);
  await clickMenuSlot(g, hay ? 2 : 1);
  await g.waitScene("SeleccionClase");
  if (shotName) { await g.wait(800); await shot(g, shotName); }
  const idx = ["Guerrero", "Maga", "Arquera"].indexOf(cls);
  await g.clickObject("BotonMenu", idx);
  await g.waitScene("Pueblo");
  // a new game opens the story prologue: read it (screenshot) and continue
  await waitFor(g, () => window.__game.getSceneStack().getCurrentScene().getVariables().get("Menu").getAsString() === "prologo", 3000);
  if ((await g.v("Menu")) === "prologo") {
    if (prologueShot) { await g.wait(400); await shot(g, prologueShot); }
    await clickMenuSlot(g, 1);
    await g.wait(300);
  }
}

/**
 * Goes through the town portal. modo: "campana" (slot 1: always the frontier stage), "mazmorra" (slot 2: the selected stage)
 * or "arena" (slot 3). By default the mode is picked so that `etapa` is the stage played. The story page of the stage is
 * skipped (Save.IntroVista) unless `intro` is true.
 */
async function enterDungeon(g, etapa = 1, { modo = null, intro = false } = {}) {
  const max = Math.max(etapa, await g.v("Save.EtapaMax", true));
  await g.setV("Save.EtapaSel", etapa, true);
  await g.setV("Save.EtapaMax", max, true);
  if (!intro) await g.setV("Save.IntroVista", 12, true);
  if (!modo) modo = etapa === max ? "campana" : "mazmorra";
  await g.setPos("Jugador", 3440);
  await g.wait(500);
  await g.tap("e");
  await g.wait(500);
  await clickMenuSlot(g, { campana: 1, mazmorra: 2, arena: 3 }[modo]);
  await g.waitScene("Mazmorra");
  await g.wait(800);
}

const player = (g) => g.objects("Jugador").then((a) => a[0]);

async function state(g) {
  return g.eval((G, S) => {
    const J = S.getObjects("Jugador")[0];
    const jv = (n) => J.getVariables().get(n);
    const sv = (n) => (S.getVariables().has(n) ? S.getVariables().get(n) : null);
    const en = S.getObjects("Enemigo").map((e) => {
      const v = (n) => e.getVariables().get(n);
      return { x: e.getX(), y: e.getY(), t: v("Tipo").getAsString(), est: v("Estado").getAsString(), hp: v("HP").getAsNumber() };
    }).filter((e) => e.est !== "muerto" && e.t !== "Maniqui");
    const portal = S.getObjects("Portal")[0];
    return {
      scene: S.getName(), px: J.getX(), py: J.getY(), hp: jv("HP").getAsNumber(), mp: jv("MP").getAsNumber(), dir: jv("Dir").getAsNumber(),
      est: jv("Estado").getAsString(), cd: [jv("Cd1").getAsNumber(), jv("Cd2").getAsNumber(), jv("Cd3").getAsNumber()], en,
      sala: sv("Sala") ? sv("Sala").getAsNumber() : null, salaEst: sv("SalaEstado") ? sv("SalaEstado").getAsString() : null,
      menu: sv("Menu").getAsString(), jefeMuerto: sv("JefeMuerto") ? sv("JefeMuerto").getAsNumber() : 0,
      vidaMax: G.getVariables().get("Stat").getChild("VidaMax").getAsNumber(),
      pociones: G.getVariables().get("Save").getChild("Pociones").getAsNumber(),
      nivel: G.getVariables().get("Save").getChild("Nivel").getAsNumber(),
      costos: [1, 2, 3].map((i) => G.getVariables().get("Stat").getChild("Costo" + i).getAsNumber()),
      portal: portal ? { x: portal.getX(), vis: !portal.isHidden() } : null,
    };
  });
}

/** Simple bot: walks right, fights the nearest reachable enemy, uses skills and potions. */
async function playDungeon(g, cls, log, { timeoutS = 420, onRoom = null } = {}) {
  const range = { Guerrero: 85, Maga: 360, Arquera: 400 }[cls];
  let held = null;
  const hold = async (k) => {
    if (held === k) return;
    if (held) await g.page.keyboard.up(held);
    held = k;
    if (k) await g.page.keyboard.down(k);
  };
  let attacking = false;
  const attack = async (on) => {
    if (on === attacking) return;
    attacking = on;
    if (on) await g.page.keyboard.down("j"); else await g.page.keyboard.up("j");
  };
  const t0 = Date.now();
  let lastSala = -1;
  let lastSkill = 0;
  while ((Date.now() - t0) / 1000 < timeoutS) {
    const s = await state(g);
    if (s.sala !== lastSala) { lastSala = s.sala; log.push(`INFO t=${Math.round((Date.now() - t0) / 1000)}s sala ${s.sala + 1} (nivel ${s.nivel})`); if (onRoom) await onRoom(s); }
    if (s.menu !== "") { await hold(null); await attack(false); return s; }
    if (s.est === "muerto") { await hold(null); await attack(false); await g.wait(2500); return state(g); }
    if (s.hp < s.vidaMax * 0.4 && s.pociones > 0) await g.tap("h");
    const reach = cls === "Guerrero" ? 170 : 300;
    const targets = s.en.filter((e) => Math.abs(e.y - s.py) < reach && e.est !== "aparecer");
    if (targets.length) {
      targets.sort((a, b) => Math.abs(a.x - s.px) - Math.abs(b.x - s.px));
      const t = targets[0];
      const dx = t.x - s.px;
      const want = dx > 0 ? "ArrowRight" : "ArrowLeft";
      if (Math.abs(dx) > range) {
        await hold(want);
        await attack(cls !== "Guerrero" && Math.sign(dx) === s.dir && Math.abs(dx) < range * 1.6);
      } else if (cls !== "Guerrero" && Math.abs(dx) < 140) {
        await hold(dx > 0 ? "ArrowLeft" : "ArrowRight"); // ranged classes keep some distance
        await attack(false);
      } else {
        await hold(null);
        if (Math.sign(dx) !== s.dir && s.est === "libre") { await g.page.keyboard.down(want); await g.wait(45); await g.page.keyboard.up(want); }
        await attack(true);
        const now = Date.now();
        if (now - lastSkill > 900) {
          const near = targets.filter((e) => Math.abs(e.x - s.px) < 220).length;
          const keys = ["k", "l", "i"];
          for (let i = 0; i < 3; i++) {
            if (s.cd[i] > 0 || s.mp < s.costos[i]) continue;
            const useful = (cls === "Guerrero" && ((i === 0 && near >= 1) || (i === 2 && s.hp < s.vidaMax * 0.7)))
              || (cls === "Maga" && ((i === 0 && near >= 1) || i === 1 || (i === 2 && s.hp < s.vidaMax * 0.7)))
              || (cls === "Arquera" && (i === 0 || i === 1 || (i === 2 && Math.abs(dx) < 90)));
            if (useful) { await attack(false); await g.tap(keys[i]); lastSkill = now; break; }
          }
        }
      }
    } else if (s.en.length && s.salaEst === "combate") {
      await hold(null); await attack(true); // wait for flying enemies to swoop
    } else if (s.jefeMuerto === 2 && s.portal && s.portal.vis) {
      await attack(false);
      await hold(s.portal.x > s.px ? "ArrowRight" : "ArrowLeft");
    } else {
      await attack(false);
      await hold("ArrowRight");
    }
    await g.wait(70);
  }
  await hold(null); await attack(false);
  throw new Error(`dungeon not finished after ${timeoutS}s`);
}

// ------------------------------------------------------------------ tests
await test("01 flujo título → clase → pueblo → tiendas → portal", async (g, log) => {
  await g.wait(2500);
  check((await g.scene()) === "Titulo", "arranca en la escena Titulo", log);
  await shot(g, "01_titulo.png");
  await newGame(g, "Guerrero", "02_seleccion_clase.png", "02b_prologo.png");
  check((await g.v("Save.Clase", true)) === "Guerrero", "la clase elegida se guarda en Save.Clase", log);
  await g.wait(600);
  const p = await player(g);
  const vmax = await g.v("Stat.VidaMax", true);
  check(p.vars.HP === vmax && vmax === 160, `vida inicial completa (${p.vars.HP}/${vmax})`, log);
  check(p.anim === "Guerrero_Idle", `animación de reposo por clase (${p.anim})`, log);
  await shot(g, "03_pueblo.png");
  // move with keyboard
  await g.hold("ArrowRight", 500);
  const p2 = await player(g);
  check(p2.x > p.x + 40 && p2.anim.startsWith("Guerrero_"), `el jugador se desplaza a la derecha (${Math.round(p.x)} → ${Math.round(p2.x)})`, log);
  // training dummy
  await g.setPos("Jugador", 540); await g.wait(200);
  await g.hold("j", 1300);
  const golpes = await g.v("Stats.Golpes");
  check(golpes >= 2 && golpes <= 5, `el maniquí recibe un golpe por tajo (${golpes} golpes en 1,3 s)`, log);
  check((await g.objects("TextoDano")).length > 0, "aparecen números de daño", log);
  await shot(g, "04_maniqui_combate.png");
  // alchemist: buy a potion
  const oro0 = await g.v("Save.Oro", true); const poc0 = await g.v("Save.Pociones", true);
  await g.setPos("Jugador", 2120); await g.wait(500);
  check((await g.v("Cerca")) === "alquimista", "cerca del alquimista aparece la interacción", log);
  check((await g.objects("BotonAccion"))[0].visible, "el botón táctil de acción se muestra", log);
  await g.clickObject("BotonAccion"); await g.wait(500);
  check((await g.v("Menu")) === "alquimista", "tocar el botón de acción abre la tienda", log);
  await shot(g, "05_alquimista.png");
  await clickMenuSlot(g, 1); await g.wait(300);
  check((await g.v("Save.Oro", true)) === oro0 - 30 && (await g.v("Save.Pociones", true)) === poc0 + 1, "comprar poción descuenta 30 de oro y suma 1 poción", log);
  await g.clickObject("BotonCerrar"); await g.wait(300);
  check((await g.v("Menu")) === "", "el botón X cierra el menú", log);
  // blacksmith without enough gold
  await g.setPos("Jugador", 1040); await g.wait(500);
  await g.tap("e"); await g.wait(400);
  check((await g.v("Menu")) === "herrera", "la herrería se abre con la tecla E", log);
  await clickMenuSlot(g, 1); await g.wait(300);
  const aviso = (await g.objects("TextoAviso"))[0].text;
  check(/suficiente oro/.test(aviso) && (await g.v("Save.Forja", true)) === 0, `sin oro no se puede forjar ("${aviso}")`, log);
  await g.setV("Save.Oro", 500, true);
  await clickMenuSlot(g, 1); await g.wait(400);
  check((await g.v("Save.Forja", true)) === 1 && (await g.v("Stat.Atq", true)) === 15, "forjar sube Forja a 1 y ATQ de 12 a 15", log);
  await shot(g, "06_herreria.png");
  await g.tap("Escape"); await g.wait(300);
  // character sheet (tap the portrait / key C)
  await g.tap("c"); await g.wait(400);
  check((await g.v("Menu")) === "personaje", "la ficha del personaje se abre (retrato / tecla C)", log);
  await shot(g, "06b_ficha_personaje.png");
  await g.tap("Escape"); await g.wait(300);
  // portal
  await g.setPos("Jugador", 3440); await g.wait(500);
  await g.tap("e"); await g.wait(500);
  check((await g.v("Menu")) === "portal", "el portal abre el selector de etapa", log);
  await shot(g, "07_portal.png");
  const botones = (await g.objects("TextoBoton")).filter((t) => t.visible).map((t) => t.text);
  check(botones.length === 3 && /Campaña/.test(botones[0]) && /Mazmorra/.test(botones[1]) && /Coliseo/.test(botones[2]), `el portal ofrece campaña, mazmorra y coliseo (${botones.join(" | ")})`, log);
  await clickMenuSlot(g, 1);
  await g.waitScene("Mazmorra");
  check((await g.v("Etapa")) === 1 && (await g.v("Juego.Modo", true)) === "campana", "la campaña entra a la etapa 1", log);
  await g.wait(600);
  check((await g.v("Menu")) === "intro", "la primera vez en cada etapa se lee la página de la historia", log);
  await shot(g, "41_relato_etapa1.png");
  await clickMenuSlot(g, 1); await g.wait(400);
  check((await g.v("Menu")) === "" && (await g.v("Save.IntroVista", true)) === 1, "Continuar cierra la página y la etapa no vuelve a mostrarla", log);
});

await test("02 Guerrero completa la etapa 1 (bot): salas, puertas, jefe, botín, victoria, guardado", async (g, log) => {
  await newGame(g, "Guerrero");
  await enterDungeon(g, 1);
  await shot(g, "08_mazmorra_inicio.png");
  const shotsTaken = new Set();
  const s = await playDungeon(g, "Guerrero", log, {
    onRoom: async (st) => {
      if (st.sala === 1 && !shotsTaken.has(1)) { shotsTaken.add(1); }
    },
  });
  check(s.menu === "victoria", `la etapa termina con el menú de victoria (menú="${s.menu}", estado=${s.est})`, log);
  await shot(g, "12_victoria.png");
  const muertes = await g.v("Stats.Muertes");
  check(muertes >= 20, `enemigos derrotados: ${muertes}`, log);
  check((await g.v("Save.EtapaMax", true)) === 2, "se desbloquea la etapa 2 (Save.EtapaMax = 2)", log);
  check((await g.v("Save.Nivel", true)) >= 2, `el personaje sube de nivel (nivel ${await g.v("Save.Nivel", true)})`, log);
  check((await g.v("Stats.Oro")) > 0, `se obtiene oro (${await g.v("Stats.Oro")})`, log);
  const puertas = await g.objects("Puerta");
  check(puertas.every((p) => p.vars.Abierta === 1), "las 4 puertas de sala se abrieron", log);
  const botin = await g.v("Stats.Botin");
  const equipo = (await g.v("Save.ArmaBonus", true)) + (await g.v("Save.ArmaduraBonus", true));
  check(botin === 0 || equipo > 0, `el botín recogido se equipa (${botin} objetos; bonus de equipo ${equipo})`, log);
  await clickMenuSlot(g, 2);
  await g.waitScene("Pueblo");
  check((await player(g)).x > 3000, "al volver, el jugador aparece junto al portal", log);
  await g.tap("e"); await g.wait(500);
  const flechas = await g.objects("Flecha");
  const der = flechas.findIndex((f) => f.vars.Paso === 1);
  check(flechas[der].anim === "Der", "la flecha derecha del portal apunta a la derecha", log);
  await g.clickObject("Flecha", der); await g.wait(300);
  check((await g.v("Save.EtapaSel", true)) === 2, "con la etapa 2 desbloqueada, la flecha selecciona la etapa 2", log);
  await shot(g, "12b_portal_etapa2.png");
  await g.tap("Escape"); await g.wait(300);
  // GDevelop storage: localStorage["GDJS_UmbralSave"] = {"datos":{"str":"<ToJSON(Save)>"}}
  const saved = await g.page.evaluate(() => { const raw = localStorage.getItem("GDJS_UmbralSave"); return raw ? JSON.parse(JSON.parse(raw).datos.str) : null; });
  check(saved && saved.EtapaMax === 2 && saved.Clase === "Guerrero" && saved.Nivel >= 2,
    `la partida está guardada en localStorage (GDJS_UmbralSave: clase ${saved && saved.Clase}, nivel ${saved && saved.Nivel}, etapa máx. ${saved && saved.EtapaMax})`, log);
  await g.page.reload();
  await g.page.waitForFunction(() => window.__game && window.__game.getSceneStack().getCurrentScene(), null, { timeout: 60000 });
  await g.wait(3000);
  const label = (await g.objects("TextoBoton")).find((t) => t.vars.Slot === 1).text;
  check(/CONTINUAR\s+\(Guerrero nv\. \d+\)/.test(label), `tras recargar, el título ofrece "${label}"`, log);
  await clickMenuSlot(g, 1);
  await g.waitScene("Pueblo");
  check((await g.v("Save.EtapaMax", true)) === 2 && (await g.v("Save.Clase", true)) === "Guerrero", "Continuar carga la partida guardada en el pueblo", log);
});

/** Deterministic target: create an Enemigo of a given type at x (the game's own init events give it its stats). */
async function spawnEnemy(g, tipo, x) {
  await g.eval((G, S, a) => { const e = S.createObject("Enemigo"); e.setPosition(a.x, 600); e.getVariables().get("Tipo").setString(a.tipo); }, { tipo, x });
  await g.wait(700); // "aparecer" state
}
const setMP = (g) => g.eval((G, S) => { S.getObjects("Jugador")[0].getVariables().get("MP").setNumber(999); });
const facingRight = async (g) => { await g.hold("ArrowRight", 50); await g.wait(120); };
function waitFor(g, fnSrc, timeout = 1500) { return g.page.waitForFunction(fnSrc, null, { timeout, polling: "raf" }).then(() => true, () => false); }

await test("03 Maga: bola de fuego, nova (congela), meteoro (explosión) y barrera", async (g, log) => {
  await newGame(g, "Maga");
  await enterDungeon(g, 1);
  const px = (await player(g)).x;
  await spawnEnemy(g, "Esqueleto", px + 330);
  await facingRight(g);
  const fired = waitFor(g, () => window.__game.getSceneStack().getCurrentScene().getObjects("ProyectilJugador").some((p) => p.getAnimationName() === "Fuego"));
  await g.tap("j");
  check(await fired, "el ataque básico lanza una bola de fuego", log);
  await shot(g, "13_maga_fuego.png");
  check(await waitFor(g, () => window.__game.getSceneStack().getCurrentScene().getVariables().get("Stats").getChild("Golpes").getAsNumber() >= 1),
    "la bola de fuego impacta al esqueleto", log);
  // nova next to the enemy
  await g.eval((G, S) => { const J = S.getObjects("Jugador")[0]; const e = S.getObjects("Enemigo")[0]; J.setX(e.getX() - 90); });
  await setMP(g); await g.wait(120);
  const ring = waitFor(g, () => window.__game.getSceneStack().getCurrentScene().getObjects("Efecto").some((e) => e.getAnimationName() === "Nova"));
  await g.tap("k");
  check(await ring, "se ve el anillo de escarcha", log);
  await shot(g, "14_maga_nova.png");
  check(await waitFor(g, () => window.__game.getSceneStack().getCurrentScene().getObjects("Enemigo").some((e) => e.getVariables().get("Congelado").getAsNumber() > 0)),
    "la nova de escarcha congela al enemigo", log);
  await g.wait(1600);
  // meteor on a new target
  const x2 = (await player(g)).x;
  await spawnEnemy(g, "Esqueleto", x2 + 230);
  await facingRight(g);
  const golpesAntes = await g.v("Stats.Golpes");
  await setMP(g);
  await g.tap("l");
  check(await waitFor(g, () => window.__game.getSceneStack().getCurrentScene().getObjects("ProyectilJugador").some((p) => p.getAnimationName() === "Meteoro")),
    "el meteoro cae del cielo", log);
  await g.wait(380);
  await shot(g, "15_maga_meteoro.png");
  check(await waitFor(g, () => window.__game.getSceneStack().getCurrentScene().getObjects("Efecto").some((e) => e.getAnimationName() === "Impacto")),
    "el meteoro explota al tocar el suelo", log);
  await g.wait(300);
  check((await g.v("Stats.Golpes")) > golpesAntes, "la explosión del meteoro hace daño en área", log);
  await setMP(g);
  await g.tap("i");
  check(await waitFor(g, () => window.__game.getSceneStack().getCurrentScene().getObjects("Jugador")[0].getVariables().get("Escudo").getAsNumber() > 5),
    "la barrera arcana activa el escudo 6 s", log);
  check((await g.objects("Efecto")).some((e) => e.anim === "Escudo"), "se ve el efecto de escudo", log);
  await shot(g, "16_maga_barrera.png");
});

await test("04 Arquera: flecha, disparo triple, lluvia de flechas y paso sombrío", async (g, log) => {
  await newGame(g, "Arquera");
  await enterDungeon(g, 1);
  const px = (await player(g)).x;
  await spawnEnemy(g, "Bruto", px + 420);
  await facingRight(g);
  const shotArrow = waitFor(g, () => window.__game.getSceneStack().getCurrentScene().getObjects("ProyectilJugador").some((p) => p.getAnimationName() === "Flecha"));
  await g.tap("j");
  check(await shotArrow, "el ataque básico dispara una flecha", log);
  check(await waitFor(g, () => window.__game.getSceneStack().getCurrentScene().getVariables().get("Stats").getChild("Golpes").getAsNumber() >= 1),
    "la flecha impacta al bruto", log);
  await g.wait(400);
  await setMP(g);
  await g.tap("k");
  await waitFor(g, () => window.__game.getSceneStack().getCurrentScene().getObjects("ProyectilJugador").filter((p) => p.getAnimationName() === "Flecha").length >= 3);
  const arrows = (await g.objects("ProyectilJugador")).filter((p) => p.anim === "Flecha");
  check(arrows.length >= 3, `el disparo triple lanza 3 flechas (${arrows.length})`, log);
  const vys = new Set(arrows.map((a) => Math.round(a.vars.VY)));
  check(vys.size >= 3, "las 3 flechas salen en abanico (velocidades verticales distintas)", log);
  await shot(g, "17_arquera_triple.png");
  await g.wait(700);
  await setMP(g);
  await g.tap("l");
  await waitFor(g, () => window.__game.getSceneStack().getCurrentScene().getObjects("ProyectilJugador").filter((p) => p.getVariables().get("Tipo").getAsString() === "Lluvia").length >= 3);
  const rain = (await g.objects("ProyectilJugador")).filter((p) => p.vars.Tipo === "Lluvia");
  check(rain.length >= 3, `la lluvia de flechas genera flechas desde el cielo (${rain.length} en vuelo)`, log);
  await shot(g, "18_arquera_lluvia.png");
  await g.wait(1000);
  await setMP(g);
  const x0 = (await player(g)).x;
  await g.tap("i");
  await waitFor(g, () => window.__game.getSceneStack().getCurrentScene().getObjects("Jugador")[0].getVariables().get("Hab").getAsString() === "Arquera3");
  await g.wait(260);
  const p = await player(g);
  check(Math.abs(p.x - x0) > 120 && p.vars.Inv > 0, `el paso sombrío retrocede ${Math.round(Math.abs(p.x - x0))} px con invulnerabilidad`, log);
});

await test("05 Controles táctiles multitouch (joystick + botones a la vez)", async (g, log) => {
  await newGame(g, "Guerrero");
  await enterDungeon(g, 1);
  const joy = await g.screenPos("Joystick");
  const atk = await g.screenPos("BotonAtaque");
  const x0 = (await player(g)).x;
  await g.touch("touchStart", [{ x: joy.x, y: joy.y, id: 1 }]);
  for (let i = 1; i <= 6; i++) { await g.touch("touchMove", [{ x: joy.x + i * 12, y: joy.y, id: 1 }]); await g.wait(30); }
  await g.wait(500);
  const x1 = (await player(g)).x;
  check(x1 > x0 + 60, `arrastrar el joystick a la derecha mueve al jugador (${Math.round(x0)} → ${Math.round(x1)})`, log);
  await shot(g, "19_tactil_joystick.png");
  // second finger on the attack button while the joystick is held
  await g.touch("touchMove", [{ x: joy.x + 72, y: joy.y, id: 1 }, { x: atk.x, y: atk.y, id: 2 }]);
  await g.wait(160);
  const est = (await player(g)).vars.Estado;
  await g.touch("touchMove", [{ x: joy.x + 72, y: joy.y, id: 1 }]);
  await g.touch("touchEnd", []);
  check(est === "ataque", `con el joystick pulsado, un segundo dedo en ATACAR ataca (estado="${est}")`, log);
  await g.wait(600);
  // skill button + cooldown overlay
  await g.eval((G, S) => { S.getObjects("Jugador")[0].getVariables().get("MP").setNumber(999); });
  const s1 = await g.screenPos("BotonHab1");
  await g.touch("touchStart", [{ x: s1.x, y: s1.y, id: 3 }]); await g.wait(120); await g.touch("touchEnd", []);
  await g.wait(300);
  const cd1 = (await player(g)).vars.Cd1;
  const mask = (await g.eval((G, S) => S.getObjects("MascaraCD").find((m) => m.getVariables().get("Slot").getAsNumber() === 1).getAnimationFrame()));
  check(cd1 > 3 && mask > 8, `el botón de habilidad 1 lanza Torbellino y muestra el enfriamiento (cd ${cd1.toFixed(1)} s, máscara ${mask}/16)`, log);
  await shot(g, "20_tactil_habilidad.png");
  // jump button
  const jb = await g.screenPos("BotonSalto");
  const y0 = (await player(g)).y;
  await g.touch("touchStart", [{ x: jb.x, y: jb.y, id: 4 }]); await g.wait(200);
  const y1 = (await player(g)).y;
  await g.touch("touchEnd", []);
  check(y1 < y0 - 40, `el botón de salto hace saltar (${Math.round(y0)} → ${Math.round(y1)})`, log);
});

await test("06 Pausa, derrota y reintento", async (g, log) => {
  await newGame(g, "Guerrero");
  await enterDungeon(g, 1);
  await g.clickObject("BotonPausa"); await g.wait(300);
  check((await g.v("Menu")) === "pausa", "el botón de pausa abre el menú de pausa", log);
  const ts = await g.eval((G, S) => S.getTimeManager().getTimeScale());
  check(ts === 0, "el juego queda detenido (escala de tiempo 0)", log);
  await shot(g, "21_pausa.png");
  await clickMenuSlot(g, 1); await g.wait(300);
  check((await g.v("Menu")) === "" && (await g.eval((G, S) => S.getTimeManager().getTimeScale())) === 1, "Continuar reanuda el juego", log);
  await g.eval((G, S) => { S.getObjects("Jugador")[0].getVariables().get("HP").setNumber(0); });
  await g.wait(2600);
  check((await g.v("Menu")) === "derrota", "al morir aparece el menú de derrota", log);
  check((await player(g)).anim === "Guerrero_Dead", "se reproduce la animación de muerte", log);
  await shot(g, "22_derrota.png");
  await clickMenuSlot(g, 1);
  await g.waitScene("Mazmorra");
  const p = await player(g);
  check(p.vars.HP > 0 && p.vars.Estado === "libre", "Reintentar reinicia la etapa con vida completa", log);
});

await test("07 Jefe: Caballero de Ceniza (barra de vida, ataques y furia)", async (g, log) => {
  await newGame(g, "Guerrero");
  await g.setV("Save.ArmaBonus", 40, true);
  await g.setV("Save.Refuerzo", 10, true);
  await enterDungeon(g, 4);
  await g.eval((G, S) => {
    S.getVariables().get("Sala").setNumber(4);
    S.getObjects("Jugador")[0].setX(4 * 1800 + 200);
    for (const p of S.getObjects("Puerta")) { p.getVariables().get("Abierta").setNumber(1); p.activateBehavior("Solido", false); }
  });
  await g.hold("ArrowRight", 700);
  await g.page.waitForFunction(() => window.__game.getSceneStack().getCurrentScene().getObjects("Enemigo").some((e) => e.getVariables().get("Tipo").getAsString() === "Jefe"), null, { timeout: 10000 });
  await g.wait(1500);
  check((await g.objects("BarraJefe"))[0].visible, "aparece la barra de vida del jefe", log);
  await shot(g, "09_jefe_aparece.png");
  const seen = new Set();
  const t0 = Date.now();
  let shotDone = false;
  // fight with the bot until the boss dies; record the boss states seen
  const done = playDungeon(g, "Guerrero", log, { timeoutS: 240 });
  while (Date.now() - t0 < 240000) {
    const boss = (await g.objects("Enemigo")).find((e) => e.vars.Tipo === "Jefe");
    if (!boss) break;
    seen.add(boss.vars.Estado);
    if (!shotDone && boss.vars.Estado === "golpe") { await shot(g, "10_jefe_golpe.png"); shotDone = true; }
    if (boss.vars.Estado === "muerto") break;
    await g.wait(120);
  }
  const s = await done;
  check(seen.has("tajo") || seen.has("carga") || seen.has("golpe"), `el jefe usa sus ataques (${[...seen].join(", ")})`, log);
  check(s.menu === "final", `derrotar al jefe de capítulo y entrar al portal abre la página final de la historia (menú="${s.menu}")`, log);
  await shot(g, "11_jefe_derrotado.png");
  await clickMenuSlot(g, 1); await g.wait(1500);
  check((await g.v("Menu")) === "victoria" && (await g.v("Save.EtapaMax", true)) === 5, "tras la historia llega la victoria y se desbloquea la etapa 5", log);
});

await test("08 Pantalla 19.5:9 (1560×720): HUD anclado y capítulo 2", async (g, log) => {
  await newGame(g, "Arquera");
  await enterDungeon(g, 6);
  const W = await g.eval((G) => G.getGameResolutionWidth());
  check(W === 1560, `la resolución se adapta al ancho (${W}×720)`, log);
  const atk = await g.screenPos("BotonAtaque");
  const pause = await g.screenPos("BotonPausa");
  check(atk.x > 1300 && atk.x < 1560 - 60, `el botón de ataque sigue anclado a la derecha (x=${Math.round(atk.x)})`, log);
  check(pause.x > 1420 && pause.x < 1560 - 30, `el botón de pausa sigue anclado a la derecha (x=${Math.round(pause.x)})`, log);
  check((await g.v("Capitulo")) === "Fortaleza Carmesí", "la etapa 6 usa el capítulo Fortaleza Carmesí", log);
  await g.hold("ArrowRight", 900);
  await g.wait(1500);
  await shot(g, "23_fortaleza_19-5x9.png");
}, { width: 1560, height: 720 });

/** Waits (without any input) until a menu opens or the hero dies; logs room progress. */
async function watchAuto(g, log, timeoutS) {
  const t0 = Date.now();
  let lastSala = -1;
  while ((Date.now() - t0) / 1000 < timeoutS) {
    const s = await state(g);
    if (s.sala !== lastSala) { lastSala = s.sala; log.push(`INFO t=${Math.round((Date.now() - t0) / 1000)}s sala ${s.sala + 1} (nivel ${s.nivel}, vida ${Math.round(s.hp)}/${s.vidaMax})`); }
    if (s.menu !== "") return s;
    await g.wait(500);
  }
  throw new Error(`AUTO no terminó la etapa en ${timeoutS}s`);
}

await test("09 Combate automático (AUTO): la Maga completa la etapa 1 sin tocar nada más", async (g, log) => {
  await newGame(g, "Maga");
  await enterDungeon(g, 1);
  check((await g.objects("BotonAuto"))[0].anim === "Off", "AUTO empieza desactivado", log);
  await g.clickObject("BotonAuto");
  await g.wait(300);
  check((await g.v("Save.Auto", true)) === 1 && (await g.objects("BotonAuto"))[0].anim === "On", "tocar AUTO lo activa (botón dorado)", log);
  await g.wait(12000);
  await shot(g, "24_auto_combate.png");
  const s = await watchAuto(g, log, 420);
  check(s.menu === "victoria", `AUTO avanza, combate, vence al jefe y entra al portal (menú="${s.menu}")`, log);
  check((await g.v("Stats.Habilidades")) > 5, `AUTO usa habilidades (${await g.v("Stats.Habilidades")})`, log);
  check((await g.v("Save.EtapaMax", true)) === 2, "la etapa 2 queda desbloqueada", log);
});

for (const [cls, etapa, nivel] of [["Guerrero", 5, 9], ["Maga", 8, 15], ["Arquera", 12, 23]]) {
  await test(`balance ${cls} nivel ${nivel} en etapa ${etapa} (AUTO)`, async (g, log) => {
    await newGame(g, cls);
    // equipment roughly expected at that point: forge/reinforce levels and rare gear of the previous stage
    const arma = Math.round((3 + 2.6 * (etapa - 1)) * 1.9); const armadura = Math.round((10 + 8 * (etapa - 1)) * 1.9);
    for (const [k, v] of [["Save.Nivel", nivel], ["Save.ArmaBonus", arma], ["Save.ArmaduraBonus", armadura], ["Save.Forja", Math.floor(etapa / 2)],
      ["Save.Refuerzo", Math.floor(etapa / 2)], ["Save.Pociones", 8], ["Save.Auto", 1]]) await g.setV(k, v, true);
    await enterDungeon(g, etapa);
    log.push(`INFO arma +${arma} ATQ, armadura +${armadura} VIDA, forja/refuerzo ${Math.floor(etapa / 2)}`);
    const s = await watchAuto(g, log, 600);
    log.push(`INFO resultado: menú="${s.menu}", vida ${Math.round(s.hp)}/${s.vidaMax}, pociones restantes ${s.pociones}`);
    // the chapter bosses (stages 4, 8, 12) open their story page before the victory menu
    check(s.menu === "victoria" || s.menu === "final", `el personaje del nivel recomendado supera la etapa ${etapa} (menú="${s.menu}")`, log);
  });
}

await test("10 Doble salto, ataque hacia arriba/diagonal y combo de tres golpes", async (g, log) => {
  await newGame(g, "Guerrero");
  await g.wait(700);
  const ground = (await player(g)).y;
  const varOf = (name) => g.eval((G, S, n) => S.getObjects("Jugador")[0].getVariables().get(n).getAsNumber(), name);
  let saltosAfter2 = -1;
  const peak = async (presses) => {
    let min = 1e9;
    for (let i = 0; i < presses.length; i++) {
      await g.page.keyboard.press("Space");
      if (i === 1) { await g.wait(60); saltosAfter2 = await varOf("Saltos"); }
      const until = Date.now() + presses[i];
      while (Date.now() < until) { min = Math.min(min, (await player(g)).y); await g.wait(16); }
    }
    return min;
  };
  // ---- single jump vs double jump
  const single = await peak([900]);
  await g.wait(900);
  check(single < ground - 60, `un salto normal despega (altura ${Math.round(ground - single)} px)`, log);
  const double = await peak([260, 800]);
  check(saltosAfter2 === 1, `el segundo toque en el aire consume el doble salto (Saltos=${saltosAfter2})`, log);
  check(double < single - 45, `el doble salto llega más alto (${Math.round(ground - double)} px frente a ${Math.round(ground - single)} px)`, log);
  await g.wait(1200);
  check((await varOf("Saltos")) === 0, "al aterrizar se recupera el doble salto", log);
  await g.page.keyboard.press("Space"); await g.wait(200);
  await g.page.keyboard.press("Space"); await g.wait(120);
  const y3 = (await player(g)).y;
  await g.page.keyboard.press("Space"); await g.wait(180);
  const y4 = (await player(g)).y;
  check(y4 > y3 - 30, "no hay triple salto (un tercer toque no vuelve a impulsar)", log);
  await g.wait(1300);

  // ---- aimed melee attacks (keyboard: Up arrow)
  const hitPos = async () => {
    const seen = await waitFor(g, () => window.__game.getSceneStack().getCurrentScene().getObjects("GolpeJugador").length > 0, 1200);
    return seen ? g.eval((G, S) => { const J = S.getObjects("Jugador")[0]; const h = S.getObjects("GolpeJugador")[0];
      return { dx: h.getCenterXInScene() - J.getX(), dy: h.getCenterYInScene() - J.getY(), dano: h.getVariables().get("Dano").getAsNumber(),
        fuerte: h.getVariables().get("Fuerte").getAsNumber(), anim: J.getAnimationName(), dir: J.getVariables().get("Dir").getAsNumber(),
        aim: J.getVariables().get("Aim").getAsNumber() }; }) : null;
  };
  await g.page.keyboard.down("ArrowUp");
  let fired = hitPos();
  await g.page.keyboard.press("j");
  let h = await fired;
  await g.page.keyboard.up("ArrowUp");
  check(h && h.aim === 2 && h.dy < -110 && Math.abs(h.dx) < 30, `Arriba + atacar: el golpe aparece sobre la cabeza (dx ${Math.round(h?.dx)}, dy ${Math.round(h?.dy)}, anim ${h?.anim})`, log);
  check(h && h.anim === "Guerrero_AttackUp", "usa la animación de ataque hacia arriba", log);
  await g.wait(900);
  await g.page.keyboard.down("ArrowUp"); await g.page.keyboard.down("ArrowRight");
  fired = hitPos();
  await g.page.keyboard.press("j");
  h = await fired;
  await g.page.keyboard.up("ArrowUp"); await g.page.keyboard.up("ArrowRight");
  check(h && h.aim === 1 && h.dy < -70 && h.dx > 30, `Arriba + derecha + atacar: golpe en diagonal (dx ${Math.round(h?.dx)}, dy ${Math.round(h?.dy)})`, log);
  check(h && h.anim === "Guerrero_AttackDiag", "usa la animación de ataque en diagonal", log);
  await g.wait(1000);

  // ---- combo: hold attack, watch the sequence of Combo / damage
  const seq = [];
  await g.page.keyboard.down("j");
  const t0 = Date.now();
  let last = 0;
  while (Date.now() - t0 < 2300) {
    const c = await varOf("Combo");
    const cd = await varOf("CdAtk");
    if (c !== last && cd > 0.2) { const d = await g.eval((G, S) => { const a = S.getObjects("GolpeJugador").map((o) => [o.getVariables().get("Dano").getAsNumber(), o.getVariables().get("Fuerte").getAsNumber()]);
      return a[0] || null; }); seq.push({ c, d }); last = c; }
    await g.wait(20);
  }
  await g.page.keyboard.up("j");
  log.push(`INFO secuencia de combo observada: ${seq.map((x) => `${x.c}${x.d ? ` (daño x${x.d[0]}${x.d[1] ? ", fuerte" : ""})` : ""}`).join(" → ")}`);
  const finals = seq.filter((x) => x.c === 3);
  check(seq.some((x) => x.c === 1) && seq.some((x) => x.c === 2) && finals.length >= 1, "atacar seguido recorre el combo 1 → 2 → 3", log);
  check(finals.some((x) => x.d && x.d[0] >= 1.8 && x.d[1] === 1), "el tercer golpe es potenciado (daño x1,9 y empuje fuerte)", log);
  check(seq.filter((x) => x.c === 1 || x.c === 2).every((x) => !x.d || x.d[0] === 1), "los dos primeros golpes son normales", log);
  await shot(g, "26_combo_final.png");
});

await test("11 Ataque hacia arriba con proyectiles (Maga/Arquera) y apuntado con el joystick táctil", async (g, log) => {
  await newGame(g, "Maga");
  await g.wait(700);
  // touch joystick pushed UP + attack button: fireball must fly upwards
  const joy = await g.screenPos("Joystick");
  const atk = await g.screenPos("BotonAtaque");
  await g.touch("touchStart", [{ x: joy.x, y: joy.y, id: 1 }]);
  for (let i = 1; i <= 6; i++) { await g.touch("touchMove", [{ x: joy.x, y: joy.y - i * 14, id: 1 }]); await g.wait(30); }
  await g.wait(150);
  const ay = await g.v("In.AY");
  check(ay < -0.5, `empujar el joystick hacia arriba da In.AY negativo (${ay.toFixed(2)})`, log);
  const fired = waitFor(g, () => window.__game.getSceneStack().getCurrentScene().getObjects("ProyectilJugador").length > 0, 1500);
  await g.touch("touchMove", [{ x: joy.x, y: joy.y - 84, id: 1 }, { x: atk.x, y: atk.y, id: 2 }]);
  check(await fired, "con el joystick arriba, ATACAR lanza un proyectil", log);
  await g.wait(120);
  const pr = await g.eval((G, S) => { const p = S.getObjects("ProyectilJugador")[0]; if (!p) return null;
    return { vx: p.getVariables().get("VX").getAsNumber(), vy: p.getVariables().get("VY").getAsNumber(), angle: p.getAngle() }; });
  check(pr && pr.vy < -500 && Math.abs(pr.vx) < 80, `la bola de fuego sube (vx ${Math.round(pr?.vx)}, vy ${Math.round(pr?.vy)}, ángulo ${Math.round(pr?.angle)}°)`, log);
  await g.touch("touchMove", [{ x: joy.x, y: joy.y - 84, id: 1 }]);
  await g.touch("touchEnd", []);
  await g.wait(1200);
  // diagonal with the keyboard, facing left
  await g.page.keyboard.down("ArrowUp"); await g.page.keyboard.down("ArrowLeft");
  await g.wait(100);
  const fired2 = waitFor(g, () => window.__game.getSceneStack().getCurrentScene().getObjects("ProyectilJugador").length > 0, 1500);
  await g.page.keyboard.press("j");
  await fired2; await g.wait(100);
  const pd = await g.eval((G, S) => { const p = S.getObjects("ProyectilJugador")[0]; return p ? { vx: p.getVariables().get("VX").getAsNumber(), vy: p.getVariables().get("VY").getAsNumber() } : null; });
  await g.page.keyboard.up("ArrowUp"); await g.page.keyboard.up("ArrowLeft");
  check(pd && pd.vx < -350 && pd.vy < -350, `diagonal hacia arriba-izquierda (vx ${Math.round(pd?.vx)}, vy ${Math.round(pd?.vy)})`, log);
  await shot(g, "27_ataque_diagonal.png");
});

await test("12 Murciélagos: vuelo con inercia, siguen tu salto y pican con aviso", async (g, log) => {
  await newGame(g, "Guerrero");
  await enterDungeon(g, 1);
  await g.setV("Sala", 0);
  // no other enemies: spawn a single bat above the hero (the room is still in "espera" so no wave appears)
  await g.eval((G, S) => { S.getObjects("Enemigo").forEach((e) => e.deleteFromScene()); });
  await g.eval((G, S) => { const J = S.getObjects("Jugador")[0]; const e = S.createObject("Enemigo"); e.setPosition(J.getX() + 200, J.getY() - 230);
    e.getVariables().get("Tipo").setString("Murcielago"); e.getVariables().get("Lado").setNumber(1); });
  await g.wait(800);
  const bat = () => g.eval((G, S) => { const b = S.getObjects("Enemigo").find((o) => o.getVariables().get("Tipo").getAsString() === "Murcielago"); const J = S.getObjects("Jugador")[0];
    return b ? { x: b.getX(), y: b.getY(), dx: b.getX() - J.getX(), dy: b.getY() - J.getY(), vx: b.getVariables().get("VX").getAsNumber(), vy: b.getVariables().get("VY").getAsNumber(),
      est: b.getVariables().get("Estado").getAsString(), ang: b.getAngle() } : null; });
  // 1) natural hover: smooth velocity, vertical wobble
  const samples = [];
  for (let i = 0; i < 40; i++) { samples.push(await bat()); await g.wait(50); if (samples[i].est === "atacar") break; }
  const moving = samples.filter((b) => b.est === "mover");
  let maxJump = 0;
  for (let i = 1; i < moving.length; i++) maxJump = Math.max(maxJump, Math.hypot(moving[i].x - moving[i - 1].x, moving[i].y - moving[i - 1].y));
  const ys = moving.map((b) => b.dy);
  check(moving.length >= 10 && maxJump < 40, `el murciélago se mueve sin saltos bruscos (máx ${maxJump.toFixed(1)} px por muestra de 50 ms)`, log);
  check(Math.max(...ys) - Math.min(...ys) > 6, `ondula al volar (altura relativa ${Math.round(Math.min(...ys))}…${Math.round(Math.max(...ys))})`, log);
  check(moving.some((b) => Math.abs(b.vx) > 20 || Math.abs(b.vy) > 20), "tiene velocidad e inercia (VX/VY)", log);
  // 2) it follows the hero's jump: hold jump + double jump and compare its height relative to the hero
  await g.eval((G, S) => { const b = S.getObjects("Enemigo").find((o) => o.getVariables().get("Tipo").getAsString() === "Murcielago"); b.getVariables().get("Cd").setNumber(-20); });
  const base = (await bat()).dy;
  await g.page.keyboard.down("Space"); await g.wait(320); await g.page.keyboard.up("Space");
  await g.wait(60); await g.page.keyboard.down("Space"); await g.wait(400); await g.page.keyboard.up("Space");
  let lowest = -1e9;
  for (let i = 0; i < 12; i++) { const b = await bat(); if (b.est === "mover") lowest = Math.max(lowest, b.dy); await g.wait(60); }
  check(lowest > base + 45, `al saltar cerca de él, el murciélago baja a tu altura (dy ${Math.round(base)} → ${Math.round(lowest)})`, log);
  await g.wait(1500);
  // 3) telegraphed swoop: it must enter "atacar", slow down first, then cross the hero's position
  await g.eval((G, S) => { const b = S.getObjects("Enemigo").find((o) => o.getVariables().get("Tipo").getAsString() === "Murcielago"); b.getVariables().get("Cd").setNumber(99); });
  const path = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 3000) { const b = await bat(); path.push({ ...b, t: Date.now() - t0 }); await g.wait(30); if (path.length > 12 && b.est === "mover" && path.some((p) => p.est === "atacar")) break; }
  const atk = path.filter((p) => p.est === "atacar");
  check(atk.length > 8, `el murciélago ataca (estado "atacar" durante ${atk.length} muestras)`, log);
  const tele = atk.slice(0, 4);
  const dive = atk.slice(-8);
  const vTele = Math.max(...tele.map((p) => Math.hypot(p.vx, p.vy)));
  const vDive = Math.max(...dive.map((p) => Math.hypot(p.vx, p.vy)));
  check(vDive > 350 && vDive > vTele * 1.5, `aviso lento y picado rápido (${Math.round(vTele)} → ${Math.round(vDive)} px/s)`, log);
  const minDist = Math.min(...atk.map((p) => Math.hypot(p.dx, p.dy + 48)));
  const sideStart = Math.sign(atk[0].dx), sideEnd = Math.sign(atk[atk.length - 1].dx);
  check(minDist < 120 && sideStart !== sideEnd, `pica atravesando la posición del héroe y sigue de largo (dist. mín. ${Math.round(minDist)} px)`, log);
  await shot(g, "28_murcielago_pica.png");
});

await test("13 Plataformas con propósito: salas generadas, cofres alcanzables, pinchos y cultistas apostados", async (g, log) => {
  await newGame(g, "Arquera");
  await enterDungeon(g, 1);
  const layout = () => g.eval((G, S) => ({
    cofres: S.getObjects("Cofre").map((c) => ({ x: c.getX(), y: c.getY() })), pinchos: S.getObjects("Pinchos").map((c) => c.getX()),
    plat: S.getObjects("Plataforma").map((p) => ({ x: p.getX(), y: p.getY(), w: p.getWidth() })).sort((a, b) => a.x - b.x) }));
  // ---- the generated layout follows the reachability rules (check several fresh runs)
  const problems = [];
  let cofresRuns = 0;
  for (let run = 0; run < 4; run++) {
    if (run > 0) { await g.eval((G) => { G.getSceneStack().replace("Mazmorra", true); }); await g.waitScene("Mazmorra"); await g.wait(500); }
    const L = await layout();
    cofresRuns += L.cofres.length;
    for (let room = 0; room < 5; room++) {
      const list = L.plat.filter((p) => p.x >= room * 1800 && p.x < (room + 1) * 1800);
      if (list.length < 3) problems.push(`sala ${room + 1}: sólo ${list.length} plataformas`);
      if (list[0] && 600 - list[0].y > 145) problems.push(`sala ${room + 1}: primera plataforma demasiado alta (${600 - list[0].y} px)`);
      for (let i = 1; i < list.length; i++) {
        const gap = list[i].x - (list[i - 1].x + list[i - 1].w);
        const rise = list[i - 1].y - list[i].y;
        if (gap > 155 || rise > 105) problems.push(`sala ${room + 1}: salto de ${Math.round(gap)} px de hueco y ${Math.round(rise)} px de subida`);
      }
      const top = list.reduce((a, b) => (b.y < a.y ? b : a), list[0]);
      const ch = L.cofres.find((c) => c.x >= room * 1800 && c.x < (room + 1) * 1800);
      if (!ch || Math.abs(ch.y - top.y) > 1 || ch.x < top.x || ch.x > top.x + top.w) problems.push(`sala ${room + 1}: el cofre no está en la plataforma más alta`);
    }
    if (L.pinchos.length !== 3) problems.push(`hay ${L.pinchos.length} tramos de pinchos (se esperaban 3)`);
  }
  check(problems.length === 0, `4 salas generadas distintas cumplen las reglas de alcance (${problems.slice(0, 3).join("; ") || "sin problemas"}; ${cofresRuns} cofres)`, log);
  // ---- physics check: take the worst step of room 1 (largest gap + rise) and cross it with jump + double jump
  const L = await layout();
  const room0 = L.plat.filter((p) => p.x < 1800);
  let worst = 1;
  for (let i = 1; i < room0.length; i++) {
    const cost = (room0[i].x - (room0[i - 1].x + room0[i - 1].w)) + (room0[i - 1].y - room0[i].y);
    if (cost > (room0[worst].x - (room0[worst - 1].x + room0[worst - 1].w)) + (room0[worst - 1].y - room0[worst].y)) worst = i;
  }
  const from = room0[worst - 1], to = room0[worst];
  log.push(`INFO paso más difícil de la sala 1: hueco ${Math.round(to.x - (from.x + from.w))} px, subida ${Math.round(from.y - to.y)} px`);
  await g.setPos("Jugador", from.x + from.w - 35, from.y - 4);
  await g.wait(600);
  let landed = false;
  await g.page.keyboard.down("ArrowRight");
  await g.page.keyboard.down("Space");
  const t0 = Date.now();
  let phase = 0, tHold = 0, prevY = 1e9;
  while (Date.now() - t0 < 2600 && !landed) {
    const st = await g.eval((G, S) => { const J = S.getObjects("Jugador")[0]; return { x: J.getX(), y: J.getY() }; });
    if (phase === 0 && Date.now() - t0 > 260) { await g.page.keyboard.up("Space"); phase = 1; }
    if (phase === 1 && st.y >= prevY && Date.now() - t0 > 320) { await g.page.keyboard.down("Space"); phase = 2; tHold = Date.now(); }
    if (phase === 2 && Date.now() - tHold > 320) { await g.page.keyboard.up("Space"); phase = 3; }
    if (phase === 3 && Math.abs(st.y - (to.y)) < 6 && st.x >= to.x && st.x <= to.x + to.w) landed = true;
    prevY = st.y;
    await g.wait(30);
  }
  await g.page.keyboard.up("Space"); await g.page.keyboard.up("ArrowRight");
  check(landed, "el paso más difícil se supera con salto + doble salto y se aterriza en la plataforma siguiente", log);
  // ---- the chest of the room opens on touch
  const chest = L.cofres[0];
  const oro0 = await g.v("Save.Oro", true);
  await g.setPos("Jugador", chest.x, chest.y - 5);
  const opened = await waitFor(g, () => window.__game.getSceneStack().getCurrentScene().getObjects("Cofre").some((c) => c.getVariables().get("Abierto").getAsNumber() === 1), 2500);
  check(opened, "al tocar el cofre se abre", log);
  await g.wait(2600);
  const cofres = await g.v("Stats.Cofres");
  const oro1 = await g.v("Save.Oro", true);
  check(cofres === 1 && oro1 - oro0 >= 18, `el cofre da oro (+${oro1 - oro0}) y cuenta en las estadísticas (${cofres})`, log);
  await shot(g, "29_cofre_plataforma.png");
  // ---- spikes hurt and bounce
  await g.eval((G, S) => { const J = S.getObjects("Jugador")[0]; J.getVariables().get("HP").setNumber(J.getVariables().get("HP").getAsNumber()); J.getVariables().get("Inv").setNumber(0); });
  await g.wait(1200); // let the coins and enemies settle
  const hp0 = (await player(g)).vars.HP;
  await g.setPos("Jugador", L.pinchos[0], 570);
  await g.wait(500);
  const p1 = await player(g);
  check(p1.vars.HP < hp0 - 4, `los pinchos hacen daño (${Math.round(hp0)} → ${Math.round(p1.vars.HP)})`, log);
  // ---- perched cultists: force waves until one stands on a platform
  await g.setPos("Jugador", 1 * 1800 + 330, 560);
  await g.setV("Sala", 1);
  // force a pool of cultists only (Relato.Pool[etapa] is the 20-letter enemy mix of the stage)
  await g.eval((G, S) => G.getVariables().get("Relato").getChild("Pool").getChildAt(S.getVariables().get("PoolIdx").getAsNumber()).setString("CCCCCCCCCCCCCCCCCCCC"));
  await g.setV("SpawnPend", 1);
  await g.wait(1600);
  await g.setV("SpawnPend", 0);
  const perched = await g.eval((G, S) => S.getObjects("Enemigo").filter((e) => e.getVariables().get("Percha").getAsNumber() === 1)
    .map((e) => ({ y: e.getY(), x: e.getX(), x0: e.getVariables().get("PX0").getAsNumber(), x1: e.getVariables().get("PX1").getAsNumber() })));
  const total = await g.eval((G, S) => S.getObjects("Enemigo").filter((e) => e.getVariables().get("Tipo").getAsString() === "Cultista").length);
  check(total >= 3, `la oleada trae cultistas (${total})`, log);
  if (perched.length) {
    await g.wait(1800);
    const again = await g.eval((G, S) => S.getObjects("Enemigo").filter((e) => e.getVariables().get("Percha").getAsNumber() === 1)
      .map((e) => ({ y: e.getY(), x: e.getX(), x0: e.getVariables().get("PX0").getAsNumber(), x1: e.getVariables().get("PX1").getAsNumber(),
        tipo: e.getVariables().get("Tipo").getAsString(), est: e.getVariables().get("Estado").getAsString(), hp: e.getVariables().get("HP").getAsNumber(),
        plat: S.getObjects("Plataforma").filter((p) => p.getX() <= e.getX() + 8 && p.getX() + p.getWidth() >= e.getX() - 8).map((p) => [Math.round(p.getX()), Math.round(p.getY()), Math.round(p.getWidth())]) })));
    log.push(`INFO cultistas apostados: ${JSON.stringify(again)}`);
    check(again.length > 0 && again.every((c) => c.y < 590 && c.x >= c.x0 - 3 && c.x <= c.x1 + 3), `los cultistas apostados (${again.length}) se quedan sobre su plataforma`, log);
  } else {
    log.push("INFO en esta oleada ningún cultista se apostó (70% de probabilidad cada uno)");
  }
});

await test("14 RPG: reparto de puntos de atributo, habilidades nuevas y menú de habilidades", async (g, log) => {
  await newGame(g, "Guerrero");
  await g.wait(600);
  const sv = (n) => g.v(n, true);
  const stat = (n) => g.v("Stat." + n, true);
  check((await sv("Save.Puntos")) === 0, "en el nivel 1 no hay puntos que repartir", log);
  // level 5 -> 12 points
  await g.setV("Save.Nivel", 5, true); await g.setV("Save.Exp", 0, true); await g.setV("RecalcStats", 1);
  await g.wait(300);
  check((await sv("Save.Puntos")) === 12, `nivel 5 = 12 puntos de atributo (${await sv("Save.Puntos")})`, log);
  const label = await g.eval((G, S) => S.getObjects("TextoPuntos")[0].getText());
  check(/12/.test(label), `el HUD avisa de los puntos (“${label}”)`, log);
  const atq0 = await stat("Atq"), vida0 = await stat("VidaMax"), crit0 = await stat("Crit"), mana0 = await stat("ManaMax"), cd0 = await stat("Cd1Max");
  // open the sheet with C, go to Attributes
  await g.tap("c"); await g.wait(500);
  check((await g.v("Menu")) === "personaje", "la tecla C abre la ficha del personaje", log);
  await shot(g, "30_ficha_botones.png");
  await clickMenuSlot(g, 1); await g.wait(500);
  check((await g.v("Menu")) === "atributos", "el botón Atributos abre el reparto de puntos", log);
  await clickMenuSlot(g, 1); await clickMenuSlot(g, 1); await clickMenuSlot(g, 1);   // 3 x Fuerza
  await clickMenuSlot(g, 2); await clickMenuSlot(g, 2);                               // 2 x Vitalidad
  await clickMenuSlot(g, 3);                                                          // 1 x Destreza
  await clickMenuSlot(g, 4); await clickMenuSlot(g, 4);                               // 2 x Espíritu
  await g.wait(400);
  const atr = { fue: await sv("Save.AtFue"), vit: await sv("Save.AtVit"), des: await sv("Save.AtDes"), esp: await sv("Save.AtEsp"), pts: await sv("Save.Puntos") };
  check(atr.fue === 3 && atr.vit === 2 && atr.des === 1 && atr.esp === 2 && atr.pts === 4, `los botones reparten los puntos (F${atr.fue} V${atr.vit} D${atr.des} E${atr.esp}, quedan ${atr.pts})`, log);
  check((await stat("Atq")) === atq0 + 3, `Fuerza: +1 ATQ por punto (${atq0} → ${await stat("Atq")})`, log);
  check((await stat("VidaMax")) === vida0 + 16, `Vitalidad: +8 vida por punto (${vida0} → ${await stat("VidaMax")})`, log);
  check(Math.abs((await stat("Crit")) - (crit0 + 0.005)) < 1e-6, `Destreza: +0,5% crítico (${crit0} → ${await stat("Crit")})`, log);
  check((await stat("ManaMax")) === mana0 + 6 && (await stat("Cd1Max")) < cd0, `Espíritu: +3 maná y menos enfriamiento (maná ${mana0} → ${await stat("ManaMax")}, cd ${cd0} → ${(await stat("Cd1Max")).toFixed(2)})`, log);
  await shot(g, "31_atributos.png");
  // spend the rest and try one more (must not go negative)
  for (let i = 0; i < 6; i++) await clickMenuSlot(g, 1);
  await g.wait(300);
  check((await sv("Save.Puntos")) === 0 && (await sv("Save.AtFue")) === 7, `sin puntos no se puede seguir subiendo (Fuerza ${await sv("Save.AtFue")}, puntos ${await sv("Save.Puntos")})`, log);
  // reset costs gold
  const oroAntes = await sv("Save.Oro");
  await g.setV("Save.Oro", 500, true);
  await clickMenuSlot(g, 5); await g.wait(400);
  check((await sv("Save.AtFue")) === 0 && (await sv("Save.Puntos")) === 12 && (await sv("Save.Oro")) === 500 - (60 + 20 * 5), "reiniciar puntos los devuelve y cuesta oro", log);
  // level 4 unlocks slot 2 (Salto sísmico)
  await g.tap("Escape"); await g.wait(300);
  await g.setV("Save.Nivel", 3, true); await g.setV("Save.Hab2", 1, true); await g.setV("RecalcStats", 1); await g.wait(200);
  await g.setV("Save.Exp", 100000, true);
  await g.wait(700);
  check((await sv("Save.Nivel")) >= 4 && (await sv("Save.Hab2")) === 2, `al llegar al nivel 4 se equipa la habilidad nueva de la ranura 2 (nivel ${await sv("Save.Nivel")})`, log);
  const anim2 = await g.eval((G, S) => S.getObjects("BotonHab2")[0].getAnimationName());
  check(anim2 === "Guerrero2", `el icono de la ranura 2 cambia (${anim2})`, log);
  await g.setV("Save.Exp", 0, true);
  check((await stat("Costo2")) === 18 && Math.abs((await stat("Cd2Max")) - 8 * (1 - Math.min(0.4, 0.006 * (await sv("Save.AtEsp"))))) < 0.01, `coste y enfriamiento de Salto sísmico (${await stat("Costo2")} maná, ${(await stat("Cd2Max")).toFixed(1)} s)`, log);
  // loadout menu: swap slot 1 (needs level 8)
  await g.setV("Save.Nivel", 6, true); await g.setV("RecalcStats", 1); await g.wait(200);
  await g.tap("c"); await g.wait(400); await clickMenuSlot(g, 2); await g.wait(500);
  check((await g.v("Menu")) === "habilidades", "la ficha abre el menú de habilidades", log);
  await shot(g, "32_habilidades.png");
  await clickMenuSlot(g, 1); await g.wait(300);
  check((await sv("Save.Hab1")) === 1, "la ranura 1 sigue con la habilidad inicial antes del nivel 8", log);
  await clickMenuSlot(g, 2); await g.wait(300);
  check((await sv("Save.Hab2")) === 1, "la ranura 2 vuelve a la habilidad inicial si se cambia", log);
  await clickMenuSlot(g, 2); await g.wait(300);
  check((await sv("Save.Hab2")) === 2, "y se puede volver a equipar la nueva", log);
  await g.tap("Escape"); await g.wait(300);
  await g.setV("Save.Nivel", 8, true); await g.setV("RecalcStats", 1); await g.wait(200);
  await g.tap("c"); await g.wait(400); await clickMenuSlot(g, 2); await g.wait(400);
  await clickMenuSlot(g, 1); await g.wait(300);
  check((await sv("Save.Hab1")) === 2 && (await stat("Costo1")) === 22, `en el nivel 8 se puede equipar el Ciclón de acero (coste ${await stat("Costo1")})`, log);
});

// ---- helpers for the skill tests
async function classAtLevel(g, cls, hab = [2, 2, 2]) {
  await newGame(g, cls);
  await g.setV("Save.Nivel", 20, true);
  hab.forEach((v, i) => g.setV(`Save.Hab${i + 1}`, v, true));
  await g.setV("RecalcStats", 1);
  await g.wait(300);
  await g.setV("CurarTodo", 1);
  await enterDungeon(g, 1);
  await g.wait(400);
  // keep the room from starting its own waves (they would mix with the dummies): "limpia" = cleared room
  await g.setV("SalaEstado", "limpia");
  await g.eval((G, S) => S.getObjects("Enemigo").forEach((e) => e.deleteFromScene()));
}
async function spawnMany(g, tipo, xs, tank = true) {
  await g.eval((G, S, a) => { for (const x of a.xs) { const e = S.createObject("Enemigo"); e.setPosition(x, 600); e.getVariables().get("Tipo").setString(a.tipo); } }, { tipo, xs });
  await g.wait(800);
  // tanky, harmless dummies so damage can be measured (they are still hit, knocked back and frozen normally)
  if (tank) await g.eval((G, S) => S.getObjects("Enemigo").forEach((e) => { if (e.getVariables().get("HPMax").getAsNumber() < 90000) { e.getVariables().get("HPMax").setNumber(90000); e.getVariables().get("HP").setNumber(90000); e.getVariables().get("Atq").setNumber(1); } }));
}
const enemyHP = (g) => g.eval((G, S) => S.getObjects("Enemigo").filter((e) => e.getVariables().get("Estado").getAsString() !== "muerto").map((e) => [Math.round(e.getX()), e.getVariables().get("HP").getAsNumber(), e.getVariables().get("HPMax").getAsNumber()]).sort((a, b) => a[0] - b[0]));
async function watch(g, ms, fn) { const out = []; const t0 = Date.now(); while (Date.now() - t0 < ms) { out.push(await g.eval(fn)); await g.wait(20); } return out; }
const refill = (g) => g.eval((G, S) => { const J = S.getObjects("Jugador")[0]; J.getVariables().get("MP").setNumber(9999); J.getVariables().get("HP").setNumber(9999); J.getVariables().get("Cd1").setNumber(0); J.getVariables().get("Cd2").setNumber(0); J.getVariables().get("Cd3").setNumber(0); });
const damaged = (before, after) => after.filter((e) => before.some((b) => Math.abs(b[0] - e[0]) < 400 && false) || true).length; // (not used)

await test("15 Guerrero: Ciclón de acero, Salto sísmico y Espada giratoria", async (g, log) => {
  await classAtLevel(g, "Guerrero");
  // -- Ciclón (slot 1)
  await spawnMany(g, "Esqueleto", [330, 420, 120]);
  await refill(g);
  let before = await enemyHP(g);
  const hits = watch(g, 1500, (G, S) => S.getObjects("GolpeJugador").length);
  await g.tap("k");
  const counts = await hits;
  await g.wait(300);
  let after = await enemyHP(g);
  log.push(`INFO tajos simultáneos máx ${Math.max(...counts)}; vida enemigos ${JSON.stringify(before.map((e) => e[1]))} → ${JSON.stringify(after.map((e) => e[1]))}`);
  const drops = after.filter((e, i) => e[1] < before[i][1]).length;
  check(drops >= 3, `el Ciclón de acero daña a los 3 enemigos alrededor (${drops}/3)`, log);
  check(counts.some((c) => c >= 1), "genera golpes giratorios", log);
  await g.wait(1200);
  await g.eval((G, S) => S.getObjects("Enemigo").forEach((e) => e.deleteFromScene()));
  // -- Salto sísmico (slot 2)
  await spawnMany(g, "Esqueleto", [420]);
  await refill(g);
  before = await enemyHP(g);
  const ground = (await player(g)).y;
  const seen = watch(g, 1900, (G, S) => { const J = S.getObjects("Jugador")[0]; const h = S.getObjects("GolpeJugador").map((o) => [o.getWidth(), o.getVariables().get("Fuerte").getAsNumber()]);
    return { y: J.getY(), est: J.getVariables().get("Estado").getAsString(), hits: h }; });
  await g.tap("l");
  const trace = await seen;
  const apex = Math.min(...trace.map((t) => t.y));
  const slam = trace.some((t) => t.hits.some((h) => h[0] >= 400 && h[1] === 1));
  after = await enemyHP(g);
  check(apex < ground - 120, `el Salto sísmico eleva al héroe (${Math.round(ground - apex)} px)`, log);
  check(slam, "al caer crea una onda de choque ancha y fuerte (>= 400 px)", log);
  check(after.length === 0 || after[0][1] < before[0][1], `la onda daña al enemigo cercano (${before[0][1]} → ${after[0] ? after[0][1] : "muerto"})`, log);
  check(trace[trace.length - 1].est === "libre", "el héroe vuelve a estar libre tras el aterrizaje", log);
  await shot(g, "33_salto_sismico.png");
  await g.wait(600);
  await g.eval((G, S) => S.getObjects("Enemigo").forEach((e) => e.deleteFromScene()));
  // -- Espada giratoria (slot 3): pierces a line of enemies
  // the slam may have landed the hero on one of the generated floating platforms: back to the ground, left of them
  await g.setPos("Jugador", 250, 570); await g.wait(500);
  await facingRight(g);
  const hx = (await player(g)).x;
  await spawnMany(g, "Esqueleto", [hx + 160, hx + 360, hx + 560]);
  await refill(g);
  before = await enemyHP(g);
  const proj = watch(g, 900, (G, S) => S.getObjects("ProyectilJugador").map((p) => [p.getVariables().get("Tipo").getAsString(), p.getVariables().get("Perfora").getAsNumber(), p.getX()]));
  await g.tap("i");
  const pr = await proj;
  await g.wait(300);
  after = await enemyHP(g);
  check(pr.some((l) => l.some((p) => p[0] === "Espada" && p[1] === 1)), "lanza una espada que perfora", log);
  const ahead = (a) => a.filter((e) => e[0] > hx + 100); // only the three dummies in the line of fire
  before = ahead(before); after = ahead(after);
  const dd = after.filter((e, i) => before[i] && e[1] < before[i][1]).length;
  check(dd >= 3, `la espada atraviesa y daña a los 3 enemigos en línea (${dd}/3)`, log);
});

await test("16 Maga: Tormenta de rayos, Aura ígnea y Cataclismo", async (g, log) => {
  await classAtLevel(g, "Maga");
  // -- Tormenta de rayos (slot 1)
  await spawnMany(g, "Esqueleto", [300, 500, 700]);
  await refill(g);
  let before = await enemyHP(g);
  const bolts = watch(g, 900, (G, S) => S.getObjects("Efecto").filter((e) => e.getAnimationName() === "Rayo").length);
  await g.tap("k");
  const b = await bolts;
  await g.wait(400);
  let after = await enemyHP(g);
  check(Math.max(...b) >= 2, `caen varios rayos a la vez (${Math.max(...b)})`, log);
  const dd = after.filter((e, i) => before[i] && e[1] < before[i][1]).length;
  check(dd >= 3, `los tres enemigos reciben un rayo (${dd}/3)`, log);
  await shot(g, "34_tormenta_rayos.png");
  await g.wait(800);
  await g.eval((G, S) => S.getObjects("Enemigo").forEach((e) => e.deleteFromScene()));
  // -- Aura ígnea (slot 2): repeated damage around the caster
  await spawnMany(g, "Bruto", [330]);
  await refill(g);
  before = await enemyHP(g);
  await g.tap("l");
  await g.wait(200);
  const aura = await g.eval((G, S) => S.getObjects("Jugador")[0].getVariables().get("Aura").getAsNumber());
  check(aura > 3, `el Aura ígnea queda activa durante ${aura.toFixed(1)} s`, log);
  const hpSeries = [];
  for (let i = 0; i < 12; i++) { hpSeries.push((await enemyHP(g))[0][1]); await g.wait(200); }
  const ticks = hpSeries.filter((v, i) => i > 0 && v < hpSeries[i - 1]).length;
  check(ticks >= 3, `quema al enemigo cercano varias veces (${ticks} golpes en 2,4 s)`, log);
  await shot(g, "35_aura_ignea.png");
  await g.wait(2500);
  await g.eval((G, S) => S.getObjects("Enemigo").forEach((e) => e.deleteFromScene()));
  // -- Cataclismo (slot 3): screen-wide
  await spawnMany(g, "Esqueleto", [640, 800]);
  await spawnMany(g, "Bruto", [500]);
  await refill(g);
  before = await enemyHP(g);
  const wide = watch(g, 1400, (G, S) => Math.max(0, ...S.getObjects("GolpeJugador").map((o) => o.getWidth())));
  await g.tap("i");
  const w = await wide;
  await g.wait(300);
  after = await enemyHP(g);
  check(Math.max(...w) >= 1000, `el Cataclismo crea una explosión de ${Math.round(Math.max(...w))} px`, log);
  const hit = after.filter((e, i) => before[i] && e[1] < before[i][1]).length;
  check(hit === after.length && after.length >= 2, `daña a todos los enemigos de la pantalla (${hit}/${after.length})`, log);
});

await test("17 Arquera: Flecha explosiva, Ráfaga y Disparo celestial", async (g, log) => {
  await classAtLevel(g, "Arquera");
  // -- Flecha explosiva (slot 1): the arrow hits the first enemy, the explosion also hurts the one next to it
  await spawnMany(g, "Bruto", [560, 640]);
  await g.eval((G, S) => S.getObjects("Enemigo").forEach((e) => e.getVariables().get("Vel").setNumber(0)));
  await refill(g);
  let before = await enemyHP(g);
  const expl = watch(g, 1200, (G, S) => S.getObjects("Efecto").filter((e) => e.getAnimationName() === "Explosion").length);
  await g.tap("k");
  const ex = await expl;
  await g.wait(300);
  let after = await enemyHP(g);
  check(Math.max(...ex) >= 1, "la flecha explota al impactar", log);
  check(after[0][1] < before[0][1] && after[1][1] < before[1][1], `la explosión daña a los dos enemigos juntos (${before.map((e) => e[1])} → ${after.map((e) => e[1])})`, log);
  await shot(g, "36_flecha_explosiva.png");
  await g.wait(800);
  await g.eval((G, S) => S.getObjects("Enemigo").forEach((e) => e.deleteFromScene()));
  // -- Ráfaga (slot 2) aimed up with the keyboard
  await refill(g);
  await g.page.keyboard.down("ArrowUp");
  await g.wait(80);
  const arrows = watch(g, 1100, (G, S) => S.getObjects("ProyectilJugador").map((p) => [p.getVariables().get("VY").getAsNumber(), p.getVariables().get("Id").getAsNumber()]));
  await g.tap("l");
  const ar = await arrows;
  await g.page.keyboard.up("ArrowUp");
  const ids = new Set(ar.flat().filter((x) => Array.isArray(x)).map((x) => x[1]));
  const up = ar.flat().filter((x) => x[0] < -800).length;
  check(ids.size >= 7, `la Ráfaga dispara 8 flechas (${ids.size} detectadas)`, log);
  check(up > 0, "y salen hacia arriba cuando se apunta arriba", log);
  await g.wait(900);
  // -- Disparo celestial (slot 3): huge piercing arrow
  await spawnMany(g, "Esqueleto", [420, 700, 980]);
  await refill(g);
  before = await enemyHP(g);
  const big = watch(g, 900, (G, S) => S.getObjects("ProyectilJugador").map((p) => [p.getVariables().get("Perfora").getAsNumber(), p.getWidth()]));
  await g.tap("i");
  const bg = await big;
  await g.wait(400);
  after = await enemyHP(g);
  check(bg.flat().some((p) => p[0] === 1 && p[1] > 90), "la flecha celestial es enorme y perfora", log);
  const dd = after.filter((e, i) => before[i] && e[1] < before[i][1]).length;
  check(dd >= 3, `atraviesa a los tres enemigos alineados (${dd}/3)`, log);
});

// ------------------------------------------------------------------ phase 4: enemies, bosses, campaign, arena
const clearEnemies = (g) => g.eval((G, S) => { S.getObjects("Enemigo").forEach((e) => e.deleteFromScene()); S.getObjects("ProyectilEnemigo").forEach((e) => e.deleteFromScene()); });
/** Creates an Enemigo with extra variables (numbers or strings); the game's own init events give it its stats. */
async function spawnWith(g, tipo, x, y, vars = {}) {
  await g.eval((G, S, a) => {
    const e = S.createObject("Enemigo"); e.setPosition(a.x, a.y); e.getVariables().get("Tipo").setString(a.tipo);
    for (const [k, v] of Object.entries(a.vars)) { if (typeof v === "string") e.getVariables().get(k).setString(v); else e.getVariables().get(k).setNumber(v); }
  }, { tipo, x, y, vars });
}
const toughHero = async (g) => { await g.setV("Save.Refuerzo", 60, true); await g.setV("RecalcStats", 1); await g.wait(200); await g.setV("CurarTodo", 1); };

await test("18 Enemigos nuevos: arquero, espectro, gólem y limo (se divide en dos)", async (g, log) => {
  await newGame(g, "Guerrero");
  await toughHero(g);
  await enterDungeon(g, 6, { modo: "mazmorra" });
  await clearEnemies(g);
  const px = (await player(g)).x;
  // -- Arquero: dispara flechas desde lejos
  await spawnEnemy(g, "Arquero", px + 520);
  const flecha = waitFor(g, () => window.__game.getSceneStack().getCurrentScene().getObjects("ProyectilEnemigo").some((p) => p.getAnimationName() === "Flecha"), 9000);
  check(await flecha, "el arquero esquelético dispara flechas a distancia", log);
  await shot(g, "42_arquero.png");
  await clearEnemies(g);
  // -- Espectro: vuela, dispara orbes y se desvanece para reaparecer al otro lado
  await spawnEnemy(g, "Espectro", px + 350);
  const seen = new Set();
  const xs = [];
  const t0 = Date.now();
  let shotDone = false;
  while (Date.now() - t0 < 16000 && !(seen.has("desvanecer") && seen.has("Orbe"))) {
    const st = await g.eval((G, S) => {
      const e = S.getObjects("Enemigo")[0];
      return e ? { est: e.getVariables().get("Estado").getAsString(), y: e.getY(), fly: e.getVariables().get("Tipo").getAsString() === "Espectro",
        orbs: S.getObjects("ProyectilEnemigo").some((p) => p.getAnimationName() === "Orbe") } : null;
    });
    if (st) { seen.add(st.est); if (st.orbs) seen.add("Orbe"); xs.push(st.y); }
    if (st && st.est === "atacar" && !shotDone) { await shot(g, "43_espectro.png"); shotDone = true; }
    await g.wait(60);
  }
  check(seen.has("Orbe"), "el espectro lanza orbes", log);
  check(seen.has("desvanecer"), "el espectro se desvanece para teletransportarse", log);
  check(Math.min(...xs) < 600 - 60, `vuela por encima del suelo (altura mínima y=${Math.round(Math.min(...xs))})`, log);
  await clearEnemies(g);
  // -- Gólem: onda de choque por el suelo y no se tambalea con golpes normales
  await spawnEnemy(g, "Golem", px + 200);
  await g.eval((G, S) => { S.getObjects("Enemigo")[0].getVariables().get("HPMax").setNumber(90000); S.getObjects("Enemigo")[0].getVariables().get("HP").setNumber(90000); });
  const onda = waitFor(g, () => window.__game.getSceneStack().getCurrentScene().getObjects("ProyectilEnemigo").some((p) => p.getAnimationName() === "Onda"), 9000);
  check(await onda, "el gólem lanza una onda de choque por el suelo", log);
  await shot(g, "44_golem.png");
  const golpeado = await g.eval((G, S) => S.getObjects("Enemigo")[0].getVariables().get("Estado").getAsString());
  log.push(`INFO estado del gólem al atacar: ${golpeado}`);
  await clearEnemies(g);
  // -- Limo: al morir se divide en dos limos pequeños
  await spawnEnemy(g, "Limo", px + 300);
  await g.eval((G, S) => { const e = S.getObjects("Enemigo")[0]; e.getVariables().get("HP").setNumber(0); });
  await g.wait(700);
  const tipos = await g.eval((G, S) => S.getObjects("Enemigo").filter((e) => e.getVariables().get("Estado").getAsString() !== "muerto").map((e) => e.getVariables().get("Tipo").getAsString()));
  check(tipos.filter((t) => t === "LimoMini").length === 2, `un limo grande se divide en dos pequeños (${tipos.join(", ")})`, log);
  await shot(g, "45_limo_dividido.png");
  const anims = await g.eval((G, S) => S.getObjects("Enemigo").filter((e) => e.getVariables().get("Estado").getAsString() !== "muerto").map((e) => e.getAnimationName()));
  check(anims.every((a) => a.startsWith("LimoMini_")), `los limos pequeños usan su propia animación (${anims.join(", ")})`, log);
});

await test("19 Élites: un enemigo normal con más vida, más grande y con refuerzos", async (g, log) => {
  await newGame(g, "Guerrero");
  await toughHero(g);
  await enterDungeon(g, 5, { modo: "mazmorra" });
  await clearEnemies(g);
  const px = (await player(g)).x;
  await spawnWith(g, "Bruto", px + 500, 600);
  await spawnWith(g, "Bruto", px + 900, 600, { Elite: 1, Boss: 1, Nombre: "Prueba" });
  await g.wait(900);
  const [normal, elite] = await g.eval((G, S) => S.getObjects("Enemigo").sort((a, b) => a.getX() - b.getX()).map((e) => ({
    hpMax: e.getVariables().get("HPMax").getAsNumber(), atq: e.getVariables().get("Atq").getAsNumber(), w: e.getWidth() })));
  const ratio = elite.hpMax / normal.hpMax;
  check(ratio > 4.3 && ratio < 4.7, `el élite tiene ~4,5 veces la vida del enemigo base (${elite.hpMax} vs ${normal.hpMax})`, log);
  check(elite.atq > normal.atq * 1.25, `y más daño (${elite.atq} vs ${normal.atq})`, log);
  check(elite.w > normal.w * 1.3, `y es más grande (${Math.round(elite.w)} vs ${Math.round(normal.w)} px)`, log);
  // refuerzos: tras ~11 s en combate invoca esqueletos
  await g.eval((G, S) => { S.getObjects("Enemigo").filter((e) => e.getVariables().get("Elite").getAsNumber() === 1)[0].getVariables().get("Invoc").setNumber(10.5); });
  const antes = await g.eval((G, S) => S.getObjects("Enemigo").length);
  await g.wait(2500);
  const despues = await g.eval((G, S) => S.getObjects("Enemigo").length);
  check(despues >= antes + 2, `el élite invoca refuerzos (${antes} → ${despues} enemigos)`, log);
  await shot(g, "46_elite.png");
});

/** Puts the hero in the boss room of the current stage and waits for the boss to appear. */
async function toBossRoom(g) {
  await g.eval((G, S) => {
    S.getVariables().get("Sala").setNumber(4);
    S.getObjects("Jugador")[0].setX(4 * 1800 + 200);
    for (const p of S.getObjects("Puerta")) { p.getVariables().get("Abierta").setNumber(1); p.activateBehavior("Solido", false); }
  });
  await g.hold("ArrowRight", 700);
  await g.page.waitForFunction(() => window.__game.getSceneStack().getCurrentScene().getObjects("Enemigo").some((e) => e.getVariables().get("Boss").getAsNumber() === 1), null, { timeout: 10000 });
  await g.wait(1500);
}
const bossInfo = (g) => g.eval((G, S) => { const e = S.getObjects("Enemigo").find((x) => x.getVariables().get("Boss").getAsNumber() === 1);
  return e ? { tipo: e.getVariables().get("Tipo").getAsString(), est: e.getVariables().get("Estado").getAsString(), hp: e.getVariables().get("HP").getAsNumber(),
    hpMax: e.getVariables().get("HPMax").getAsNumber(), elite: e.getVariables().get("Elite").getAsNumber() } : null; });
const bossName = (g) => g.eval((G, S) => S.getObjects("TextoJefe")[0].getText());

/** Observes the boss for `ms` while the hero is invulnerable, collecting states and projectile animations. */
async function observeBoss(g, ms, need) {
  const seenStates = new Set(); const seenProj = new Set(); const t0 = Date.now(); let lastEst = "";
  while (Date.now() - t0 < ms) {
    await g.eval((G, S) => { const J = S.getObjects("Jugador")[0]; J.getVariables().get("HP").setNumber(99999); });
    const st = await g.eval((G, S) => { const e = S.getObjects("Enemigo").find((x) => x.getVariables().get("Boss").getAsNumber() === 1);
      return e ? { est: e.getVariables().get("Estado").getAsString(), proj: S.getObjects("ProyectilEnemigo").map((p) => p.getAnimationName()) } : null; });
    if (!st) break;
    if (process.env.VERBOSE && st.est !== lastEst) { console.log(`     boss ${((Date.now() - t0) / 1000).toFixed(1)}s ${st.est}`); lastEst = st.est; }
    seenStates.add(st.est); st.proj.forEach((a) => seenProj.add(a));
    if (need(seenStates, seenProj)) break;
    await g.wait(80);
  }
  return { seenStates, seenProj };
}

await test("20 Jefe del capítulo 2: Reina Carmesí (orbes, lluvia de sangre, teletransporte y refuerzos)", async (g, log) => {
  await newGame(g, "Guerrero");
  await g.setV("Save.Nivel", 15, true); await g.setV("RecalcStats", 1); await g.wait(300); await g.setV("CurarTodo", 1);
  await enterDungeon(g, 8);
  await toBossRoom(g);
  const b = await bossInfo(g);
  check(b.tipo === "Reina" && b.elite === 0, `el jefe de la etapa 8 es la Reina (${b.tipo}, ${b.hpMax} de vida)`, log);
  check((await bossName(g)) === "REINA CARMESÍ", `la barra muestra su nombre ("${await bossName(g)}")`, log);
  check((await g.objects("BarraJefe"))[0].visible, "aparece la barra de vida del jefe", log);
  await shot(g, "47_reina_aparece.png");
  // make the queen weaker than half life so she can summon; observe her attack set
  await g.eval((G, S) => { const e = S.getObjects("Enemigo").find((x) => x.getVariables().get("Boss").getAsNumber() === 1); e.getVariables().get("HP").setNumber(e.getVariables().get("HPMax").getAsNumber() * 0.5); e.getVariables().get("Invoc").setNumber(13); });
  const { seenStates, seenProj } = await observeBoss(g, 80000, (st, pr) => st.has("orbes") && st.has("sangre") && st.has("corte") && st.has("invocar") && pr.has("OrbeRojo"));
  check(seenStates.has("orbes") && seenProj.has("OrbeRojo"), `lanza orbes de sangre en abanico (estados: ${[...seenStates].join(", ")})`, log);
  check(seenStates.has("sangre"), "invoca la lluvia de sangre (con aviso en el suelo)", log);
  check(seenStates.has("desvanecer") && seenStates.has("corte"), "se desvanece y tajea por la espalda", log);
  check(seenStates.has("invocar"), "herida, invoca murciélagos", log);
  await shot(g, "48_reina_ataque.png");
});

await test("21 Jefe del capítulo 3: Coloso del Umbral (puñetazo, barrido, cristales y limos) y final de la historia", async (g, log) => {
  await newGame(g, "Guerrero");
  await g.setV("Save.Nivel", 22, true); await g.setV("RecalcStats", 1); await g.wait(300); await g.setV("CurarTodo", 1);
  await enterDungeon(g, 12);
  await toBossRoom(g);
  const b = await bossInfo(g);
  check(b.tipo === "Coloso" && b.elite === 0, `el jefe de la etapa 12 es el Coloso (${b.tipo}, ${b.hpMax} de vida)`, log);
  check((await bossName(g)) === "COLOSO DEL UMBRAL", `la barra muestra su nombre ("${await bossName(g)}")`, log);
  await shot(g, "49_coloso_aparece.png");
  await g.eval((G, S) => { const e = S.getObjects("Enemigo").find((x) => x.getVariables().get("Boss").getAsNumber() === 1); e.getVariables().get("HP").setNumber(e.getVariables().get("HPMax").getAsNumber() * 0.45); e.getVariables().get("Invoc").setNumber(16); });
  const { seenStates, seenProj } = await observeBoss(g, 90000, (st, pr) => st.has("golpe") && st.has("barrido") && st.has("rocas") && st.has("invocar") && pr.has("Cristal") && pr.has("Onda"));
  check(seenStates.has("golpe") && seenProj.has("Onda"), `puñetazo con ondas de choque (estados: ${[...seenStates].join(", ")})`, log);
  check(seenStates.has("barrido"), "barrido de área", log);
  check(seenStates.has("rocas") && seenProj.has("Cristal"), "lluvia de cristales", log);
  check(seenStates.has("invocar"), "a media vida invoca limos", log);
  await shot(g, "50_coloso_ataque.png");
  // kill it: final story page, victory of the whole campaign and Save.Historia
  await g.eval((G, S) => { const e = S.getObjects("Enemigo").find((x) => x.getVariables().get("Boss").getAsNumber() === 1); e.getVariables().get("HP").setNumber(0); });
  await g.page.waitForFunction(() => window.__game.getSceneStack().getCurrentScene().getVariables().get("JefeMuerto").getAsNumber() === 2, null, { timeout: 8000 });
  check((await g.v("Save.Historia", true)) === 1, "derrotar al Coloso completa la historia (Save.Historia = 1)", log);
  await g.eval((G, S) => { S.getObjects("Enemigo").forEach((e) => e.deleteFromScene()); const P = S.getObjects("Portal")[0]; S.getObjects("Jugador")[0].setX(P.getX() + 40); });
  await g.page.waitForFunction(() => window.__game.getSceneStack().getCurrentScene().getVariables().get("Menu").getAsString() === "final", null, { timeout: 6000 });
  await g.wait(400);
  await shot(g, "51_final_historia.png");
  await clickMenuSlot(g, 1); await g.wait(700);
  check((await g.v("Menu")) === "victoria_final", "tras el final de la historia llega la victoria de la campaña", log);
  await shot(g, "52_victoria_campana.png");
  const botones = (await g.objects("TextoBoton")).filter((t) => t.visible).map((t) => t.text);
  check(botones.length === 1 && /pueblo/.test(botones[0]), `sólo ofrece volver al pueblo (${botones.join(" | ")})`, log);
  check((await g.v("Save.EtapaMax", true)) === 12, "la etapa máxima queda en 12", log);
});

await test("22 Campaña: 3 capítulos con su tema, relato de cada etapa, diario y Archivista", async (g, log) => {
  await newGame(g, "Arquera");
  await g.setV("Save.IntroVista", 0, true);
  for (const [etapa, cap, tex] of [[5, "Fortaleza Carmesí", "fortaleza"], [9, "Abismo de Cristal", "abismo"]]) {
    await g.setV("Save.EtapaMax", etapa, true);
    await enterDungeon(g, etapa, { intro: true });
    await g.wait(700);
    check((await g.v("Capitulo")) === cap, `la etapa ${etapa} pertenece al capítulo "${cap}"`, log);
    check((await g.v("Menu")) === "intro", `la etapa ${etapa} abre su página de historia`, log);
    await shot(g, `53_relato_etapa${etapa}.png`);
    await clickMenuSlot(g, 1); await g.wait(500);
    const tiles = await g.eval((G, S) => ["Suelo", "Plataforma", "Muro"].map((n) => S.getObjects(n)[0].getRendererObject().texture.baseTexture.cacheId));
    check(tiles.every((t) => t.includes(tex)), `suelo, plataformas y muros usan el tema "${tex}" (${tiles.join(", ")})`, log);
    await shot(g, `54_tema_${tex}.png`);
    // back to town for the next chapter
    await g.tap("Escape"); await g.wait(300);
    await clickMenuSlot(g, 3); await g.waitScene("Pueblo");
    await g.wait(500);
  }
  // diary: entries unlock with the stages reached
  await g.setV("Save.EtapaMax", 9, true);
  await g.setPos("Jugador", 3000); await g.wait(500);
  check((await g.v("Cerca")) === "archivista", "cerca del Archivista aparece la interacción", log);
  await g.tap("e"); await g.wait(500);
  check((await g.v("Menu")) === "archivista", "el Archivista abre su menú", log);
  await shot(g, "55_archivista.png");
  await clickMenuSlot(g, 1); await g.wait(500);
  check((await g.v("Menu")) === "diario", "'Leer el diario' abre el códice de historia", log);
  await shot(g, "56_diario.png");
  const pag0 = await g.v("DiarioPag");
  const flechas = await g.objects("Flecha");
  const der = flechas.findIndex((f) => f.vars.Paso === 1);
  await g.clickObject("Flecha", der); await g.wait(300);
  check((await g.v("DiarioPag")) === pag0 + 1, "las flechas pasan las páginas del diario", log);
  await g.tap("Escape"); await g.wait(300);
});

await test("23 Coliseo: rondas sin fin, jefe cada 5 rondas, récord guardado y derrota", async (g, log) => {
  await newGame(g, "Guerrero");
  await g.setV("Save.Nivel", 12, true); await g.setV("Save.EtapaMax", 3, true); await g.setV("RecalcStats", 1); await g.wait(300); await g.setV("CurarTodo", 1);
  await enterDungeon(g, 3, { modo: "arena" });
  check((await g.v("Juego.Modo", true)) === "arena" && (await g.v("Capitulo")) === "Coliseo de la Ceniza", "el coliseo arranca como modo arena", log);
  check((await g.v("Etapa")) >= 3 && (await g.v("Etapa")) <= 7, `la dificultad base sigue tu nivel (etapa ${await g.v("Etapa")})`, log);
  check(await waitFor(g, () => window.__game.getSceneStack().getCurrentScene().getObjects("Enemigo").length >= 3, 6000), "la primera ronda genera enemigos sin abrir puertas", log);
  await shot(g, "57_coliseo_ronda1.png");
  // clear rounds 1-4 quickly, check gold, record and the boss on round 5
  for (let r = 1; r <= 4; r++) {
    const oro0 = await g.v("Save.Oro", true);
    // wait for the wave to be on the field and fully spawned, then defeat it
    await g.page.waitForFunction((n) => { const S = window.__game.getSceneStack().getCurrentScene(); const en = S.getObjects("Enemigo");
      return S.getVariables().get("Ronda").getAsNumber() === n && en.length >= 3 && en.every((e) => e.getVariables().get("Estado").getAsString() === "mover"); }, r, { timeout: 12000 });
    await g.eval((G, S) => { S.getObjects("Enemigo").forEach((e) => { e.getVariables().get("HP").setNumber(0); }); });
    await g.page.waitForFunction((n) => window.__game.getSceneStack().getCurrentScene().getVariables().get("Ronda").getAsNumber() > n, r, { timeout: 8000 });
    const oro1 = await g.v("Save.Oro", true);
    if (r === 1) check(oro1 > oro0, `superar la ronda da oro (${oro0} → ${oro1})`, log);
    check((await g.v("Save.ArenaMax", true)) === r, `el récord del coliseo sube a la ronda ${r}`, log);
  }
  await g.page.waitForFunction(() => window.__game.getSceneStack().getCurrentScene().getVariables().get("Ronda").getAsNumber() === 5, null, { timeout: 8000 });
  await g.page.waitForFunction(() => window.__game.getSceneStack().getCurrentScene().getObjects("Enemigo").some((e) => e.getVariables().get("Boss").getAsNumber() === 1), null, { timeout: 8000 });
  await g.wait(1200);
  const b = await bossInfo(g);
  check(b && b.elite === 1, `la ronda 5 trae un jefe (${b && b.tipo}, ${await bossName(g)})`, log);
  await shot(g, "58_coliseo_jefe.png");
  // die: dedicated menu with the round reached
  await g.eval((G, S) => { S.getObjects("Jugador")[0].getVariables().get("HP").setNumber(0); });
  await g.page.waitForFunction(() => window.__game.getSceneStack().getCurrentScene().getVariables().get("Menu").getAsString() === "arena_fin", null, { timeout: 8000 });
  await g.wait(400);
  await shot(g, "59_coliseo_fin.png");
  check((await g.v("Save.ArenaMax", true)) === 4, "el récord conserva las rondas superadas (4)", log);
  await clickMenuSlot(g, 1); await g.waitScene("Mazmorra");
  await g.wait(800);
  check((await g.v("Ronda")) === 1 && (await g.v("Juego.Modo", true)) === "arena", "'Otro combate' reinicia el coliseo en la ronda 1", log);
});

await test("24 Mazmorra: repite una etapa con un élite al azar del capítulo y no avanza la historia", async (g, log) => {
  await newGame(g, "Guerrero");
  await g.setV("Save.EtapaMax", 6, true);
  await g.setV("Save.Nivel", 12, true); await g.setV("RecalcStats", 1); await g.wait(300); await g.setV("CurarTodo", 1);
  const nombres = new Set();
  for (let i = 0; i < 3; i++) {
    await enterDungeon(g, 5, { modo: "mazmorra" });
    check((await g.v("Juego.Modo", true)) === "mazmorra" && (await g.v("Menu")) === "", "la mazmorra no muestra páginas de historia", log);
    const idx = await g.v("BossIdx");
    nombres.add(idx);
    check(idx >= 5 && idx <= 7, `el jefe sale del capítulo 2 (élite nº ${idx})`, log);
    if (i === 0) {
      await toBossRoom(g);
      const b = await bossInfo(g);
      check(b.elite === 1, `es un élite (${b.tipo}) con nombre en la barra ("${await bossName(g)}")`, log);
      await shot(g, "60_mazmorra_elite.png");
    }
    await g.eval((G, S) => { S.getObjects("Jugador")[0].getVariables().get("HP").setNumber(0); });
    await g.page.waitForFunction(() => window.__game.getSceneStack().getCurrentScene().getVariables().get("Menu").getAsString() === "derrota", null, { timeout: 8000 });
    await clickMenuSlot(g, 2); await g.waitScene("Pueblo"); await g.wait(500);
  }
  log.push(`INFO élites vistos (índices): ${[...nombres].join(", ")}`);
  check((await g.v("Save.EtapaMax", true)) === 6, "la mazmorra no cambia la etapa máxima de la campaña", log);
});

await test("25 Partida guardada por la versión 1.0.0: carga y usa lo nuevo con valores por defecto", async (g, log) => {
  await g.wait(2500);
  // exactly the fields the 1.0.0 build stored (no attributes, skill variants, story or arena fields)
  const old = { Clase: "Maga", Nivel: 7, Exp: 120, Oro: 340, Pociones: 5, ArmaBonus: 22, ArmaRareza: 3, ArmaNombre: "Bastón Raro", ArmaduraBonus: 60,
    ArmaduraRareza: 2, ArmaduraNombre: "Túnica Mágica", Forja: 2, Refuerzo: 1, EtapaMax: 4, EtapaSel: 3, Version: 1, Auto: 0 };
  // GDevelop storage: localStorage["GDJS_UmbralSave"] = {"datos":{"str":"<ToJSON(Save)>"}}
  await g.page.evaluate((json) => localStorage.setItem("GDJS_UmbralSave", JSON.stringify({ datos: { str: json } })), JSON.stringify(old));
  await g.page.reload();
  await g.page.waitForFunction(() => window.__game && window.__game.getSceneStack().getCurrentScene(), null, { timeout: 60000 });
  await g.wait(3000);
  const label = (await g.objects("TextoBoton")).find((t) => t.vars.Slot === 1).text;
  check(/CONTINUAR\s+\(Maga nv\. 7\)/.test(label), `el título ofrece "${label}"`, log);
  await clickMenuSlot(g, 1);
  await g.waitScene("Pueblo");
  await g.wait(800);
  const sv = (n) => g.v(n, true);
  check((await sv("Save.Nivel")) === 7 && (await sv("Save.EtapaMax")) === 4 && (await sv("Save.Oro")) === 340, "se conservan nivel, etapa máxima y oro", log);
  check((await sv("Save.Puntos")) === 18, `los puntos de atributo se derivan del nivel (${await sv("Save.Puntos")} = 3 × 6)`, log);
  check((await sv("Save.Hab1")) === 1 && (await sv("Save.Hab2")) === 1 && (await sv("Save.Hab3")) === 1, "las habilidades equipadas son las iniciales (1, 1, 1)", log);
  check((await sv("Stat.Cls")) === 1 && (await sv("Stat.Costo1")) > 0 && (await sv("Stat.Cd1Max")) > 0, `las habilidades de la Maga tienen coste y enfriamiento (${await sv("Stat.Costo1")} PM)`, log);
  await g.tap("c"); await g.wait(400);
  check((await g.v("Menu")) === "personaje", "la ficha del personaje se abre con la partida antigua", log);
  await g.tap("Escape"); await g.wait(300);
  // the campaign continues from stage 4 and reads its story page (never seen in the old save)
  await g.setV("Save.Refuerzo", 30, true); await g.setV("RecalcStats", 1); await g.wait(300);
  await enterDungeon(g, 4, { intro: true });
  await g.wait(600);
  check((await g.v("Menu")) === "intro" && (await g.v("Etapa")) === 4, "la campaña sigue en la etapa 4 y muestra su página de historia", log);
  await clickMenuSlot(g, 1); await g.wait(500);
  await spawnEnemy(g, "Esqueleto", (await player(g)).x + 300);
  await setMP(g); await facingRight(g);
  const usadas0 = await g.v("Stats.Habilidades");
  await g.tap("k"); await g.wait(600);
  check((await g.v("Stats.Habilidades")) === usadas0 + 1, "la habilidad 1 de la Maga se lanza con normalidad", log);
});

// ------------------------------------------------------------------ report
const pass = results.filter((r) => r.status === "PASS").length;
const report = { date: new Date().toISOString(), build: "builds/web", engine: "GDevelop GDJS 5.6.269", results };
fs.writeFileSync(path.join(REPORTS, "report.json"), JSON.stringify(report, null, 2));
const md = [`# Gameplay tests — ${report.date}`, "", `Build: \`${report.build}\` · Motor: ${report.engine} · Navegador: Chromium headless (Playwright)`, "",
  `**${pass}/${results.length} PASS**`, ""];
for (const r of results) {
  md.push(`## ${r.status === "PASS" ? "✅" : "❌"} ${r.name} (${r.seconds}s)`, "");
  r.log.forEach((l) => md.push(`- ${l}`));
  if (r.error) md.push(`- ERROR: ${r.error}`);
  md.push("");
}
fs.writeFileSync(path.join(REPORTS, "REPORT.md"), md.join("\n"));
console.log(`\n${pass}/${results.length} tests passed`);
process.exit(pass === results.length ? 0 : 1);
