import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { loadContent, type ProductContent } from "@/lib/content";
import { pageMetadata } from "@/lib/seo/site";
import { resolveImage } from "@/lib/assets/server";
import { scenePath, type SceneId } from "@/lib/assets/registry";
import { whatsappUrl } from "@/lib/order/whatsapp";
import { BrandImage } from "@/components/ui/BrandImage";
import { HomeIntro } from "@/components/sections/home/HomeIntro";
import { MomentsMotion } from "@/components/sections/home/MomentsMotion";
import { MomentsMarquee } from "@/components/sections/home/MomentsMarquee";
import { SceneSlide } from "@/components/sections/home/SceneSlide";
import { Benefits } from "@/components/sections/home/Benefits";
import { ProductsShowcase } from "@/components/sections/home/ProductsShowcase";
import { FinalCta } from "@/components/sections/home/FinalCta";
import { SectionHeading } from "@/components/sections/SectionHeading";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale as Locale, "home", "/");
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const c = loadContent(locale);
  const t = await getTranslations("common");
  const tm = await getTranslations("home.moments");
  const home = c.home;
  const scenes = home.moments.scenes;

  const [studio, top, sceneImages] = await Promise.all([
    resolveImage("/images/product/biscuit-studio.png", { width: 1600, height: 1600 }),
    resolveImage("/images/product/biscuit-top.png", { width: 1024, height: 1024 }),
    Promise.all(
      scenes.map(async (s) => ({
        landscape: await resolveImage(scenePath(s.id as SceneId, "paysage"), { width: 2400, height: 1350 }),
        portrait: await resolveImage(scenePath(s.id as SceneId, "portrait"), { width: 1080, height: 1920 }),
      })),
    ),
  ]);

  const productFallback = (sizes: string) => (
    <BrandImage image={studio} alt={home.intro.packAlt} sizes={sizes} placeholderLabel={c.common.imagePlaceholder} imgClassName="object-contain" />
  );
  const products = c.products.items as ProductContent[];
  const labels = scenes.map((s) => s.label);

  return (
    <>
      <HomeIntro
        eyebrow={home.intro.eyebrow}
        title={home.intro.title}
        subtitle={home.intro.subtitle}
        cta={home.intro.cta}
        secondaryCta={home.intro.secondaryCta}
        scrollHint={c.common.scrollHint}
        fallback={productFallback("(min-width: 1024px) 42vw, 84vw")}
      />

      <section id="moments" aria-labelledby="moments-title" className="relative bg-cream">
        <div className="grain relative overflow-hidden pb-16 pt-24 sm:pt-32 lg:pb-24 lg:pt-40">
          <div className="mx-auto max-w-[88rem] px-4 sm:px-6 lg:px-10">
            <SectionHeading id="moments-title" eyebrow={home.moments.eyebrow} title={home.moments.title} lead={home.moments.subtitle} />
          </div>
          <div className="mt-14 border-y-2 border-navy/10 bg-cream-deep/50 lg:mt-20">
            <MomentsMarquee labels={labels} />
          </div>
        </div>
        <MomentsMotion
          labels={labels}
          progressLabel={home.moments.progressLabel}
          goToLabels={labels.map((label) => tm("goTo", { label }))}
        >
          {scenes.map((scene, i) => (
            <SceneSlide
              key={scene.id}
              id={scene.id as SceneId}
              index={i}
              total={scenes.length}
              label={scene.label}
              title={scene.title}
              text={scene.text}
              alt={scene.alt}
              landscape={sceneImages[i].landscape}
              portrait={sceneImages[i].portrait}
              placeholderLabel={c.common.imagePlaceholder}
              fallback={productFallback("(orientation: landscape) 34vw, 74vw")}
            />
          ))}
        </MomentsMotion>
      </section>

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
