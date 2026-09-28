// Builds an installable APK of the HTML5 export without Android Studio or Google's SDK downloader: a minimal
// full-screen WebView activity (tools/android) that runs builds/web from assets/www.
//
//   node export.mjs web && node build_apk.mjs   -> builds/UmbralDeCeniza-<version>.apk
//
// Requirements: JDK 11+ (javac, keytool), Python 3 + Pillow, and the Android build tools aapt2, zipalign,
// apksigner and d8 or dx. With an Android SDK they are taken from $ANDROID_HOME/build-tools/<newest>; on
// Ubuntu/Debian: `sudo apt install aapt apksigner zipalign dalvik-exchange`.
// android.jar (API 34): $ANDROID_JAR, else $ANDROID_HOME/platforms/android-34/android.jar, else downloaded once
// (pinned SHA-256) from the Sable/android-platforms mirror into builds/android-apk/sdk/.
// Signing (v2 + v3; v1 is useless with minSdk 24): $APK_KEYSTORE (PKCS12; $APK_KEYSTORE_PASS, $APK_KEY_ALIAS),
// else a debug key created on first use in ~/.android/umbral-debug.p12. Updating an installed APK requires the
// same key.
//
// This is a test/sideload build. GDevelop's own Android export (Cordova, `node export.mjs cordova`) remains the
// path for Google Play.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const WEB = path.join(ROOT, "builds", "web");
const WORK = path.join(ROOT, "builds", "android-apk");
const TMP = path.join(WORK, "tmp");
const SRC = path.join(HERE, "android");
const MIN_SDK = 24; // Android 7.0
const TARGET_SDK = 34; // 35 would force edge-to-edge and draw the HUD under the camera cutout
const JAR_URL = "https://raw.githubusercontent.com/Sable/android-platforms/master/android-34/android.jar";
const JAR_SHA256 = "6cea1df3efb77103ac3e2beb9bf4718964b0e0869ab16d39d29d5cbae1c147ad";

const log = (m) => console.log(`[apk] ${m}`);

function run(cmd, args) {
  try {
    return execFileSync(cmd, args.map(String), { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    throw new Error(`${cmd} ${args.join(" ")}\n${e.stdout || ""}${e.stderr || ""}`);
  }
}

function which(name) {
  try { return execFileSync("which", [name], { encoding: "utf8" }).trim() || null; } catch { return null; }
}

const sdkHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "";

function buildTool(name) {
  const dir = path.join(sdkHome, "build-tools");
  if (sdkHome && fs.existsSync(dir)) {
    const byVersion = (a, b) => b.localeCompare(a, undefined, { numeric: true });
    for (const v of fs.readdirSync(dir).sort(byVersion)) {
      const p = path.join(dir, v, name);
      if (fs.existsSync(p)) return p;
    }
  }
  return which(name);
}

function need(tool, name, hint) {
  if (!tool) throw new Error(`${name} not found. ${hint}`);
  return tool;
}

function androidJar() {
  if (process.env.ANDROID_JAR) return process.env.ANDROID_JAR;
  const fromSdk = path.join(sdkHome, "platforms", "android-34", "android.jar");
  if (sdkHome && fs.existsSync(fromSdk)) return fromSdk;
  const cached = path.join(WORK, "sdk", "android-34.jar");
  if (!fs.existsSync(cached)) {
    fs.mkdirSync(path.dirname(cached), { recursive: true });
    log(`downloading android.jar (API 34) from ${JAR_URL}`);
    run("curl", ["-sSfL", "-m", "600", "-o", `${cached}.part`, JAR_URL]);
    fs.renameSync(`${cached}.part`, cached);
  }
  const sha = crypto.createHash("sha256").update(fs.readFileSync(cached)).digest("hex");
  if (sha !== JAR_SHA256) {
    fs.rmSync(cached);
    throw new Error(`android.jar SHA-256 mismatch (${sha}); deleted, run again`);
  }
  return cached;
}

function filesUnder(dir, ext) {
  return fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith(ext)).map((f) => path.join(dir, f));
}

function signingKey() {
  const ks = process.env.APK_KEYSTORE || path.join(os.homedir(), ".android", "umbral-debug.p12");
  const pass = process.env.APK_KEYSTORE_PASS || "android";
  const alias = process.env.APK_KEY_ALIAS || "umbral";
  if (!fs.existsSync(ks)) {
    if (process.env.APK_KEYSTORE) throw new Error(`keystore ${ks} not found`);
    fs.mkdirSync(path.dirname(ks), { recursive: true });
    run("keytool", ["-genkeypair", "-keystore", ks, "-storetype", "PKCS12", "-storepass", pass, "-keypass", pass,
      "-alias", alias, "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000",
      "-dname", "CN=Umbral de Ceniza (debug), O=Umbral de Ceniza"]);
    log(`created debug signing key ${ks}`);
  }
  return { ks, pass, alias };
}

function main() {
  if (!fs.existsSync(path.join(WEB, "index.html"))) throw new Error("builds/web is missing: run `node export.mjs web` first");
  const props = JSON.parse(fs.readFileSync(path.join(ROOT, "source", "game.json"), "utf8")).properties;
  const version = props.version;
  const [major, minor, patch] = version.split(".").map(Number);
  const versionCode = major * 10000 + minor * 100 + patch;

  const apt = "Install an Android SDK (build-tools) or, on Ubuntu/Debian: sudo apt install aapt apksigner zipalign dalvik-exchange";
  const aapt2 = need(buildTool("aapt2"), "aapt2", apt);
  const zipalign = need(buildTool("zipalign"), "zipalign", apt);
  const apksigner = need(buildTool("apksigner"), "apksigner", apt);
  const d8 = buildTool("d8");
  const dx = d8 ? null : need(which("dalvik-exchange") || buildTool("dx"), "d8/dx", apt);
  need(which("javac"), "javac", "Install a JDK 11 or newer.");
  const jar = androidJar();

  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });

  // 1. Resources and manifest (aapt2)
  const res = path.join(TMP, "res");
  fs.cpSync(path.join(SRC, "res"), res, { recursive: true });
  log(run("python3", [path.join(SRC, "iconos.py"), res]).trim());
  run(aapt2, ["compile", "--dir", res, "-o", path.join(TMP, "res.zip")]);
  const base = path.join(TMP, "base.apk");
  run(aapt2, ["link", "-o", base, "-I", jar, "--manifest", path.join(SRC, "AndroidManifest.xml"),
    "--min-sdk-version", MIN_SDK, "--target-sdk-version", TARGET_SDK,
    "--version-code", versionCode, "--version-name", version, path.join(TMP, "res.zip")]);

  // 2. Code: javac (Java 8 bytecode against android.jar) + d8/dx
  const classes = path.join(TMP, "classes");
  run("javac", ["-source", "8", "-target", "8", "-bootclasspath", jar, "-Xlint:-options", "-encoding", "UTF-8",
    "-d", classes, ...filesUnder(path.join(SRC, "java"), ".java")]);
  const dexDir = path.join(TMP, "dex");
  fs.mkdirSync(dexDir);
  if (d8) run(d8, ["--release", "--min-api", MIN_SDK, "--lib", jar, "--output", dexDir, ...filesUnder(classes, ".class")]);
  else run(dx, ["--dex", `--min-sdk-version=${MIN_SDK}`, `--output=${path.join(dexDir, "classes.dex")}`, classes]);

  // 3. Package, align, sign
  const unsigned = path.join(TMP, "unsigned.apk");
  log(run("python3", [path.join(SRC, "empaquetar.py"), base, path.join(dexDir, "classes.dex"), WEB, unsigned]).trim());
  const aligned = path.join(TMP, "aligned.apk");
  run(zipalign, ["-f", "4", unsigned, aligned]);
  const out = path.join(ROOT, "builds", `UmbralDeCeniza-${version}.apk`);
  const key = signingKey();
  run(apksigner, ["sign", "--ks", key.ks, "--ks-pass", `pass:${key.pass}`, "--ks-key-alias", key.alias,
    "--key-pass", `pass:${key.pass}`, "--v1-signing-enabled", "false", "--v2-signing-enabled", "true",
    "--v3-signing-enabled", "true", "--v4-signing-enabled", "false", "--out", out, aligned]);

  // 4. Verify what was produced
  const verify = run(apksigner, ["verify", "--verbose", out]);
  const schemes = verify.split("\n").filter((l) => /^Verified using v\d.*true/.test(l)).map((l) => l.match(/v\d/)[0]);
  run(zipalign, ["-c", "4", out]);
  const badging = run(aapt2, ["dump", "badging", out]).split("\n");
  const pick = (prefix) => (badging.find((l) => l.startsWith(prefix)) || "").trim();
  log(pick("package:"));
  log(`${pick("sdkVersion:")} ${pick("targetSdkVersion:")} ${pick("application-label:")}`);
  log(pick("launchable-activity:"));
  const sha = crypto.createHash("sha256").update(fs.readFileSync(out)).digest("hex");
  log(`signed (${schemes.join(", ")}) and 4-byte aligned: ${path.relative(ROOT, out)} ` +
    `(${(fs.statSync(out).size / 1e6).toFixed(1)} MB, sha256 ${sha.slice(0, 16)}…)`);
}

try {
  main();
} catch (e) {
  console.error(`[apk] ERROR: ${e.message}`);
  process.exit(1);
}
