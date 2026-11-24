import { Fragment } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import type { ProductContent } from "@/lib/content";
import { buildStorefrontContent, isBespoke, loadStorefrontData } from "@/templates/boutique/content";
import { pageMetadata } from "@/lib/seo/site";
import { resolveImage } from "@/lib/assets/server";
import { storefrontMedia, storefrontScenes } from "@/lib/storefront/media";
import { whatsappUrl } from "@/lib/order/whatsapp";
import { BrandImage } from "@/components/ui/BrandImage";
import { HomeIntro } from "@/components/sections/home/HomeIntro";
import { MomentsMotion } from "@/components/sections/home/MomentsMotion";
import { MomentsMarquee } from "@/components/sections/home/MomentsMarquee";
import { SceneSlide } from "@/components/sections/home/SceneSlide";
import { Benefits } from "@/components/sections/home/Benefits";
import { ProductsShowcase } from "@/components/sections/home/ProductsShowcase";
import { MushroomSection } from "@/components/sections/home/MushroomSection";
import { FromMushroom } from "@/components/sections/home/FromMushroom";
import { MushroomBreak } from "@/components/sections/home/MushroomBreak";
import { FinalCta } from "@/components/sections/home/FinalCta";
import { SectionHeading } from "@/components/sections/SectionHeading";

export async function generateMetadata({ params }: PageProps<"/tpl/boutique/[tenant]/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale as Locale, "home", "/");
}

/** Index of the scene after which each break comes: Krumbz keeps 5 and 11; other shops spread them evenly. */
function breakPositions(sceneCount: number, breakCount: number, bespoke: boolean): Record<number, number> {
  if (bespoke) return { 5: 0, 11: 1 };
  const out: Record<number, number> = {};
  for (let k = 0; k < breakCount; k++) {
    const after = Math.round(((k + 1) * sceneCount) / (breakCount + 1)) - 1;
    if (after >= 0 && after < sceneCount - 1 && !(after in out)) out[after] = k;
  }
  return out;
}

const hasText = (...values: (string | undefined)[]) => values.some((v) => !!v && v.trim().length > 0);

export default async function HomePage({ params }: PageProps<"/tpl/boutique/[tenant]/[locale]">) {
  const { locale } = await params;
  const data = await loadStorefrontData(locale);
  const c = buildStorefrontContent(data);
  const bespoke = isBespoke(data.tenant);
  const media = storefrontMedia(data);
  const t = await getTranslations("common");
  const tm = await getTranslations("home.moments");
  const home = c.home;
  const scenes = storefrontScenes(data, c);

  // Section photos: lazy-loaded next/image, only the files that exist are requested.
  // Krumbz shows its labelled placeholders; the other shops switch to the text-only variants.
  const optional = async (file: string | null, width: number, height: number) => {
    if (!file) return null;
    const image = await resolveImage(file, { width, height });
    return image.exists || bespoke ? image : null;
  };
  const breaks = home.moments.breaks ?? [];
  const [fromMushroomImage, breakImages, harvestImage, closeupImage] = await Promise.all([
    optional(media.highlight, 1536, 1024),
    Promise.all(breaks.map((_, i) => optional(media.breaks[i] ?? null, i % 2 ? 1199 : 1600, i % 2 ? 1312 : 900))),
    optional(media.harvest, 1024, 1536),
    optional(media.closeup, 1448, 1086),
  ]);
  const BREAK_AFTER = breakPositions(scenes.length, breaks.length, bespoke);

  const missing = { file: "", exists: false, src: null, width: 1600, height: 1600 } as const;
  const [studio, top, sceneImages] = await Promise.all([
    media.studio ? resolveImage(media.studio, { width: 1600, height: 1600 }) : missing,
    media.cutout ? resolveImage(media.cutout, { width: 1024, height: 1024 }) : missing,
    Promise.all(
      scenes.map(async (s) => {
        const landscape = await resolveImage(s.landscape, { width: 2400, height: 1350 });
        const portrait = s.portrait ? await resolveImage(s.portrait, { width: 1080, height: 1920 }) : { ...missing, width: 1080, height: 1920 };
        // Provisional visual until the real photo is dropped at its path.
        const shown = landscape.exists || !s.fallback ? landscape : await resolveImage(s.fallback, { width: 2400, height: 1350 });
        return { landscape: shown, portrait };
      }),
    ),
  ]);

  const productFallback = (sizes: string, priority = false) => (
    <BrandImage image={studio} alt={home.intro.packAlt || c.brand.name} sizes={sizes} priority={priority} placeholderLabel={c.common.imagePlaceholder} imgClassName="object-contain" />
  );
  const allProducts = c.products.items as ProductContent[];
  // Home page: Krumbz shows its two formats; other shops their featured products (4 at most).
  const featured = allProducts.filter((p) => p.featured);
  const products = bespoke ? allProducts : (featured.length ? featured : allProducts).slice(0, 4);
  const labels = scenes.map((s) => s.label);

  const showHighlight = bespoke || hasText(home.fromMushroom.title);
  const showMomentsHeading = hasText(home.moments.title, home.moments.eyebrow, home.moments.subtitle);
  const showBenefits = bespoke || home.benefits.items.length > 0;
  const showMushroom = bespoke || (hasText(home.mushroom.title) && (home.mushroom.items.length > 0 || hasText(home.mushroom.intro)));

  return (
    <>
      <HomeIntro
        eyebrow={home.intro.eyebrow}
        title={home.intro.title}
        subtitle={home.intro.subtitle}
        cta={home.intro.cta}
        secondaryCta={home.intro.secondaryCta}
        scrollHint={c.common.scrollHint}
        fallback={productFallback("(min-width: 1024px) 42vw, 84vw", true)}
        mark={bespoke}
        scrollTarget={scenes.length ? "moments" : "products-title"}
      />

      {showHighlight ? (
      <FromMushroom
        eyebrow={home.fromMushroom.eyebrow}
        title={home.fromMushroom.title}
        text={home.fromMushroom.text}
        steps={home.fromMushroom.steps}
        image={fromMushroomImage}
        alt={home.fromMushroom.alt}
        placeholderLabel={c.common.imagePlaceholder}
        mark={bespoke}
      />
      ) : null}

      {scenes.length ? (
      <section id="moments" aria-labelledby={showMomentsHeading ? "moments-title" : undefined} aria-label={showMomentsHeading ? undefined : labels.join(", ")} className={`relative ${showHighlight ? "bg-cream" : "bg-cream-deep"}`}>
        <div className={`grain relative overflow-hidden pb-16 ${showMomentsHeading ? "pt-24 sm:pt-32 lg:pb-24 lg:pt-40" : "pt-16 lg:pb-24 lg:pt-20"}`}>
          {showMomentsHeading ? (
          <div className="mx-auto max-w-[88rem] px-4 sm:px-6 lg:px-10">
            <SectionHeading id="moments-title" eyebrow={home.moments.eyebrow} title={home.moments.title || home.moments.eyebrow} lead={home.moments.subtitle} />
          </div>
          ) : null}
          <div className={`border-y-2 border-navy/10 bg-cream-deep/50 ${showMomentsHeading ? "mt-14 lg:mt-20" : ""}`}>
            <MomentsMarquee labels={labels} />
          </div>
        </div>
        <MomentsMotion
          labels={labels}
          progressLabel={home.moments.progressLabel}
          goToLabels={labels.map((label) => tm("goTo", { label }))}
        >
          {scenes.map((scene, i) => (
            <Fragment key={scene.id}>
            <SceneSlide
              id={scene.id}
              index={i}
              total={scenes.length}
              label={scene.label}
              title={scene.title}
              text={scene.text}
              alt={scene.alt}
              landscape={sceneImages[i].landscape}
              portrait={sceneImages[i].portrait}
              placeholderLabel={c.common.imagePlaceholder}
              framing={scene.framing}
              pose={scene.pose}
              aspect={scene.aspect}
              // Static mode: the cut-out MARIE biscuit sits cleanly on any photo.
              fallback={
                <BrandImage
                  image={top}
                  alt=""
                  sizes="(orientation: landscape) 19vw, 36vw"
                  placeholderLabel={c.common.imagePlaceholder}
                  imgClassName="object-contain drop-shadow-[0_18px_30px_rgb(18_38_74/0.45)]"
                />
              }
            />
            {i in BREAK_AFTER ? (
              <MushroomBreak
                eyebrow={home.moments.breaks[BREAK_AFTER[i]].eyebrow}
                text={home.moments.breaks[BREAK_AFTER[i]].text}
                alt={home.moments.breaks[BREAK_AFTER[i]].alt}
                image={breakImages[BREAK_AFTER[i]]}
                placeholderLabel={c.common.imagePlaceholder}
                reversed={BREAK_AFTER[i] % 2 === 1}
                mark={bespoke}
              />
            ) : null}
            </Fragment>
          ))}
        </MomentsMotion>
      </section>
      ) : null}

      {showBenefits ? (
      <Benefits
        eyebrow={home.benefits.eyebrow}
        title={home.benefits.title}
        items={home.benefits.items}
        nutritionNote={home.benefits.nutritionNote}
        toCompleteLabel={c.common.toComplete}
        toCompleteHint={c.common.toCompleteHint}
        fallback={
          <BrandImage image={top} alt="" sizes="(min-width: 1024px) 30rem, 76vw" placeholderLabel={c.common.imagePlaceholder} imgClassName="object-contain" />
        }
      />
      ) : null}

      {showMushroom ? (
      <MushroomSection
        eyebrow={home.mushroom.eyebrow}
        title={home.mushroom.title}
        intro={home.mushroom.intro}
        whyTitle={home.mushroom.whyTitle}
        items={home.mushroom.items}
        disclaimer={home.mushroom.disclaimer}
        cta={home.mushroom.cta}
        images={{
          harvest: harvestImage,
          closeup: closeupImage,
          harvestAlt: home.mushroom.images.harvestAlt,
          closeupAlt: home.mushroom.images.closeupAlt,
          placeholderLabel: c.common.imagePlaceholder,
        }}
      />
      ) : null}

      <ProductsShowcase
        eyebrow={home.products.eyebrow}
        title={home.products.title}
        subtitle={home.products.subtitle}
        products={products}
        labels={{
          brand: c.brand.name,
          tagline: c.brand.tagline,
          weight: c.products.formats.weight,
          units: c.products.formats.units,
          price: c.products.formats.price,
          learnMore: c.common.learnMore,
          toComplete: c.common.toComplete,
          toCompleteHint: c.common.toCompleteHint,
        }}
        fallback={productFallback("(min-width: 1024px) 34rem, 80vw")}
      />

      <FinalCta
        title={home.cta.title}
        text={home.cta.text}
        button={home.cta.button}
        phoneLabel={home.cta.phoneLabel}
        whatsappHref={whatsappUrl(c.contact.whatsapp.number, c.order.whatsapp.greeting)}
        phones={c.contact.phones}
        callLabels={c.contact.phones.map((p) => t("callNumber", { number: p.display }))}
        fallback={productFallback("(min-width: 1024px) 32rem, 78vw")}
      />
    </>
  );
}
