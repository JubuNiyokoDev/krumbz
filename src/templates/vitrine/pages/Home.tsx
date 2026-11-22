import Link from "next/link";
import { whatsappUrl } from "@/lib/order/whatsapp";
import { resolveBlock } from "../lib/content";
import { fill, tx } from "../lib/i18n";
import type { View } from "../lib/view";
import { Heading } from "../components/Heading";
import { ProductGrid } from "../components/ProductGrid";
import { Icon, WhatsAppIcon } from "../components/primitives";
import { FeaturedJourney, type JourneyProduct } from "../sections/FeaturedJourney";
import { Hero } from "../sections/Hero";
import { Scenes, type SceneView } from "../sections/Scenes";

export function HomePage({ view }: { view: View }) {
  const { tenant, content, locale, ui, featured, products, links } = view;

  const scenes: SceneView[] = tenant.scenes.map((s) => ({
    id: s.id,
    imageUrl: s.imageUrl,
    label: tx(s.label, locale),
    title: tx(s.title, locale),
    text: tx(s.text, locale),
    alt: tx(s.alt, locale),
  }));
  const scenesHeading = resolveBlock(content.scenesIntro, locale);

  const journey: JourneyProduct | null = featured
    ? {
        id: featured.id,
        name: tx(featured.name, locale),
        short: tx(featured.short, locale),
        href: links.product[featured.slug],
        price: featured.price,
        compareAtPrice: featured.compareAtPrice,
        modelUrl: tenant.features.threeD ? featured.modelUrl : null,
        images: featured.images.map((img) => ({ url: img.url, alt: tx(img.alt, locale) })),
      }
    : null;
  const featuredHeading = resolveBlock(content.featured, locale);
  // Chapters: vendor copy first, otherwise the product facts tell the story.
  const chapters =
    content.featured.chapters.length > 0
      ? content.featured.chapters.map((c) => ({ title: tx(c.title, locale), text: tx(c.text, locale) }))
      : (featured?.facts ?? []).slice(0, 4).map((f) => ({ title: tx(f.label, locale), text: tx(f.value, locale) }));

  const collection = resolveBlock(content.collection, locale);
  const marquee = content.marquee.map((m) => tx(m, locale)).filter(Boolean);

  return (
    <>
      <Hero view={view} />

      {marquee.length > 0 && (
        <div className="vt-marquee" aria-hidden>
          <div className="vt-marquee__track">
            {[...marquee, ...marquee, ...marquee, ...marquee].map((word, i) => (
              <span key={i}>{word}</span>
            ))}
          </div>
        </div>
      )}

      {scenes.length > 0 && <Scenes scenes={scenes} heading={{ ...scenesHeading, title: scenesHeading.title || tenant.name }} />}

      {journey && (
        <FeaturedJourney
          product={journey}
          chapters={chapters.length > 0 ? chapters : [{ title: journey.name, text: journey.short }]}
          heading={{ eyebrow: featuredHeading.eyebrow || ui.featuredTag, title: featuredHeading.title || journey.name, text: featuredHeading.text }}
          accent={tenant.theme.colors.accent}
        />
      )}

      <section className="vt-section" aria-labelledby="vt-collection-title">
        <div className="vt-wrap grid gap-12">
          <Heading
            id="vt-collection-title"
            eyebrow={collection.eyebrow || fill(ui.productCount, { count: products.length })}
            title={collection.title || ui.products}
            text={collection.text}
            aside={
              <Link href={links.products} className="vt-btn vt-btn--ghost">
                {ui.allProducts} <Icon name="arrow" className="vt-arrow size-5" />
              </Link>
            }
          />
          <ProductGrid view={view} products={products.slice(0, 6)} />
        </div>
      </section>

      {content.promises.length > 0 && (
        <section className="vt-section !pt-0" aria-label={tenant.name}>
          <ul className="vt-wrap grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {content.promises.map((p, i) => (
              <li key={p.title.fr} className="vt-panel grid content-start gap-2 p-6" data-reveal style={{ ["--d" as string]: `${i * 80}ms` }}>
                <span className="vt-promise__icon" aria-hidden>
                  <Icon name="check" className="size-5" />
                </span>
                <span className="vt-h3 !text-[1.2rem]">{tx(p.title, locale)}</span>
                <span className="vt-muted text-[0.95rem]">{tx(p.text, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="vt-section !pt-0" aria-labelledby="vt-cta-title">
        <div className="vt-wrap">
          <div className="vt-cta" data-reveal>
            <div className="grid gap-3">
              <h2 id="vt-cta-title" className="vt-h2 !text-[clamp(1.9rem,4.6vw,3.6rem)]">
                {tx(content.orderIntro.title, locale) || ui.orderWhatsApp}
              </h2>
              <p className="max-w-xl opacity-85">{tx(content.orderIntro.text, locale) || ui.noAccount}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={links.order} className="vt-btn vt-btn--accent">
                {ui.order} <Icon name="arrow" className="vt-arrow size-5" />
              </Link>
              <a href={whatsappUrl(tenant.contact.whatsapp)} className="vt-btn vt-btn--wa" target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon /> {ui.writeUs}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
