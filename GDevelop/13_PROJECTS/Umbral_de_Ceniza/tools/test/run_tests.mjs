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
  if (!cond) throw new AssertionError(msg);
}

async function test(name, fn, opts = {}) {
  if (filter && !name.includes(filter)) return;
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

async function newGame(g, cls) {
  await g.wait(2500);
  await g.setV("Save.Clase", "", true);
  if ((await g.scene()) !== "Titulo") throw new Error("not on title");
  // "Nueva partida" is slot 2 when a save exists, slot 1 otherwise
  const hay = await g.v("Juego.HayPartida", true);
  await clickMenuSlot(g, hay ? 2 : 1);
  await g.waitScene("SeleccionClase");
  const idx = ["Guerrero", "Maga", "Arquera"].indexOf(cls);
  await g.clickObject("BotonMenu", idx);
  await g.waitScene("Pueblo");
}

async function enterDungeon(g, etapa = 1) {
  await g.setV("Save.EtapaSel", etapa, true);
  await g.setV("Save.EtapaMax", Math.max(etapa, await g.v("Save.EtapaMax", true)), true);
  await g.setPos("Jugador", 3440);
  await g.wait(500);
  await g.tap("e");
  await g.wait(500);
  await clickMenuSlot(g, 1);
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
  await newGame(g, "Guerrero");
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
  // portal
  await g.setPos("Jugador", 3440); await g.wait(500);
  await g.tap("e"); await g.wait(500);
  check((await g.v("Menu")) === "portal", "el portal abre el selector de etapa", log);
  await shot(g, "07_portal.png");
  await clickMenuSlot(g, 1);
  await g.waitScene("Mazmorra");
  check((await g.v("Etapa")) === 1, "se entra a la etapa 1", log);
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
  await clickMenuSlot(g, 2);
  await g.waitScene("Pueblo");
  check((await player(g)).x > 3000, "al volver, el jugador aparece junto al portal", log);
  // GDevelop storage: localStorage["GDJS_UmbralSave"] = {"datos":{"str":"<ToJSON(Save)>"}}
  const saved = await g.page.evaluate(() => { const raw = localStorage.getItem("GDJS_UmbralSave"); return raw ? JSON.parse(JSON.parse(raw).datos.str) : null; });
  check(saved && saved.EtapaMax === 2 && saved.Clase === "Guerrero" && saved.Nivel >= 2,
    `la partida está guardada en localStorage (GDJS_UmbralSave: clase ${saved && saved.Clase}, nivel ${saved && saved.Nivel}, etapa máx. ${saved && saved.EtapaMax})`, log);
  await g.page.reload();
  await g.page.waitForFunction(() => window.__game && window.__game.getSceneStack().getCurrentScene(), null, { timeout: 60000 });
  await g.wait(3000);
  const label = (await g.objects("TextoBoton")).find((t) => t.vars.Slot === 1).text;
  check(/CONTINUAR\s+\(Guerrero nv\. \d+\)/.test(label), `tras recargar, el título ofrece "${label}"`, log);
});

/** Deterministic target: create an Enemigo of a given type at x (the game's own init events give it its stats). */
async function spawnEnemy(g, tipo, x) {
  await g.eval((G, S, a) => { const e = S.createObject("Enemigo"); e.setPosition(a.x, 600); e.getVariables().get("Tipo").setString(a.tipo); }, { tipo, x });
  await g.wait(700); // "aparecer" state
}
const setMP = (g) => g.eval((G, S) => { S.getObjects("Jugador")[0].getVariables().get("MP").setNumber(999); });
const facingRight = async (g) => { await g.hold("ArrowRight", 50); await g.wait(120); };
const waitFor = (g, fnSrc, timeout = 1500) => g.page.waitForFunction(fnSrc, null, { timeout, polling: "raf" }).then(() => true, () => false);

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
  await enterDungeon(g, 1);
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
  check(s.menu === "victoria", "derrotar al jefe y entrar al portal lleva a la victoria", log);
  await shot(g, "11_jefe_derrotado.png");
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
