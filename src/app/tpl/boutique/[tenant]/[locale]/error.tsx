"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandMark } from "@/components/ui/BrandMark";
import { Crumbs } from "@/components/ui/Crumbs";

/** Segment error boundary: friendly message, retry (re-fetch + re-render) and way home. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("error");
  const common = useTranslations("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section aria-labelledby="error-title" className="grain relative flex min-h-[100svh] items-center overflow-hidden bg-cream pb-16 pt-[calc(var(--header-h)+2rem)]">
      <Crumbs />
      <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 text-center">
        <BrandMark className="crumble-shake h-32 w-32" />
        <h1 id="error-title" className="font-display text-[clamp(2.2rem,6vw,4rem)] font-bold leading-[1]">
          {t("title")}
        </h1>
        <p className="text-lg text-navy/85">{t("text")}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => retry()} className="btn btn-primary">
            {t("retry")}
          </button>
          <Link href="/" className="btn btn-ghost text-navy">
            {common("backHome")}
          </Link>
        </div>
      </div>
    </section>
  );
}
