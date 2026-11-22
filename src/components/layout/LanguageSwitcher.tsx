"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/use-pathname";
import { routing } from "@/i18n/routing";
import { LOCALE_LABELS } from "@/i18n/config";

/** FR / EN switcher that keeps the current page (localized pathnames). */
export function LanguageSwitcher({ tone = "dark", size = "sm" }: { tone?: "dark" | "light"; size?: "sm" | "lg" }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const ring = tone === "light" ? "ring-cream/30" : "ring-navy/15";
  const active = tone === "light" ? "bg-gold text-navy" : "bg-navy text-cream";
  const idle = tone === "light" ? "text-cream hover:bg-cream/10" : "text-navy hover:bg-navy/5";
  return (
    <nav aria-label={t("language")}>
      <ul className={`inline-flex items-center rounded-full p-1 ring-1 ${ring}`}>
        {routing.locales.map((l) => {
          const current = l === locale;
          return (
            <li key={l}>
              <Link
                href={pathname}
                locale={l}
                hrefLang={LOCALE_LABELS[l].htmlLang}
                lang={LOCALE_LABELS[l].htmlLang}
                aria-current={current ? "true" : undefined}
                className={`grid place-items-center rounded-full font-display font-semibold transition-colors ${
                  size === "lg" ? "h-12 min-w-14 px-4 text-lg" : "h-9 min-w-10 px-2.5 text-sm"
                } ${current ? active : idle}`}
              >
                <span aria-hidden>{LOCALE_LABELS[l].short}</span>
                <span className="sr-only">{LOCALE_LABELS[l].long}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
