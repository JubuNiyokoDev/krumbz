import { loadContent, isToComplete } from "@/lib/content";
import { absoluteUrl } from "@/lib/seo/site";

/** schema.org Organization (rendered on every page). */
export function OrganizationJsonLd({ locale }: { locale: string }) {
  const c = loadContent(locale);
  const sameAs = c.contact.socials.map((s) => s.url).filter(Boolean);
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: c.brand.company,
    brand: { "@type": "Brand", name: c.brand.name, slogan: c.brand.tagline },
    url: absoluteUrl("/"),
    logo: absoluteUrl("/icon.png"),
    slogan: c.brand.tagline,
    address: {
      "@type": "PostalAddress",
      addressCountry: "BI",
      ...(isToComplete(c.contact.city) ? {} : { addressLocality: c.contact.city }),
      ...(isToComplete(c.contact.address) ? {} : { streetAddress: c.contact.address }),
    },
    contactPoint: c.contact.phones.map((p) => ({
      "@type": "ContactPoint",
      telephone: p.e164,
      contactType: "customer service",
      areaServed: "BI",
      availableLanguage: ["French", "Kirundi"],
    })),
    ...(sameAs.length ? { sameAs } : {}),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
