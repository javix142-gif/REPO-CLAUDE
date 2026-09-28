// Minimal browser harness for the exported HTML5 build (Playwright + the pre-installed Chromium).
// It serves builds/web, exposes the GDevelop RuntimeGame as window.__game (test copy only)
// and offers helpers to read real game state and to drive keyboard, mouse and multitouch input.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const p of ["playwright", "/opt/node22/lib/node_modules/playwright"]) {
    try { return require(p); } catch { /* next */ }
  }
  throw new Error("Playwright not found (npm i -D playwright, or use the pre-installed one)");
}
const { chromium } = loadPlaywright();

const TYPES = { ".html": "text/html", ".js": "application/javascript", ".png": "image/png", ".json": "application/json",
  ".wav": "audio/wav", ".ttf": "font/ttf", ".css": "text/css", ".webmanifest": "application/manifest+json" };

export function serve(dir) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    const f = path.join(dir, p);
    fs.readFile(f, (e, data) => {
      if (e) { res.writeHead(404); res.end(); return; }
      if (p === "/index.html") {
        data = Buffer.from(String(data).replace("var game = new gdjs.RuntimeGame(gdjs.projectData, {});",
          "var game = new gdjs.RuntimeGame(gdjs.projectData, {}); window.__game = game;"));
      }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

const BROWSER_ARGS = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required", "--mute-audio"];

async function openPage(browser, url, { width, height }, setup = async () => {}) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
  await setup(context);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__game && window.__game.getSceneStack().getCurrentScene(), null, { timeout: 60000 });
  return new Game(page, errors);
}

export async function launch(dir, { width = 1280, height = 720 } = {}) {
  const server = await serve(dir);
  const browser = await chromium.launch({ args: BROWSER_ARGS });
  const g = await openPage(browser, `http://127.0.0.1:${server.address().port}/index.html`, { width, height });
  g.close = async () => { await browser.close(); server.close(); };
  return g;
}

/**
 * Opens the game the way the Android APK does (tools/android/.../MainActivity.java): the files of `wwwDir` (assets/www
 * extracted from the APK) served at https://appassets.androidplatform.net/, Range requests answered with 206 and
 * any other host blocked. `g.net` counts what was served, ranged, blocked and missing.
 */
export async function launchAsApk(wwwDir, { width = 1280, height = 720 } = {}) {
  const HOST = "appassets.androidplatform.net";
  const net = { served: 0, ranges: 0, blocked: [], missing: [] };
  const browser = await chromium.launch({ args: BROWSER_ARGS });
  const g = await openPage(browser, `https://${HOST}/index.html`, { width, height }, (context) => context.route("**/*", (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.host !== HOST) { net.blocked.push(url.host); return route.fulfill({ status: 403, body: "" }); }
    let p = decodeURIComponent(url.pathname);
    if (p === "/" || p === "") p = "/index.html";
    const f = path.join(wwwDir, p);
    if (!fs.existsSync(f)) { net.missing.push(p); return route.fulfill({ status: 404, body: "" }); }
    let data = fs.readFileSync(f);
    if (p === "/index.html") {
      data = Buffer.from(String(data).replace("var game = new gdjs.RuntimeGame(gdjs.projectData, {});",
        "var game = new gdjs.RuntimeGame(gdjs.projectData, {}); window.__game = game;"));
    }
    const type = TYPES[path.extname(f)] || "application/octet-stream";
    net.served++;
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers()["range"] || "");
    if (!m) return route.fulfill({ status: 200, contentType: type, body: data });
    net.ranges++;
    let start = 0;
    let end = data.length - 1;
    if (m[1]) { start = Number(m[1]); if (m[2]) end = Math.min(Number(m[2]), data.length - 1); } else if (m[2]) start = Math.max(0, data.length - Number(m[2]));
    return route.fulfill({ status: 206, contentType: type, body: data.subarray(start, end + 1),
      headers: { "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${data.length}` } });
  }));
  g.net = net;
  g.close = async () => { await browser.close(); };
  return g;
}

class Game {
  constructor(page, errors) { this.page = page; this.errors = errors; }

  wait(ms) { return this.page.waitForTimeout(ms); }

  /** Evaluate a function in the page with helper `S` = current scene, `G` = game. */
  eval(fn, arg) {
    return this.page.evaluate(({ src, arg }) => {
      const G = window.__game;
      const S = G.getSceneStack().getCurrentScene();
      // eslint-disable-next-line no-new-func
      return new Function("G", "S", "arg", `return (${src})(G, S, arg);`)(G, S, arg);
    }, { src: fn.toString(), arg });
  }

  scene() { return this.eval((G, S) => S.getName()); }

  async waitScene(name, timeout = 20000) {
    await this.page.waitForFunction((n) => {
      const S = window.__game.getSceneStack().getCurrentScene();
      return S && S.getName() === n;
    }, name, { timeout });
    await this.wait(400);
  }

  /** Read a (possibly nested) scene or global variable: "Sala", "Save.Nivel". */
  v(pathStr, global = false) {
    return this.eval((G, S, a) => {
      let v = (a.global ? G.getVariables() : S.getVariables()).get(a.parts[0]);
      for (const p of a.parts.slice(1)) v = v.getChild(p);
      return v.getType() === "string" ? v.getAsString() : v.getAsNumber();
    }, { parts: pathStr.split("."), global });
  }

  setV(pathStr, value, global = false) {
    return this.eval((G, S, a) => {
      let v = (a.global ? G.getVariables() : S.getVariables()).get(a.parts[0]);
      for (const p of a.parts.slice(1)) v = v.getChild(p);
      if (typeof a.value === "string") v.setString(a.value); else v.setNumber(a.value);
    }, { parts: pathStr.split("."), value, global });
  }

  /** Snapshot of instances of an object: position, animation, visibility and variables. */
  objects(name) {
    return this.eval((G, S, n) => S.getObjects(n).map((o) => {
      const vars = {};
      for (const [k, v] of Object.entries(o.getVariables()._variables.items)) vars[k] = v.getType() === "string" ? v.getAsString() : v.getAsNumber();
      return { x: o.getX(), y: o.getY(), w: o.getWidth(), h: o.getHeight(), layer: o.getLayer(), visible: !o.isHidden(),
        anim: o.getAnimationName ? o.getAnimationName() : null, text: o.getText ? o.getText() : null, vars };
    }), name);
  }

  setObjVar(name, varName, value, filter = null) {
    return this.eval((G, S, a) => {
      for (const o of S.getObjects(a.name)) {
        if (a.filter && o.getVariables().get(a.filter[0]).getAsString() !== a.filter[1]) continue;
        const v = o.getVariables().get(a.varName);
        if (typeof a.value === "string") v.setString(a.value); else v.setNumber(a.value);
      }
    }, { name, varName, value, filter });
  }

  setPos(name, x, y) {
    return this.eval((G, S, a) => { for (const o of S.getObjects(a.name)) { o.setX(a.x); if (a.y !== null) o.setY(a.y); } }, { name, x, y: y ?? null });
  }

  /** Page (CSS pixel) coordinates of an object's centre, through its layer camera. */
  async screenPos(name, index = 0) {
    return this.eval((G, S, a) => {
      const o = S.getObjects(a.name)[a.index];
      const layer = S.getLayer(o.getLayer());
      const [cx, cy] = layer.convertInverseCoords(o.getCenterXInScene(), o.getCenterYInScene(), 0);
      const canvas = G.getRenderer().getCanvas();
      const r = canvas.getBoundingClientRect();
      return { x: r.left + cx * r.width / G.getGameResolutionWidth(), y: r.top + cy * r.height / G.getGameResolutionHeight() };
    }, { name, index });
  }

  async clickObject(name, index = 0) {
    const p = await this.screenPos(name, index);
    await this.page.mouse.click(p.x, p.y);
    await this.wait(250);
  }

  async hold(key, ms) {
    await this.page.keyboard.down(key);
    await this.wait(ms);
    await this.page.keyboard.up(key);
  }

  async tap(key) { await this.page.keyboard.press(key); await this.wait(120); }

  /** Multitouch via CDP: list of touch points [{x,y,id}] in CSS pixels. */
  async touch(type, points) {
    if (!this.cdp) this.cdp = await this.page.context().newCDPSession(this.page);
    await this.cdp.send("Input.dispatchTouchEvent", {
      type, touchPoints: points.map((p) => ({ x: p.x, y: p.y, id: p.id ?? 0, radiusX: 4, radiusY: 4, force: 1 })),
    });
  }

  shot(file) { return this.page.screenshot({ path: file }); }
}
