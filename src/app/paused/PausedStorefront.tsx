import type { Tenant } from "@/lib/tenant/types";

/**
 * « Boutique en pause » — shown instead of a storefront whose status is `paused`
 * (subscription expired…). Placeholder: styled with the tenant theme only,
 * to be restyled by the vitrine/marketing work. Server component, no client JS.
 */
const COPY: Record<string, { title: string; text: string; cta: string }> = {
  fr: { title: "Boutique en pause", text: "Cette boutique est momentanément indisponible. Revenez bientôt !", cta: "Écrire sur WhatsApp" },
  rn: { title: "Iduka rirahagaze", text: "Iri duka ntiriboneka muri iki gihe. Muzogaruke vuba !", cta: "Kwandika kuri WhatsApp" },
  en: { title: "Shop on pause", text: "This shop is temporarily unavailable. Please come back soon!", cta: "Message on WhatsApp" },
  sw: { title: "Duka limesitishwa", text: "Duka hili halipatikani kwa sasa. Rudi hivi karibuni!", cta: "Andika kwenye WhatsApp" },
};

export function PausedStorefront({ tenant, locale }: { tenant: Pick<Tenant, "name" | "theme" | "contact">; locale: string }) {
  const copy = COPY[locale] ?? COPY.fr;
  const { colors } = tenant.theme;
  return (
    <main
      data-paused-storefront
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        background: colors.background,
        color: colors.text,
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: "32rem", display: "grid", gap: "1rem" }}>
        <p style={{ margin: 0, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.primary }}>{tenant.name}</p>
        <h1 style={{ margin: 0, fontSize: "clamp(2rem, 6vw, 3rem)", lineHeight: 1.05 }}>{copy.title}</h1>
        <p style={{ margin: 0, fontSize: "1.125rem", color: colors.muted }}>{copy.text}</p>
        {tenant.contact.whatsapp ? (
          <p style={{ margin: "0.5rem 0 0" }}>
            <a
              href={`https://wa.me/${tenant.contact.whatsapp}`}
              rel="noopener noreferrer"
              style={{ display: "inline-block", padding: "0.8rem 1.4rem", borderRadius: "999px", background: colors.primary, color: colors.background, fontWeight: 600, textDecoration: "none" }}
            >
              {copy.cta}
            </a>
          </p>
        ) : null}
      </div>
    </main>
  );
}
