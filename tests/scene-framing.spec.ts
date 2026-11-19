import { expect, test, type Page } from "@playwright/test";
import { SCENE_IDS } from "../src/lib/assets/registry";
import { SCENE_FRAMING, type Box } from "../src/lib/assets/scene-framing";

/**
 * Framing of the 7 life-moment scenes (home page), desktop 1440×900 and mobile 390×844.
 *
 * The face and sachet boxes of src/lib/assets/scene-framing.ts are projected
 * onto the screen with the real rendered geometry (object-fit: cover +
 * object-position read from the browser), then:
 *   1. every face and the sachet must be fully visible inside the photo;
 *   2. the 3D product anchor must not cover any of them;
 *   3. the copy (title, text) must not cover a face or the sachet.
 * A screenshot of each scene is attached to the report and saved in test-results.
 *
 * Reduced motion is emulated so the scroll-scrubbed reveal (clip-path/scale) is
 * off and the geometry is the resting one.
 */

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const intersects = (a: Rect, b: Rect, tolerance = 1) =>
  a.left < b.right - tolerance && b.left < a.right - tolerance && a.top < b.bottom - tolerance && b.top < a.bottom - tolerance;

const inside = (inner: Rect, outer: Rect, tolerance = 1) =>
  inner.left >= outer.left - tolerance &&
  inner.right <= outer.right + tolerance &&
  inner.top >= outer.top - tolerance &&
  inner.bottom <= outer.bottom + tolerance;

async function measure(page: Page, id: string, boxes: Box[]) {
  return page.evaluate(
    ({ id, boxes }) => {
      const section = document.querySelector<HTMLElement>(`[data-scene][data-stage="${id}"]`)!;
      const img = section.querySelector<HTMLImageElement>("[data-scene-image] img")!;
      const media = section.querySelector<HTMLElement>("[data-scene-media]")!;
      const anchor = section.querySelector<HTMLElement>(`[data-stage-anchor="${id}"]`)!;
      const copy = section.querySelector<HTMLElement>("[data-scene-copy]")!;
      const r = img.getBoundingClientRect();
      const scale = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      const [px, py] = getComputedStyle(img)
        .objectPosition.split(" ")
        .map((v) => parseFloat(v) / 100);
      const ox = r.left + (r.width - dw) * px;
      const oy = r.top + (r.height - dh) * py;
      const project = ([x0, y0, x1, y1]: number[]) => ({
        left: ox + (x0 / 100) * dw,
        top: oy + (y0 / 100) * dh,
        right: ox + (x1 / 100) * dw,
        bottom: oy + (y1 / 100) * dh,
      });
      const rect = (el: Element) => {
        const b = el.getBoundingClientRect();
        return { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
      };
      const m = rect(media);
      const visible = {
        left: Math.max(m.left, r.left, 0),
        top: Math.max(m.top, r.top, 0),
        right: Math.min(m.right, r.right, innerWidth),
        bottom: Math.min(m.bottom, r.bottom, innerHeight),
      };
      // Copy = the rendered text lines only (the column box is wider than the words).
      const copyRects = Array.from(copy.querySelectorAll("h3, p")).flatMap((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return Array.from(range.getClientRects())
          .filter((b) => b.width > 0 && b.height > 0)
          .map((b) => ({ left: b.left, top: b.top, right: b.right, bottom: b.bottom }));
      });
      return {
        loaded: img.complete && img.naturalWidth > 0,
        objectPosition: getComputedStyle(img).objectPosition,
        visible,
        anchor: rect(anchor),
        copyRects,
        boxes: boxes.map(project),
      };
    },
    { id, boxes: boxes.map((b) => [...b]) },
  );
}

test.describe("Cadrage des scènes", () => {
  test.use({ colorScheme: "light" });

  for (const id of SCENE_IDS) {
    test(`${id} : visages et sachet visibles, rien de couvert`, async ({ page }, testInfo) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      const section = page.locator(`[data-scene][data-stage="${id}"]`);
      await section.evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
      const img = section.locator("[data-scene-image] img");
      await expect(img).toBeVisible();
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
      // let the header / progress bar settle after the jump
      await page.waitForTimeout(400);

      const framing = SCENE_FRAMING[id];
      const named: { name: string; box: Box }[] = [
        ...framing.faces.map((box, i) => ({ name: `visage ${i + 1}`, box })),
        { name: "sachet", box: framing.sachet },
      ];
      const m = await measure(page, id, named.map((n) => n.box as Box));
      expect(m.loaded, "photo chargée").toBe(true);

      const shotPath = testInfo.outputPath(`${id}-${testInfo.project.name}.png`);
      await page.screenshot({ path: shotPath });
      await testInfo.attach(`${id}-${testInfo.project.name}`, { path: shotPath, contentType: "image/png" });

      const problems: string[] = [];
      m.boxes.forEach((box, i) => {
        const what = named[i].name;
        if (!inside(box, m.visible, 2)) problems.push(`${what} coupé par le cadre`);
        if (intersects(box, m.anchor)) problems.push(`${what} couvert par le produit 3D`);
        if (m.copyRects.some((c) => intersects(box, c))) problems.push(`${what} couvert par le texte`);
      });
      expect(problems, `${id} (${testInfo.project.name}, object-position ${m.objectPosition})`).toEqual([]);
    });
  }
});
