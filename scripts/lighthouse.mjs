#!/usr/bin/env node
/**
 * Audit Lighthouse (profil mobile, 4G lente simulée) de chaque page.
 *
 *   npm run build && npm run start          (dans un autre terminal)
 *   npm run lighthouse                      → http://localhost:3000
 *   npm run lighthouse -- --url https://krumbz.bi
 *   options : --only /,/produits  --all-locales (pages anglaises aussi)
 *             --chrome /chemin/vers/chrome (défaut : $CHROME_PATH ou /usr/bin/google-chrome)
 *
 * Rapports JSON + HTML dans reports/lighthouse/. Affiche les scores
 * Performance / Accessibilité / Bonnes pratiques / SEO, LCP, CLS, TBT.
 * Code de sortie 1 si une page a un LCP > 2 500 ms ou une accessibilité < 95.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import lighthouse from "lighthouse";
import { screenEmulationMetrics, throttling, userAgents } from "lighthouse/core/config/constants.js";
import * as chromeLauncher from "chrome-launcher";

const LCP_MAX_MS = 2500;
const A11Y_MIN = 95;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "reports/lighthouse");
const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const base = (arg("--url") ?? "http://localhost:3000").replace(/\/$/, "");
const only = arg("--only")?.split(",");
const allLocales = args.includes("--all-locales");
const chromePath = arg("--chrome") ?? process.env.CHROME_PATH ?? "/usr/bin/google-chrome";

const { ACTIVE_LOCALES, DEFAULT_LOCALE } = await import(new URL("../src/i18n/config.ts", import.meta.url).href);

/** Pages from src/i18n/routing.ts (pathnames). */
function listPages() {
  const source = fs.readFileSync(path.join(root, "src/i18n/routing.ts"), "utf8");
  const block = source.slice(source.indexOf("pathnames:"));
  const entries = [...block.matchAll(/"(\/[^"]*)":\s*(?:"([^"]*)"|\{([^}]*)\})/g)];
  const locales = allLocales ? ACTIVE_LOCALES : [DEFAULT_LOCALE];
  const pages = [];
  for (const [, key, plain, localized] of entries) {
    if (only && !only.includes(key)) continue;
    for (const locale of locales) {
      let p = plain ?? key;
      if (localized) p = localized.match(new RegExp(`${locale}:\\s*"([^"]*)"`))?.[1] ?? key;
      pages.push(locale === DEFAULT_LOCALE ? p : `/${locale}${p === "/" ? "" : p}`);
    }
  }
  return pages;
}

/** Explicit mobile profile (same as Lighthouse's default), so the run never depends on defaults. */
const config = {
  extends: "lighthouse:default",
  settings: {
    formFactor: "mobile",
    screenEmulation: screenEmulationMetrics.mobile,
    emulatedUserAgent: userAgents.mobile,
    throttlingMethod: "simulate",
    throttling: throttling.mobileSlow4G,
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
  },
};

try {
  const res = await fetch(base, { method: "HEAD" });
  if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
} catch (e) {
  console.error(`✗ Serveur injoignable sur ${base} (${e.message}). Lancer \`npm run build && npm run start\` ou passer --url.`);
  process.exit(2);
}

fs.mkdirSync(outDir, { recursive: true });
const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ["--headless=new", "--disable-dev-shm-usage"] });
const rows = [];
let failed = false;

try {
  for (const pagePath of listPages()) {
    const url = `${base}${pagePath}`;
    process.stdout.write(`… ${url}\n`);
    const result = await lighthouse(url, { port: chrome.port, output: ["json", "html"], logLevel: "error" }, config);
    if (!result) throw new Error(`Lighthouse n'a rien renvoyé pour ${url}`);
    const { lhr, report } = result;
    const slug = pagePath === "/" ? "accueil" : pagePath.replace(/^\//, "").replace(/\//g, "_");
    const [json, html] = Array.isArray(report) ? report : [report, ""];
    fs.writeFileSync(path.join(outDir, `${slug}.report.json`), json);
    if (html) fs.writeFileSync(path.join(outDir, `${slug}.report.html`), html);

    const score = (id) => (lhr.categories[id]?.score == null ? null : Math.round(lhr.categories[id].score * 100));
    const audit = (id) => lhr.audits[id]?.numericValue ?? null;
    const row = {
      page: pagePath,
      status: lhr.runtimeError ? `erreur ${lhr.runtimeError.code}` : "ok",
      perf: score("performance"),
      a11y: score("accessibility"),
      bp: score("best-practices"),
      seo: score("seo"),
      lcp: audit("largest-contentful-paint"),
      cls: audit("cumulative-layout-shift"),
      tbt: audit("total-blocking-time"),
    };
    row.problems = [
      lhr.runtimeError && `erreur ${lhr.runtimeError.code}`,
      row.lcp === null || row.lcp > LCP_MAX_MS ? `LCP > ${LCP_MAX_MS} ms` : null,
      row.a11y === null || row.a11y < A11Y_MIN ? `accessibilité < ${A11Y_MIN}` : null,
    ].filter(Boolean);
    if (row.problems.length) failed = true;
    rows.push(row);
  }
} finally {
  chrome.kill();
}

const pad = (s, n) => String(s ?? "—").padEnd(n);
const ms = (v) => (v === null ? "—" : `${Math.round(v)} ms`);
console.log(`\nLighthouse — mobile, 4G lente simulée — ${base}\n`);
console.log(`${pad("Page", 24)} ${pad("Perf", 5)} ${pad("A11y", 5)} ${pad("BP", 5)} ${pad("SEO", 5)} ${pad("LCP", 9)} ${pad("CLS", 6)} ${pad("TBT", 8)} Résultat`);
console.log("-".repeat(90));
for (const r of rows) {
  console.log(
    `${pad(r.page, 24)} ${pad(r.perf, 5)} ${pad(r.a11y, 5)} ${pad(r.bp, 5)} ${pad(r.seo, 5)} ${pad(ms(r.lcp), 9)} ${pad(r.cls === null ? "—" : r.cls.toFixed(3), 6)} ${pad(ms(r.tbt), 8)} ${r.problems.length ? `✗ ${r.problems.join(", ")}` : "✓"}`,
  );
}
console.log(`\nRapports : ${path.relative(root, outDir)}/`);
if (failed) {
  console.error(`✗ Seuils non atteints (LCP ≤ ${LCP_MAX_MS} ms, accessibilité ≥ ${A11Y_MIN}).`);
  process.exit(1);
}
console.log("✓ Seuils respectés.");
