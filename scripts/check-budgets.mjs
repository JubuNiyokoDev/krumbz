#!/usr/bin/env node
/**
 * Budgets de poids (octets transférés sur le réseau, compression comprise).
 *
 *   npm run build && npm run budgets             → lance `next start` sur un port libre
 *   npm run budgets -- --url https://exemple.bi  → mesure un serveur déjà démarré
 *   options : --verbose (10 ressources les plus lourdes par page), --only /,/produits
 *
 * Pour chaque page (toutes les langues actives), dans un navigateur neuf (cache vide) :
 *   1. Initial (avant 3D) : page chargée avec `?mode=static` (la 3D n'est jamais
 *      importée), mesurée jusqu'à l'événement `load`.            Budget : 1,5 Mo
 *   2. Supplément 3D : page chargée avec `?mode=3d`, attente du <canvas> puis du
 *      réseau au repos ; supplément = total 3D − total statique au repos (même
 *      page, mêmes images différées), donc uniquement chunk 3D, modèles,
 *      textures, transcodeur Basis…                              Budget : 3 Mo
 *      Les pages sans <canvas> après 15 s sont notées « — » (pas de 3D).
 * Code de sortie 1 si un budget est dépassé.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const MB = 1024 * 1024;
const BUDGET_INITIAL = 1.5 * MB;
const BUDGET_3D = 3 * MB;
const CANVAS_TIMEOUT = 15_000;
const IDLE_MS = 1500;
const IDLE_TIMEOUT = 45_000;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const verbose = args.includes("--verbose");
const only = arg("--only")?.split(",");

/** Pages from src/i18n/routing.ts (pathnames) and active locales from src/i18n/config.ts. */
function listPages() {
  const { ACTIVE_LOCALES, DEFAULT_LOCALE } = configModule;
  const source = fs.readFileSync(path.join(root, "src/i18n/routing.ts"), "utf8");
  const block = source.slice(source.indexOf("pathnames:"));
  const entries = [...block.matchAll(/"(\/[^"]*)":\s*(?:"([^"]*)"|\{([^}]*)\})/g)];
  const pages = [];
  for (const [, key, plain, localized] of entries) {
    if (only && !only.includes(key)) continue;
    for (const locale of ACTIVE_LOCALES) {
      let p = plain ?? key;
      if (localized) {
        const m = localized.match(new RegExp(`${locale}:\\s*"([^"]*)"`));
        p = m ? m[1] : key;
      }
      const prefixed = locale === DEFAULT_LOCALE ? p : `/${locale}${p === "/" ? "" : p}`;
      pages.push({ key, locale, path: prefixed });
    }
  }
  return pages;
}
const configModule = await import(new URL("../src/i18n/config.ts", import.meta.url).href);

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function startServer() {
  if (!fs.existsSync(path.join(root, ".next/BUILD_ID"))) {
    console.error("✗ Aucun build trouvé : lancer d'abord `npm run build`.");
    process.exit(2);
  }
  const port = await freePort();
  const bin = path.join(root, "node_modules/.bin/next");
  const child = spawn(bin, ["start", "-p", String(port)], { cwd: root, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, PORT: String(port) } });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  const base = `http://localhost:${port}`;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`next start s'est arrêté :\n${log}`);
    try {
      const res = await fetch(`${base}/robots.txt`);
      if (res.ok) return { base, stop: () => child.kill("SIGTERM") };
    } catch {
      /* pas encore prêt */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  child.kill("SIGTERM");
  throw new Error(`next start ne répond pas sur ${base}\n${log}`);
}

/** Records transferred bytes (CDP encodedDataLength) per request. */
async function instrument(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  const urls = new Map();
  const done = [];
  let inflight = 0;
  let lastActivity = Date.now();
  cdp.on("Network.requestWillBeSent", (e) => {
    urls.set(e.requestId, e.request.url);
    inflight++;
    lastActivity = Date.now();
  });
  cdp.on("Network.loadingFinished", (e) => {
    done.push({ url: urls.get(e.requestId) ?? "?", bytes: e.encodedDataLength, t: Date.now() });
    inflight = Math.max(0, inflight - 1);
    lastActivity = Date.now();
  });
  cdp.on("Network.loadingFailed", () => {
    inflight = Math.max(0, inflight - 1);
    lastActivity = Date.now();
  });
  return {
    total: () => done.reduce((s, r) => s + r.bytes, 0),
    count: () => done.length,
    entries: () => [...done],
    async idle() {
      const deadline = Date.now() + IDLE_TIMEOUT;
      while (Date.now() < deadline) {
        if (inflight === 0 && Date.now() - lastActivity >= IDLE_MS) return true;
        await new Promise((r) => setTimeout(r, 100));
      }
      return false;
    },
  };
}

async function measure(browser, url, mode) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const net = await instrument(page);
  const target = `${url}${url.includes("?") ? "&" : "?"}mode=${mode}`;
  const response = await page.goto(target, { waitUntil: "load", timeout: 60_000 });
  const status = response?.status() ?? 0;
  const atLoad = { bytes: net.total(), count: net.count() };
  let hasCanvas = false;
  if (mode === "3d") {
    hasCanvas = await page
      .waitForSelector("canvas", { state: "attached", timeout: CANVAS_TIMEOUT })
      .then(() => true)
      .catch(() => false);
  }
  await net.idle();
  const atIdle = { bytes: net.total(), count: net.count() };
  const entries = net.entries();
  await context.close();
  return { status, atLoad, atIdle, hasCanvas, entries };
}

const kb = (b) => `${(b / 1024).toFixed(0)} Ko`;
const pad = (s, n) => String(s).padEnd(n);

const external = arg("--url");
const server = external ? { base: external.replace(/\/$/, ""), stop: () => {} } : await startServer();
// Playwright's own Chromium when installed (`npx playwright install chromium`), else the system Google Chrome.
const bundled = fs.existsSync(chromium.executablePath());
const browser = await chromium.launch({
  ...(bundled ? {} : { channel: "chrome" }),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const rows = [];
let failed = false;

try {
  for (const p of listPages()) {
    const url = `${server.base}${p.path}`;
    const stat = await measure(browser, url, "static");
    const three = await measure(browser, url, "3d");
    const initial = stat.atLoad.bytes;
    const extra = three.hasCanvas ? Math.max(0, three.atIdle.bytes - stat.atIdle.bytes) : null;
    const overInitial = initial > BUDGET_INITIAL;
    const over3d = extra !== null && extra > BUDGET_3D;
    if (overInitial || over3d) failed = true;
    rows.push({ ...p, status: stat.status, initial, requests: stat.atLoad.count, extra, overInitial, over3d });
    if (verbose) {
      const top = (entries) =>
        entries
          .sort((a, b) => b.bytes - a.bytes)
          .slice(0, 10)
          .map((e) => `      ${pad(kb(e.bytes), 9)} ${e.url.replace(server.base, "")}`)
          .join("\n");
      console.log(`\n${p.path} — initial (?mode=static, jusqu'à load) :\n${top(stat.entries)}`);
      if (three.hasCanvas) {
        const staticUrls = new Set(stat.entries.map((e) => e.url.replace(/[?&]mode=static/, "")));
        const only3d = three.entries.filter((e) => !staticUrls.has(e.url.replace(/[?&]mode=3d/, "")));
        console.log(`${p.path} — ressources propres à la 3D :\n${top(only3d)}`);
      }
    }
  }
} finally {
  await browser.close();
  server.stop();
}

console.log(`\nBudgets — initial ≤ ${kb(BUDGET_INITIAL)} (avant 3D), 3D ≤ ${kb(BUDGET_3D)} (en plus)\n`);
console.log(`${pad("Page", 22)} ${pad("HTTP", 5)} ${pad("Initial", 10)} ${pad("Requêtes", 9)} ${pad("3D en plus", 11)} Résultat`);
console.log("-".repeat(72));
for (const r of rows) {
  const verdict = r.overInitial || r.over3d ? `✗ ${[r.overInitial && "initial", r.over3d && "3D"].filter(Boolean).join(" + ")} hors budget` : "✓";
  console.log(
    `${pad(r.path, 22)} ${pad(r.status, 5)} ${pad(kb(r.initial), 10)} ${pad(r.requests, 9)} ${pad(r.extra === null ? "—" : kb(r.extra), 11)} ${verdict}`,
  );
}
const notOk = rows.filter((r) => r.status !== 200);
if (notOk.length) console.log(`\n⚠ ${notOk.length} page(s) ne répondent pas 200 : ${notOk.map((r) => r.path).join(", ")}`);
if (failed) {
  console.error("\n✗ Budget dépassé.");
  process.exit(1);
}
console.log("\n✓ Tous les budgets sont respectés.");
