import type { CSSProperties } from "react";
import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { buildStorefrontContent, isBespoke, loadStorefrontData } from "@/templates/boutique/content";
import { storefrontMedia } from "@/lib/storefront/media";
import { pageMetadata } from "@/lib/seo/site";
import { resolveImage } from "@/lib/assets/server";
import { BrandImage } from "@/components/ui/BrandImage";
import { BrandMark } from "@/components/ui/BrandMark";
import { Crumbs } from "@/components/ui/Crumbs";
import { TextWithToComplete } from "@/components/ui/ToComplete";
import { PageHero } from "@/components/sections/common/PageHero";
import { Parallax } from "@/components/sections/common/Parallax";
import { SectionHeading } from "@/components/sections/SectionHeading";
import { MushroomIcon } from "@/components/ui/Icons";

export async function generateMetadata({ params }: PageProps<"/tpl/boutique/[tenant]/[locale]/notre-histoire">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale as Locale, "story", "/notre-histoire");
}

const pad = (n: number) => String(n).padStart(2, "0");

export default async function StoryPage({ params }: PageProps<"/tpl/boutique/[tenant]/[locale]/notre-histoire">) {
  const { locale } = await params;
  const data = await loadStorefrontData(locale);
  const c = buildStorefrontContent(data);
  const bespoke = isBespoke(data.tenant);
  const media = storefrontMedia(data);
  const s = c.story;
  // A shop without a story has no story page (and no link to it, see storyAvailable()).
  if (!bespoke && !s.title) notFound();
  const tc = { label: c.common.toComplete, hint: c.common.toCompleteHint };
  // Journey steps: one photo per step, lazy-loaded (Krumbz: « De la forêt du Burundi à votre sachet »).
  const journeyImages = await Promise.all(
    s.journey.steps.map(async (_, i) => {
      const file = media.journey[i];
      if (!file) return null;
      const image = await resolveImage(file, { width: 1100, height: 1400 });
      return image.exists || bespoke ? image : null;
    }),
  );
  // Chapter photo: Krumbz names a file of /images/story/, other shops give media.story[i].
  const images = await Promise.all(
    s.chapters.map(async (chapter, i) => {
      const file = bespoke ? (chapter.image ? `/images/story/${chapter.image}.jpg` : null) : (media.story[i] ?? null);
      if (!file) return null;
      const image = await resolveImage(file, { width: 2400, height: 1600 });
      return image.exists || bespoke ? image : null;
    }),
  );

  return (
    <>
      <PageHero
        id="story-title"
        eyebrow={s.eyebrow}
        title={s.title}
        lead={s.intro}
        aside={
          <div aria-hidden className="relative mx-auto hidden aspect-square w-full max-w-md lg:block">
            <div className="blob blob-spin absolute inset-0 bg-gold-light/70" />
            <BrandMark className="absolute inset-[14%] animate-crumb-float drop-shadow-[0_30px_40px_rgb(164_80_26/0.35)]" />
          </div>
        }
      />

      {s.chapters.length ? (
      <div className="relative bg-cream pb-10">
        {s.chapters.map((chapter, i) => {
          const image = images[i];
          const reversed = i % 2 === 1;
          if (!image) {
            return (
              <section key={chapter.id} aria-labelledby={`chapter-${chapter.id}`} className="px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
                <div className="grain relative mx-auto max-w-[88rem] overflow-hidden rounded-[2.5rem] bg-navy px-6 py-16 text-center text-cream sm:px-12 lg:py-28">
                  <Crumbs className="opacity-70" />
                  <BrandMark className="mx-auto mb-8 h-24 w-24 animate-crumb-float" />
                  <p className="font-display text-sm font-semibold tracking-[0.14em] text-gold-light" aria-hidden>
                    {pad(i + 1)} / {pad(s.chapters.length)}
                  </p>
                  <h2 id={`chapter-${chapter.id}`} data-reveal className="mt-3 font-display text-[clamp(2.4rem,6vw,4.5rem)] font-bold leading-none">
                    {chapter.title}
                  </h2>
                  <p data-reveal className="mx-auto mt-6 max-w-3xl font-display text-[clamp(1.4rem,3.2vw,2.4rem)] font-semibold leading-snug text-gold-light">
                    <TextWithToComplete value={chapter.text} {...tc} />
                  </p>
                </div>
              </section>
            );
          }
          return (
            <section key={chapter.id} aria-labelledby={`chapter-${chapter.id}`} className="mx-auto max-w-[88rem] px-4 py-14 sm:px-6 lg:px-10 lg:py-24">
              <div className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-20 ${reversed ? "lg:[&>*:first-child]:order-2" : ""}`}>
                <Parallax className="aspect-[3/2] rounded-[2.5rem] bg-cream-deep shadow-lift">
                  <BrandImage image={image} alt={chapter.alt} sizes="(min-width: 1024px) 44vw, 92vw" placeholderLabel={c.common.imagePlaceholder} />
                </Parallax>
                <div className="flex flex-col items-start gap-5">
                  <p data-reveal className="flex items-center gap-3 font-display text-sm font-semibold tracking-[0.14em] text-rust" aria-hidden>
                    <span className="tabular-nums">{pad(i + 1)}</span>
                    <span className="h-px w-10 bg-rust/60" />
                    <span className="tabular-nums">{pad(s.chapters.length)}</span>
                  </p>
                  <h2 id={`chapter-${chapter.id}`} data-reveal className="font-display text-[clamp(2.25rem,5.5vw,4.25rem)] font-bold leading-[0.98] tracking-[-0.02em]">
                    {chapter.title}
                  </h2>
                  <p data-reveal className="max-w-xl text-lg leading-relaxed text-navy/85 sm:text-xl">
                    <TextWithToComplete value={chapter.text} {...tc} />
                  </p>
                </div>
              </div>
            </section>
          );
        })}
      </div>
      ) : null}

      {s.journey.steps.length ? (
      <section aria-labelledby="journey-title" className="relative overflow-hidden bg-navy py-20 text-cream sm:py-24 lg:py-32">
        <div className="mx-auto max-w-[88rem] px-4 sm:px-6 lg:px-10">
          <SectionHeading id="journey-title" eyebrow={s.journey.eyebrow} title={s.journey.title} lead={s.journey.intro} tone="light" align="center" />
          <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {s.journey.steps.map((step, i) => (
              <li key={step.title} data-reveal style={{ "--reveal-delay": `${i * 120}ms` } as CSSProperties} className="relative flex flex-col">
                {journeyImages[i] ? (
                <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-navy-soft shadow-lift ring-1 ring-cream/10">
                  <BrandImage image={journeyImages[i]!} alt={step.alt} sizes="(min-width: 768px) 30vw, 92vw" placeholderLabel={c.common.imagePlaceholder} />
                  <span aria-hidden className="absolute left-4 top-4 grid h-12 w-12 place-items-center rounded-full bg-gold font-display text-xl font-bold text-navy shadow-biscuit">
                    {i === 0 && bespoke ? <MushroomIcon size={24} /> : i + 1}
                  </span>
                </div>
                ) : (
                <span aria-hidden className="grid h-14 w-14 place-items-center rounded-full bg-gold font-display text-2xl font-bold text-navy shadow-biscuit">
                  {i + 1}
                </span>
                )}
                <h3 className="mt-5 font-display text-2xl font-bold text-gold-light">{step.title}</h3>
                <p className="mt-2 text-lg leading-relaxed text-cream/85">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      ) : null}

      {s.values.items.length ? (
      <section aria-labelledby="values-title" className="grain relative overflow-hidden bg-cream-deep py-20 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-[88rem] px-4 sm:px-6 lg:px-10">
          <SectionHeading id="values-title" title={s.values.title} align="center" />
          <ul className="mt-14 grid gap-6 md:grid-cols-3">
            {s.values.items.map((value, i) => (
              <li
                key={value.title}
                data-reveal
                style={{ "--reveal-delay": `${i * 110}ms` } as CSSProperties}
                className="group relative overflow-hidden rounded-[2rem] bg-cream p-8 shadow-biscuit ring-1 ring-navy/5 transition-transform duration-500 ease-out-back hover:-translate-y-2"
              >
                <span aria-hidden className="absolute -right-4 -top-6 font-display text-[7rem] font-bold leading-none text-gold/25 transition-transform duration-700 ease-out-back group-hover:-rotate-6 group-hover:scale-110">
                  {pad(i + 1)}
                </span>
                <h3 className="relative font-display text-3xl font-bold">{value.title}</h3>
                <p className="relative mt-3 text-lg text-navy/85">{value.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      ) : null}
    </>
  );
}
