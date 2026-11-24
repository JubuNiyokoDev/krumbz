import { isToComplete } from "@/lib/content";
import { loadStorefrontContent } from "@/templates/boutique/content";
import { absoluteUrl } from "@/lib/seo/site";
import { JsonLd, SCHEMA_IDS } from "./JsonLd";

const known = (value: string | null | undefined): value is string => Boolean(value) && !isToComplete(value);

/**
 * schema.org Organization (Crispy Food Products) + Brand (Krumbz), rendered on every page.
 * Values still marked « À COMPLÉTER » are never output.
 */
export async function OrganizationJsonLd({ locale }: { locale: string }) {
  const c = await loadStorefrontContent(locale);
  const home = absoluteUrl("/");
  const sameAs = c.contact.socials.map((s) => s.url).filter(known);
  const address = {
    "@type": "PostalAddress",
    addressCountry: "BI",
    ...(known(c.contact.city) ? { addressLocality: c.contact.city } : {}),
    ...(known(c.contact.address) ? { streetAddress: c.contact.address } : {}),
  };
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${home}${SCHEMA_IDS.organization}`,
        name: c.brand.company || c.brand.name,
        url: home,
        logo: { "@type": "ImageObject", url: absoluteUrl("/icon.png"), width: 512, height: 512 },
        slogan: c.brand.tagline,
        brand: { "@id": `${home}${SCHEMA_IDS.brand}` },
        address,
        ...(known(c.contact.email) ? { email: c.contact.email } : {}),
        telephone: c.contact.phones[0]?.e164,
        contactPoint: c.contact.phones.map((p) => ({
          "@type": "ContactPoint",
          telephone: p.e164,
          contactType: "customer service",
          areaServed: "BI",
          availableLanguage: ["French", "Kirundi"],
        })),
        ...(sameAs.length ? { sameAs } : {}),
      },
      {
        "@type": "Brand",
        "@id": `${home}${SCHEMA_IDS.brand}`,
        name: c.brand.name,
        slogan: c.brand.tagline,
        logo: absoluteUrl("/icon.png"),
      },
    ],
  };
  return <JsonLd data={data} />;
}
