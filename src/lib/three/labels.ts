/**
 * Procedural Krumbz packaging, drawn on canvas when the brand label PNGs are
 * not provided yet (/textures/sachet-front.png, sachet-back.png, carton-label.png).
 * Every text comes from the content file (brand namespace), passed in by the caller.
 */
export interface BrandTexts {
  name: string;
  tagline: string;
  base: string;
  origin: string;
  company: string;
  promise: string;
}

const C = {
  cream: "#fff6e8",
  creamDeep: "#f6e6c8",
  gold: "#e2a23a",
  goldLight: "#f3c76b",
  goldDark: "#b97a1c",
  rust: "#a4501a",
  rustBright: "#d2691e",
  navy: "#12264a",
  navySoft: "#1e3a66",
};

/** Height of each crimped seal on the sachet label, in label pixels (matches the geometry). */
const SEAL_RATIO = 0.105 / 1.5;

let fontsPromise: Promise<{ display: string; sans: string }> | null = null;

/** Resolves the next/font families (Fredoka, Nunito) and waits for them to be usable on canvas. */
export function loadLabelFonts(): Promise<{ display: string; sans: string }> {
  fontsPromise ??= (async () => {
    const style = getComputedStyle(document.documentElement);
    const display = style.getPropertyValue("--font-fredoka").trim() || "Fredoka, ui-rounded, sans-serif";
    const sans = style.getPropertyValue("--font-nunito").trim() || "Nunito, ui-rounded, sans-serif";
    try {
      await Promise.all([
        document.fonts.load(`700 64px ${display}`),
        document.fonts.load(`600 64px ${display}`),
        document.fonts.load(`800 64px ${sans}`),
        document.fonts.load(`700 64px ${sans}`),
      ]);
    } catch {
      /* system fallback fonts are acceptable */
    }
    return { display, sans };
  })();
  return fontsPromise;
}

type Ctx = CanvasRenderingContext2D;
type Fonts = { display: string; sans: string };

function canvas(width: number, height: number) {
  const el = document.createElement("canvas");
  el.width = width;
  el.height = height;
  const ctx = el.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return { el, ctx };
}

/** Deterministic pseudo-random generator so the label is identical on every load. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fitFont(ctx: Ctx, text: string, weight: number, family: string, maxSize: number, maxWidth: number) {
  let size = maxSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function wrap(ctx: Ctx, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** The Krumbz wordmark: rounded display type, cream fill, navy outline, rust drop. */
function wordmark(ctx: Ctx, fonts: Fonts, text: string, cx: number, cy: number, maxWidth: number, maxSize: number, angle = -0.06) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const size = fitFont(ctx, text, 700, fonts.display, maxSize, maxWidth);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  // drop
  ctx.fillStyle = C.rust;
  ctx.strokeStyle = C.rust;
  ctx.lineWidth = size * 0.16;
  ctx.strokeText(text, size * 0.035, size * 0.06);
  ctx.fillText(text, size * 0.035, size * 0.06);
  // outline + fill
  ctx.strokeStyle = C.navy;
  ctx.lineWidth = size * 0.14;
  ctx.strokeText(text, 0, 0);
  const grad = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
  grad.addColorStop(0, "#fffdf7");
  grad.addColorStop(1, C.creamDeep);
  ctx.fillStyle = grad;
  ctx.fillText(text, 0, 0);
  ctx.restore();
  return size;
}

/** Draws a biscuit: the baked colour map when available, a painted disc otherwise. */
function biscuit(ctx: Ctx, image: CanvasImageSource | null, cx: number, cy: number, r: number, angle: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  // soft shadow
  ctx.shadowColor = "rgba(90, 40, 10, 0.45)";
  ctx.shadowBlur = r * 0.18;
  ctx.shadowOffsetY = r * 0.08;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = "#c98a3e";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.clip();
  if (image) {
    ctx.drawImage(image, -r, -r, r * 2, r * 2);
  } else {
    const g = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
    g.addColorStop(0, "#f2c983");
    g.addColorStop(0.75, "#e0a656");
    g.addColorStop(1, "#b9722e");
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
  }
  // rim light + edge toast
  const rim = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r);
  rim.addColorStop(0, "rgba(120,60,15,0)");
  rim.addColorStop(1, "rgba(120,60,15,0.35)");
  ctx.fillStyle = rim;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

/** Line-art biscuit (gold strokes) used as a watermark on dark backgrounds. */
function biscuitOutline(ctx: Ctx, cx: number, cy: number, r: number, angle: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.strokeStyle = C.gold;
  ctx.fillStyle = C.gold;
  ctx.lineWidth = r * 0.03;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const rr = r * (0.8 + 0.015 * Math.cos(a * 36));
    if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.stroke();
  for (const [x, y] of [
    [-0.36, -0.42], [-0.12, -0.42], [0.12, -0.42], [0.36, -0.42],
    [-0.24, -0.25], [0, -0.25], [0.24, -0.25],
    [-0.24, 0.25], [0, 0.25], [0.24, 0.25],
    [-0.36, 0.42], [-0.12, 0.42], [0.12, 0.42], [0.36, 0.42],
  ]) {
    ctx.beginPath();
    ctx.arc(x * r, y * r, r * 0.028, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function crumbs(ctx: Ctx, random: () => number, x: number, y: number, w: number, h: number, count: number, scale: number) {
  for (let i = 0; i < count; i++) {
    const cx = x + random() * w;
    const cy = y + random() * h;
    const r = (3 + random() * 9) * scale;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(random() * Math.PI);
    ctx.beginPath();
    const sides = 5 + Math.floor(random() * 3);
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2;
      const rr = r * (0.6 + random() * 0.5);
      if (k === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = random() > 0.5 ? "#d99a4a" : "#c07a30";
    ctx.fill();
    ctx.restore();
  }
}

/** Small mushroom pictogram (the biscuit's base ingredient). */
function mushroom(ctx: Ctx, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-size * 0.62, 0);
  ctx.bezierCurveTo(-size * 0.62, -size * 0.75, size * 0.62, -size * 0.75, size * 0.62, 0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-size * 0.17, -size * 0.02, size * 0.34, size * 0.5, size * 0.12);
  ctx.fill();
  ctx.restore();
}

function seal(ctx: Ctx, y: number, width: number, height: number, color: string, accent: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, y, width, height);
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 4;
  for (let i = 0; i < 2; i++) {
    const yy = y + height * (0.3 + i * 0.4);
    ctx.beginPath();
    ctx.moveTo(0, yy);
    ctx.lineTo(width, yy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function goldBackground(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, C.goldLight);
  g.addColorStop(0.55, C.gold);
  g.addColorStop(1, "#cf8a27");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // sun rays from behind the biscuits
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(x + w * 0.55, y + h * 0.66);
  ctx.fillStyle = "rgba(255, 246, 232, 0.13)";
  for (let i = 0; i < 18; i++) {
    ctx.rotate((Math.PI * 2) / 18);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.max(w, h), -Math.max(w, h) * 0.09);
    ctx.lineTo(Math.max(w, h), Math.max(w, h) * 0.09);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // printed dot texture
  const random = rng(seed);
  ctx.fillStyle = "rgba(164, 80, 26, 0.10)";
  for (let i = 0; i < 260; i++) {
    ctx.beginPath();
    ctx.arc(x + random() * w, y + random() * h, 2 + random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function pill(ctx: Ctx, fonts: Fonts, text: string, cx: number, cy: number, maxWidth: number, size: number, bg: string, fg: string) {
  const fontSize = fitFont(ctx, text, 800, fonts.sans, size, maxWidth - size * 1.2);
  const w = ctx.measureText(text).width + fontSize * 1.3;
  const h = fontSize * 1.75;
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy + fontSize * 0.04);
}

function badge(ctx: Ctx, fonts: Fonts, text: string, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.14);
  ctx.shadowColor = "rgba(18, 38, 74, 0.35)";
  ctx.shadowBlur = r * 0.15;
  ctx.shadowOffsetY = r * 0.05;
  ctx.beginPath();
  // scalloped seal
  const n = 22;
  for (let i = 0; i <= n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const rr = i % 2 ? r : r * 0.93;
    if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = C.rust;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = C.goldLight;
  ctx.lineWidth = r * 0.03;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
  ctx.stroke();
  mushroom(ctx, 0, -r * 0.34, r * 0.42, C.cream);
  ctx.fillStyle = C.cream;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fontSize = r * 0.2;
  ctx.font = `800 ${fontSize}px ${fonts.sans}`;
  const lines = wrap(ctx, text, r * 1.3).slice(0, 3);
  lines.forEach((line, i) => {
    const size = fitFont(ctx, line, 800, fonts.sans, fontSize, r * 1.35);
    ctx.font = `800 ${size}px ${fonts.sans}`;
    ctx.fillText(line, 0, r * 0.12 + (i - (lines.length - 1) / 2) * fontSize * 1.05 + fontSize * 0.5);
  });
  ctx.restore();
}

/** Front of the procedural sachet (1024 × 1536, ratio 2:3). */
export function drawSachetFront(brand: BrandTexts, fonts: Fonts, biscuitImage: CanvasImageSource | null): HTMLCanvasElement {
  const W = 1024;
  const H = 1536;
  const { el, ctx } = canvas(W, H);
  const sealH = Math.round(H * SEAL_RATIO);
  goldBackground(ctx, 0, 0, W, H, 11);

  // cream wave behind the wordmark
  ctx.fillStyle = C.cream;
  ctx.beginPath();
  ctx.moveTo(0, sealH + 90);
  ctx.bezierCurveTo(W * 0.3, sealH + 20, W * 0.7, sealH + 170, W, sealH + 70);
  ctx.lineTo(W, sealH + 520);
  ctx.bezierCurveTo(W * 0.68, sealH + 610, W * 0.32, sealH + 470, 0, sealH + 560);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C.goldDark;
  ctx.lineWidth = 6;
  ctx.stroke();

  // The slogan « Simple, Croustillant » is printed on the carton only, not on the sachet.
  wordmark(ctx, fonts, brand.name, W / 2, sealH + 320, W * 0.84, 260);

  // biscuits + crumbs
  const random = rng(5);
  crumbs(ctx, random, 80, 820, W - 160, 520, 26, 1.4);
  biscuit(ctx, biscuitImage, W * 0.34, H * 0.73, 215, -0.5);
  biscuit(ctx, biscuitImage, W * 0.6, H * 0.665, 285, 0.22);

  badge(ctx, fonts, brand.base, W * 0.8, H * 0.47, 128);

  // origin ribbon
  ctx.fillStyle = C.navy;
  const ribbonY = H - sealH - 120;
  ctx.fillRect(0, ribbonY, W, 82);
  ctx.fillStyle = C.goldLight;
  ctx.fillRect(0, ribbonY - 8, W, 8);
  ctx.fillRect(0, ribbonY + 82, W, 8);
  const originSize = fitFont(ctx, brand.origin, 800, fonts.sans, 44, W * 0.86);
  ctx.font = `800 ${originSize}px ${fonts.sans}`;
  ctx.fillStyle = C.cream;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(brand.origin, W / 2, ribbonY + 43);

  seal(ctx, 0, W, sealH, C.navy, C.goldLight);
  seal(ctx, H - sealH, W, sealH, C.navy, C.goldLight);
  return el;
}

/** Back of the procedural sachet (1024 × 1536). */
export function drawSachetBack(brand: BrandTexts, fonts: Fonts): HTMLCanvasElement {
  const W = 1024;
  const H = 1536;
  const { el, ctx } = canvas(W, H);
  const sealH = Math.round(H * SEAL_RATIO);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.navySoft);
  g.addColorStop(1, C.navy);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // faint line-art biscuit watermark
  ctx.save();
  ctx.globalAlpha = 0.22;
  biscuitOutline(ctx, W * 0.8, H * 0.8, 330, 0.4);
  ctx.restore();

  ctx.save();
  ctx.translate(W / 2, sealH + 190);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const size = fitFont(ctx, brand.name, 700, fonts.display, 150, W * 0.7);
  ctx.font = `700 ${size}px ${fonts.display}`;
  ctx.fillStyle = C.gold;
  ctx.fillText(brand.name, 0, 0);
  ctx.restore();

  // promise paragraph
  ctx.fillStyle = C.cream;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 54px ${fonts.sans}`;
  const lines = wrap(ctx, brand.promise, W * 0.78);
  let y = sealH + 380;
  for (const line of lines) {
    ctx.fillText(line, W * 0.11, y);
    y += 70;
  }

  // facts with gold bullets
  y += 50;
  ctx.font = `800 44px ${fonts.sans}`;
  for (const fact of [brand.base, brand.origin]) {
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    ctx.arc(W * 0.13, y - 14, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.creamDeep;
    const factSize = fitFont(ctx, fact, 800, fonts.sans, 44, W * 0.72);
    ctx.font = `800 ${factSize}px ${fonts.sans}`;
    ctx.fillText(fact, W * 0.18, y);
    y += 78;
  }

  // company line
  ctx.fillStyle = C.goldLight;
  ctx.textAlign = "center";
  const companySize = fitFont(ctx, brand.company, 700, fonts.sans, 40, W * 0.8);
  ctx.font = `700 ${companySize}px ${fonts.sans}`;
  ctx.fillText(brand.company, W / 2, H - sealH - 70);

  seal(ctx, 0, W, sealH, C.gold, C.navy);
  seal(ctx, H - sealH, W, sealH, C.gold, C.navy);
  return el;
}

/** Unfolded carton label (2048 × 1024): left half front, right half back. */
export function drawCartonLabel(brand: BrandTexts, fonts: Fonts, biscuitImage: CanvasImageSource | null): HTMLCanvasElement {
  const S = 1024;
  const { el, ctx } = canvas(S * 2, S);

  // ---- front -------------------------------------------------------------
  goldBackground(ctx, 0, 0, S, S, 3);
  ctx.fillStyle = C.navy;
  ctx.fillRect(0, 0, S, 70);
  ctx.fillRect(0, S - 70, S, 70);
  ctx.fillStyle = C.cream;
  ctx.beginPath();
  ctx.moveTo(0, 110);
  ctx.bezierCurveTo(S * 0.35, 60, S * 0.65, 190, S, 100);
  ctx.lineTo(S, 420);
  ctx.bezierCurveTo(S * 0.62, 500, S * 0.36, 380, 0, 450);
  ctx.closePath();
  ctx.fill();
  wordmark(ctx, fonts, brand.name, S / 2, 250, S * 0.78, 220);
  pill(ctx, fonts, brand.tagline, S / 2, 430, S * 0.74, 44, C.navy, C.cream);
  const random = rng(17);
  crumbs(ctx, random, 60, 560, S - 120, 360, 20, 1.2);
  biscuit(ctx, biscuitImage, S * 0.32, S * 0.74, 175, -0.4);
  biscuit(ctx, biscuitImage, S * 0.6, S * 0.7, 215, 0.3);
  badge(ctx, fonts, brand.base, S * 0.84, S * 0.6, 112);
  ctx.fillStyle = C.cream;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const originSize = fitFont(ctx, brand.origin, 800, fonts.sans, 40, S * 0.8);
  ctx.font = `800 ${originSize}px ${fonts.sans}`;
  ctx.fillText(brand.origin, S / 2, S - 35);

  // ---- back --------------------------------------------------------------
  const g = ctx.createLinearGradient(S, 0, S, S);
  g.addColorStop(0, C.navySoft);
  g.addColorStop(1, C.navy);
  ctx.fillStyle = g;
  ctx.fillRect(S, 0, S, S);
  ctx.fillStyle = C.gold;
  ctx.fillRect(S, 0, S, 70);
  ctx.fillRect(S, S - 70, S, 70);
  ctx.save();
  ctx.globalAlpha = 0.22;
  biscuitOutline(ctx, S * 1.8, S * 0.74, 280, 0.2);
  ctx.restore();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const nameSize = fitFont(ctx, brand.name, 700, fonts.display, 140, S * 0.6);
  ctx.font = `700 ${nameSize}px ${fonts.display}`;
  ctx.fillStyle = C.gold;
  ctx.fillText(brand.name, S * 1.5, 200);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 48px ${fonts.sans}`;
  ctx.fillStyle = C.cream;
  let y = 360;
  for (const line of wrap(ctx, brand.promise, S * 0.78)) {
    ctx.fillText(line, S * 1.11, y);
    y += 64;
  }
  y += 40;
  for (const fact of [brand.base, brand.origin]) {
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    ctx.arc(S * 1.13, y - 13, 12, 0, Math.PI * 2);
    ctx.fill();
    const factSize = fitFont(ctx, fact, 800, fonts.sans, 42, S * 0.72);
    ctx.font = `800 ${factSize}px ${fonts.sans}`;
    ctx.fillStyle = C.creamDeep;
    ctx.fillText(fact, S * 1.18, y);
    y += 72;
  }
  ctx.fillStyle = C.navy;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const companySize = fitFont(ctx, brand.company, 800, fonts.sans, 38, S * 0.8);
  ctx.font = `800 ${companySize}px ${fonts.sans}`;
  ctx.fillText(brand.company, S * 1.5, S - 35);
  return el;
}

/**
 * Cardboard texture for the carton caps (flap seam) and sides, tinted with
 * the label's dominant colour.
 */
export function drawCartonBoard(color: string, withFlaps: boolean): HTMLCanvasElement {
  const S = 512;
  const { el, ctx } = canvas(S, S);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, S, S);
  const random = rng(withFlaps ? 41 : 43);
  // printed board grain
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = random() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
    ctx.fillRect(random() * S, random() * S, 1 + random() * 3, 1 + random() * 2);
  }
  if (withFlaps) {
    // two flaps meeting in the middle + dust flaps outline
    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, S / 2);
    ctx.lineTo(S, S / 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, S / 2 + 3);
    ctx.lineTo(S, S / 2 + 3);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 2;
    ctx.strokeRect(S * 0.04, S * 0.06, S * 0.92, S * 0.88);
  }
  return el;
}
