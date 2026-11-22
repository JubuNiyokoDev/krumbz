import type { Metadata } from "next";
import {
  DEFAULT_MARKETING_OFFER,
  MARKETING_LOCALES,
  RundinovaHome,
  rundinovaMetadata,
  type MarketingLocale,
  type MarketingShop,
} from "@/marketing";

/**
 * Preview data. In production these come from the database (`settings` for
 * the offer, `tenants` for the shops) — see docs/plan.md §4.
 */
const TAGLINES: Record<MarketingLocale, [krumbz: string, ikirenge: string]> = {
  fr: ["Biscuits MARIE au champignon, simples et croustillants.", "Baskets et chaussures, à essayer en 3D avant de commander."],
  rn: ["Ibisukuti MARIE vy'ikizinu, vyoroshe kandi biryoshe.", "Ibirato, ubiraba muri 3D imbere yo gutumiza."],
  en: ["MARIE biscuits with mushroom, simple and crunchy.", "Sneakers and shoes to explore in 3D before you order."],
  sw: ["Biskuti za MARIE zenye uyoga, rahisi na tamu.", "Viatu vya kisasa, vione kwa 3D kabla ya kuagiza."],
};

function previewShops(locale: MarketingLocale): MarketingShop[] {
  const [krumbz, ikirenge] = TAGLINES[locale];
  return [
    { name: "Krumbz", url: "https://krumbz.rundinova.com", imageUrl: "/images/og/og-image.jpg", tagline: krumbz },
    // No photo yet for the demo shop: the component draws a typographic poster.
    { name: "Ikirenge Shoes", url: "https://ikirenge.rundinova.com", imageUrl: "", tagline: ikirenge },
  ];
}

/** PLACEHOLDER (owner decision D4 pending): Rundinova's WhatsApp number is not known yet. */
const PLACEHOLDER_WHATSAPP = "25700000000";

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pickLocale(search: Search): MarketingLocale {
  const v = first(search.lang) ?? "";
  return (MARKETING_LOCALES as readonly string[]).includes(v) ? (v as MarketingLocale) : "fr";
}

export async function generateMetadata({ searchParams }: PageProps<"/rundinova-preview">): Promise<Metadata> {
  const locale = pickLocale(await searchParams);
  return { ...rundinovaMetadata(locale), robots: { index: false, follow: false } };
}

export default async function RundinovaPreviewPage({ searchParams }: PageProps<"/rundinova-preview">) {
  const search = await searchParams;
  const locale = pickLocale(search);
  // `?links=public` renders the production language links ("/", "/rn", "/en", "/sw");
  // by default the switcher stays inside the preview.
  const localeHrefs =
    first(search.links) === "public"
      ? undefined
      : Object.fromEntries(MARKETING_LOCALES.map((l) => [l, l === "fr" ? "/rundinova-preview" : `/rundinova-preview?lang=${l}`]));

  return (
    <div lang={locale}>
      <RundinovaHome
        locale={locale}
        offer={DEFAULT_MARKETING_OFFER}
        shops={previewShops(locale)}
        whatsappNumber={PLACEHOLDER_WHATSAPP}
        localeHrefs={localeHrefs}
      />
      <p
        role="note"
        style={{ position: "fixed", bottom: 12, left: 12, zIndex: 100, borderRadius: 999, background: "rgb(0 0 0 / 0.8)", color: "#fff", padding: "6px 12px", fontSize: 11, fontFamily: "ui-monospace, monospace" }}
      >
        Aperçu · WhatsApp provisoire {PLACEHOLDER_WHATSAPP} (décision D4 en attente)
      </p>
    </div>
  );
}
