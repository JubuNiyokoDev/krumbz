import type { Tenant } from "@/lib/tenant/types";

/**
 * « Boutique en pause » — shown instead of a storefront whose status is `paused` (subscription
 * expired…). Styled with the tenant theme (colors, fonts, logo) so that the shop keeps its image;
 * server component, no client JS, a single small CSS block (soft animated light, disabled with
 * prefers-reduced-motion). Kirundi / Swahili: to be reviewed by native speakers.
 */
const COPY: Record<string, { eyebrow: string; title: string; text: string; cta: string; back: string }> = {
  fr: {
    eyebrow: "Boutique en pause",
    title: "On revient très vite.",
    text: "Cette boutique fait une courte pause. Les produits seront de nouveau visibles bientôt : en attendant, vous pouvez écrire directement au vendeur.",
    cta: "Écrire sur WhatsApp",
    back: "Merci de votre fidélité",
  },
  rn: {
    eyebrow: "Iduka rirahagaze",
    title: "Turagaruka vuba.",
    text: "Iri duka rirahagaze gatoya. Ibicuruzwa bizosubira kuboneka vuba. Ubu, mushobora kwandikira umudandaza kuri WhatsApp.",
    cta: "Kwandika kuri WhatsApp",
    back: "Murakoze kutwizera",
  },
  en: {
    eyebrow: "Shop on pause",
    title: "We'll be back very soon.",
    text: "This shop is taking a short break. Its products will be visible again soon: in the meantime, you can message the seller directly.",
    cta: "Message on WhatsApp",
    back: "Thank you for your loyalty",
  },
  sw: {
    eyebrow: "Duka limesitishwa",
    title: "Tutarudi hivi karibuni.",
    text: "Duka hili limepumzika kwa muda mfupi. Bidhaa zitaonekana tena hivi karibuni: kwa sasa, unaweza kumwandikia muuzaji moja kwa moja.",
    cta: "Andika kwenye WhatsApp",
    back: "Asante kwa uaminifu wako",
  },
};

const fontHref = (families: string[]) =>
  `https://fonts.googleapis.com/css2?${Array.from(new Set(families.filter(Boolean)))
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;600;700`)
    .join("&")}&display=swap`;

export function PausedStorefront({ tenant, locale }: { tenant: Pick<Tenant, "name" | "theme" | "contact">; locale: string }) {
  const copy = COPY[locale] ?? COPY.fr;
  const { colors, fonts, logoUrl } = tenant.theme;
  const whatsapp = tenant.contact.whatsapp?.replace(/\D/g, "");
  const css = `
    .rs-paused{--bg:${colors.background};--surface:${colors.surface};--primary:${colors.primary};--accent:${colors.accent};--text:${colors.text};--muted:${colors.muted};
      position:relative;min-height:100dvh;display:grid;place-items:center;padding:clamp(1.25rem,4vw,3rem);overflow:hidden;isolation:isolate;
      background:var(--bg);color:var(--text);font-family:"${fonts.body}",system-ui,sans-serif;text-align:center}
    .rs-paused__glow{position:absolute;inset:-20%;z-index:-1;filter:blur(60px);opacity:.55;
      background:radial-gradient(40% 35% at 25% 30%,var(--primary),transparent 70%),radial-gradient(35% 30% at 75% 70%,var(--accent),transparent 70%);
      animation:rs-paused-drift 18s ease-in-out infinite alternate}
    @keyframes rs-paused-drift{to{transform:translate3d(4%,-3%,0) scale(1.08) rotate(6deg)}}
    .rs-paused__card{width:min(36rem,100%);display:grid;gap:1.1rem;justify-items:center;padding:clamp(2rem,6vw,3.5rem) clamp(1.5rem,5vw,3rem);
      border-radius:2rem;background:color-mix(in srgb,var(--surface) 82%,transparent);backdrop-filter:blur(14px);
      box-shadow:0 30px 80px -30px color-mix(in srgb,var(--text) 35%,transparent);border:1px solid color-mix(in srgb,var(--text) 10%,transparent)}
    .rs-paused__logo{width:auto;height:64px;max-width:200px;object-fit:contain}
    .rs-paused__name{margin:0;font-family:"${fonts.display}",system-ui,sans-serif;font-weight:700;font-size:1.1rem;letter-spacing:.02em}
    .rs-paused__eyebrow{margin:0;display:inline-flex;align-items:center;gap:.5rem;padding:.4rem .9rem;border-radius:999px;font-size:.8rem;font-weight:700;
      letter-spacing:.12em;text-transform:uppercase;background:color-mix(in srgb,var(--primary) 14%,transparent);color:var(--primary)}
    .rs-paused__dot{width:.5rem;height:.5rem;border-radius:50%;background:currentColor;animation:rs-paused-pulse 2.4s ease-in-out infinite}
    @keyframes rs-paused-pulse{50%{opacity:.25}}
    .rs-paused h1{margin:0;font-family:"${fonts.display}",system-ui,sans-serif;font-size:clamp(2rem,6vw,3.25rem);line-height:1.05;letter-spacing:-.02em}
    .rs-paused__text{margin:0;max-width:30rem;font-size:1.08rem;line-height:1.6;color:var(--muted)}
    .rs-paused__cta{display:inline-flex;align-items:center;gap:.6rem;margin-top:.4rem;min-height:3.25rem;padding:.85rem 1.6rem;border-radius:999px;
      background:var(--primary);color:var(--bg);font-weight:700;text-decoration:none;transition:transform .2s ease,box-shadow .2s ease}
    .rs-paused__cta:hover{transform:translateY(-2px);box-shadow:0 14px 30px -12px var(--primary)}
    .rs-paused__cta:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
    .rs-paused__thanks{margin:.6rem 0 0;font-size:.85rem;color:var(--muted)}
    @media (prefers-reduced-motion:reduce){.rs-paused__glow,.rs-paused__dot{animation:none}}
  `;
  return (
    <main data-paused-storefront className="rs-paused">
      <link rel="stylesheet" href={fontHref([fonts.display, fonts.body])} />
      <style>{css}</style>
      <div className="rs-paused__glow" aria-hidden />
      <div className="rs-paused__card">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- tenant logo of any origin/size
          <img className="rs-paused__logo" src={logoUrl} alt={tenant.name} />
        ) : null}
        <p className="rs-paused__name">{tenant.name}</p>
        <p className="rs-paused__eyebrow">
          <span className="rs-paused__dot" aria-hidden />
          {copy.eyebrow}
        </p>
        <h1>{copy.title}</h1>
        <p className="rs-paused__text">{copy.text}</p>
        {whatsapp ? (
          <a className="rs-paused__cta" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
            <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z" />
            </svg>
            {copy.cta}
          </a>
        ) : null}
        <p className="rs-paused__thanks">{copy.back}</p>
      </div>
    </main>
  );
}
