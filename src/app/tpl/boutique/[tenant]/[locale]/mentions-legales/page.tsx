import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { loadStorefrontContent } from "@/templates/boutique/content";
import { pageMetadata } from "@/lib/seo/site";
import { TextWithToComplete } from "@/components/ui/ToComplete";
import { PageHero } from "@/components/sections/common/PageHero";

export async function generateMetadata({ params }: PageProps<"/tpl/boutique/[tenant]/[locale]/mentions-legales">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale as Locale, "legal", "/mentions-legales");
}

export default async function LegalPage({ params }: PageProps<"/tpl/boutique/[tenant]/[locale]/mentions-legales">) {
  const { locale } = await params;
  const c = await loadStorefrontContent(locale);
  const l = c.legal;
  const tc = { label: c.common.toComplete, hint: c.common.toCompleteHint };

  return (
    <>
      <PageHero id="legal-title" title={l.title} lead={<TextWithToComplete value={l.updated} {...tc} />} />
      <div className="bg-cream pb-24">
        <div className="mx-auto grid max-w-[88rem] gap-12 px-4 sm:px-6 lg:grid-cols-[18rem_1fr] lg:px-10">
          <nav aria-labelledby="legal-toc" className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:self-start">
            <h2 id="legal-toc" className="font-display text-lg font-semibold text-rust">
              {l.tocTitle}
            </h2>
            <ol className="mt-4 space-y-1 border-l-2 border-navy/10">
              {l.sections.map((section, i) => (
                <li key={section.title}>
                  <a href={`#section-${i + 1}`} className="-ml-0.5 block border-l-2 border-transparent py-1.5 pl-4 font-semibold text-navy/80 transition-colors hover:border-rust hover:text-navy">
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="max-w-3xl space-y-8">
            {l.sections.map((section, i) => (
              <section key={section.title} id={`section-${i + 1}`} aria-labelledby={`section-${i + 1}-title`} data-reveal className="scroll-mt-28 rounded-[2rem] bg-cream-deep/50 p-6 ring-1 ring-navy/5 sm:p-8">
                <h2 id={`section-${i + 1}-title`} className="font-display text-2xl font-bold sm:text-3xl">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-3 text-lg leading-relaxed text-navy/85">
                  {section.body.map((paragraph, j) => (
                    <p key={j}>
                      <TextWithToComplete value={paragraph} {...tc} />
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
