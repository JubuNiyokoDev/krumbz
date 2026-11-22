import { MARKETING_LOCALES, type MarketingLocale } from "../types";

const NAMES: Record<MarketingLocale, string> = { fr: "Français", rn: "Ikirundi", en: "English", sw: "Kiswahili" };

/** FR · RN · EN · SW — plain links (full navigation, works without JS). */
export function LanguageLinks({
  current,
  hrefs,
  label,
  className = "",
}: {
  current: MarketingLocale;
  hrefs: Partial<Record<MarketingLocale, string>>;
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={className}>
      <ul className="flex items-center gap-1">
        {MARKETING_LOCALES.map((locale) => {
          const href = hrefs[locale];
          if (!href) return null;
          const active = locale === current;
          return (
            <li key={locale}>
              <a
                href={href}
                hrefLang={locale === "rn" ? "rn" : locale}
                lang={locale}
                aria-current={active ? "true" : undefined}
                title={NAMES[locale]}
                className={`grid h-9 min-w-9 place-items-center rounded-full px-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  active ? "bg-rn-cream text-rn-ink" : "text-rn-muted hover:text-rn-cream"
                }`}
              >
                <span className="sr-only">{NAMES[locale]}</span>
                <span aria-hidden>{locale}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
