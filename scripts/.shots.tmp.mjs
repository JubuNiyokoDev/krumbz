// Usage: node shots.mjs <outDir> <port> [slugs...]
import { chromium } from "playwright";
const [outDir, port, ...slugs] = process.argv.slice(2);
const views = [
  { name: "desktop", width: 1440, height: 900, isMobile: false },
  { name: "mobile", width: 390, height: 844, isMobile: true },
];
const browser = await chromium.launch({ channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const slug of slugs.length ? slugs : ["krumbz", "ikirenge"]) {
  for (const v of views) {
    const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, isMobile: v.isMobile, hasTouch: v.isMobile, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    for (const path of ["/", "/produits", "/notre-histoire"]) {
      const res = await page.goto(`http://${slug}.localhost:${port}${path}`, { waitUntil: "networkidle", timeout: 180000 });
      await page.waitForTimeout(2500);
      const tag = path === "/" ? "home" : path.slice(1);
      if (res?.status() !== 200) { console.log(slug, v.name, path, res?.status()); continue; }
      if (path === "/") {
        const total = await page.evaluate(() => document.documentElement.scrollHeight);
        const stops = [0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 1];
        for (const [i, f] of stops.entries()) {
          await page.evaluate((y) => window.scrollTo(0, y), Math.round(f * (total - v.height)));
          await page.waitForTimeout(1200);
          await page.screenshot({ path: `${outDir}/${slug}-${v.name}-${tag}-${i}.png` });
        }
      } else {
        await page.screenshot({ path: `${outDir}/${slug}-${v.name}-${tag}.png` });
      }
    }
    console.log(slug, v.name, "console errors:", errors.length, errors.slice(0, 3).join(" | ").slice(0, 400));
    await ctx.close();
  }
}
await browser.close();
