import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CrumbleBiscuit } from "@/components/ui/CrumbleBiscuit";
import { Crumbs } from "@/components/ui/Crumbs";
import { ArrowRightIcon } from "@/components/ui/Icons";

/** Animated 404: the biscuit crumbles (CSS only, reduced-motion safe). */
export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <section aria-labelledby="not-found-title" className="grain relative flex min-h-[100svh] items-center overflow-hidden bg-cream pb-16 pt-[calc(var(--header-h)+2rem)]">
      <div aria-hidden className="blob blob-spin pointer-events-none absolute -left-[25vw] bottom-[-20vw] h-[70vw] w-[70vw] bg-gold-light/50 lg:h-[40vw] lg:w-[40vw]" />
      <Crumbs />
      <div className="relative mx-auto grid w-full max-w-[88rem] items-center gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-10">
        <div className="mx-auto w-[min(56vw,17rem)] lg:order-2 lg:w-[min(28vw,24rem)]">
          <CrumbleBiscuit className="w-full" />
        </div>
        <div className="flex flex-col items-start gap-5 lg:order-1">
          <p className="crumble-code font-display text-[clamp(5rem,20vw,11rem)] font-bold leading-[0.8] tracking-[-0.04em] text-rust" aria-hidden>
            {t("code")}
          </p>
          <h1 id="not-found-title" className="font-display text-[clamp(2.2rem,6vw,4.25rem)] font-bold leading-[0.98] tracking-[-0.02em]">
            {t("title")}
          </h1>
          <p className="max-w-lg text-lg text-navy/85 sm:text-xl">{t("text")}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link href="/" className="btn btn-primary">
              {t("cta")}
              <ArrowRightIcon size={20} className="btn-icon btn-icon-arrow" />
            </Link>
            <Link href="/produits" className="btn btn-ghost text-navy">
              {t("secondary")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
