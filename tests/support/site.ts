import { expect, type ConsoleMessage, type Page } from "@playwright/test";
import { routing, type AppPathname } from "../../src/i18n/routing";
import { DEFAULT_LOCALE, type Locale } from "../../src/i18n/config";
import { loadContent, type SiteContent } from "../../src/lib/content";

/**
 * Test helpers. Selectors are built from roles and from the content files
 * (content/site.*.json via loadContent) — never from CSS classes.
 */
export const LOCALES = routing.locales as readonly Locale[];
export const content = (locale: Locale): SiteContent => loadContent(locale);

/** Page key in routing.pathnames → key in seo.pages. */
export const SEO_KEY: Record<AppPathname, keyof SiteContent["seo"]["pages"]> = {
  "/": "home",
  "/produits": "products",
  "/notre-histoire": "story",
  "/commander": "order",
  "/contact": "contact",
  "/mentions-legales": "legal",
};

/** Public path of a page in a locale (same rules as next-intl, localePrefix "as-needed"). */
export function pathFor(href: AppPathname, locale: Locale): string {
  const entry = routing.pathnames[href] as string | Record<string, string>;
  const localized = typeof entry === "string" ? entry : entry[locale];
  if (locale === DEFAULT_LOCALE) return localized;
  return `/${locale}${localized === "/" ? "" : localized}`;
}

export interface PageCase {
  href: AppPathname;
  locale: Locale;
  path: string;
}

export const ALL_PAGES: PageCase[] = (Object.keys(routing.pathnames) as AppPathname[]).flatMap((href) =>
  LOCALES.map((locale) => ({ href, locale, path: pathFor(href, locale) })),
);

/**
 * Minimal ICU formatter for the messages used in assertions:
 * {name} arguments and {n, plural, =0 {…} one {…} other {…}} with "#".
 */
export function icu(message: string, values: Record<string, string | number>, locale: Locale): string {
  const rules = new Intl.PluralRules(locale);
  let out = "";
  let i = 0;
  const readBlock = (): string => {
    // message[i] === "{": return the balanced inner text and move past "}".
    let depth = 0;
    const start = i + 1;
    for (; i < message.length; i++) {
      if (message[i] === "{") depth++;
      else if (message[i] === "}" && --depth === 0) break;
    }
    i++;
    return message.slice(start, i - 1);
  };
  while (i < message.length) {
    if (message[i] !== "{") {
      out += message[i++];
      continue;
    }
    const inner = readBlock();
    const comma = inner.indexOf(",");
    if (comma < 0) {
      out += String(values[inner.trim()] ?? `{${inner}}`);
      continue;
    }
    const name = inner.slice(0, comma).trim();
    const rest = inner.slice(comma + 1);
    const type = rest.slice(0, rest.indexOf(",")).trim();
    if (type !== "plural") throw new Error(`icu(): unsupported type ${type}`);
    const n = Number(values[name]);
    const branches = new Map<string, string>();
    const body = rest.slice(rest.indexOf(",") + 1);
    const re = /\s*(=\d+|zero|one|two|few|many|other)\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body))) {
      let depth = 1;
      let j = re.lastIndex;
      for (; j < body.length && depth; j++) {
        if (body[j] === "{") depth++;
        else if (body[j] === "}") depth--;
      }
      branches.set(m[1], body.slice(re.lastIndex, j - 1));
      re.lastIndex = j;
    }
    const branch = branches.get(`=${n}`) ?? branches.get(rules.select(n)) ?? branches.get("other") ?? "";
    out += icu(branch.replace(/#/g, String(n)), values, locale);
  }
  return out;
}

export const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Collects console errors and uncaught page errors; call `.assertNone()` at the end. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()} (${msg.location().url})`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return {
    errors,
    assertNone() {
      expect(errors, `Erreurs dans la console :\n${errors.join("\n")}`).toEqual([]);
    },
  };
}

/** Waits until the network is quiet, without failing when something keeps polling. */
export async function settle(page: Page, timeout = 5_000) {
  await page.waitForLoadState("networkidle", { timeout }).catch(() => undefined);
}

/** Opens the mobile menu when the main navigation is collapsed. */
export async function openMenuIfCollapsed(page: Page, locale: Locale) {
  const c = content(locale);
  const toggle = page.getByRole("button", { name: c.nav.openMenu });
  if (await toggle.isVisible().catch(() => false)) await toggle.click();
}

/** Puts lines in the persisted cart (localStorage "krumbz-cart") before the app boots. */
export async function seedCart(page: Page, lines: { id: string; quantity: number }[]) {
  await page.addInitScript((value) => {
    window.localStorage.setItem("krumbz-cart", value);
  }, JSON.stringify({ state: { lines }, version: 1 }));
}
