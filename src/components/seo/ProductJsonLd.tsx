import { isToComplete, type ProductContent } from "@/lib/content";
import { loadKrumbzContent } from "@/templates/krumbz/content";
import { absoluteUrl, localizedPath } from "@/lib/seo/site";
import { resolveImage } from "@/lib/assets/server";
import { LOCALE_LABELS, type Locale } from "@/i18n/config";
import { JsonLd, SCHEMA_IDS } from "./JsonLd";

/** Product photos tried in order; only files that exist are referenced. */
const PRODUCT_IMAGES = ["/images/product/biscuit-studio.png", "/images/product/biscuit-top.png"];

const known = (value: unknown): value is string => typeof value === "string" && value.trim() !== "" && !isToComplete(value);

/**
 * schema.org Product for each item of products.items (products page).
 * - Brand Krumbz and manufacturer Crispy Food Products reference the nodes
 *   emitted by <OrganizationJsonLd/> (same @id) and repeat their name.
 * - `offers` only when the price is a number (BIF).
 * - Values still marked « À COMPLÉTER » are omitted, never output as data.
 */
export async function ProductJsonLd({ locale }: { locale: string }) {
  const c = await loadKrumbzContent(locale);
  const home = absoluteUrl("/");
  const lang = locale in LOCALE_LABELS ? LOCALE_LABELS[locale].htmlLang : locale;
  const pageUrl = absoluteUrl(localizedPath(locale as Locale, "/produits"));
  const orderUrl = absoluteUrl(localizedPath(locale as Locale, "/commander"));
  const images = (await Promise.all(PRODUCT_IMAGES.map((p) => resolveImage(p))))
    .filter((img) => img.exists && img.src)
    .map((img) => absoluteUrl(img.src!));
  const currency = c._meta.currency;

  const products = (c.products.items as ProductContent[]).map((item) => {
    const properties = [
      [c.products.formats.weight, item.weight],
      [c.products.formats.units, item.unitsPerPack],
    ]
      .filter(([, value]) => known(value))
      .map(([name, value]) => ({ "@type": "PropertyValue", name, value }));

    return {
      "@type": "Product",
      "@id": `${pageUrl}#${item.id}`,
      sku: item.id,
      name: item.name,
      ...(known(item.description) ? { description: item.description } : {}),
      ...(images.length ? { image: images } : {}),
      url: pageUrl,
      inLanguage: lang,
      countryOfOrigin: { "@type": "Country", name: "Burundi" },
      brand: { "@type": "Brand", "@id": `${home}${SCHEMA_IDS.brand}`, name: c.brand.name },
      manufacturer: { "@type": "Organization", "@id": `${home}${SCHEMA_IDS.organization}`, name: c.brand.company },
      ...(properties.length ? { additionalProperty: properties } : {}),
      ...(typeof item.price === "number" && Number.isFinite(item.price)
        ? {
            offers: {
              "@type": "Offer",
              price: item.price,
              priceCurrency: currency,
              url: orderUrl,
              seller: { "@id": `${home}${SCHEMA_IDS.organization}` },
            },
          }
        : {}),
    };
  });

  return <JsonLd data={{ "@context": "https://schema.org", "@graph": products }} />;
}
