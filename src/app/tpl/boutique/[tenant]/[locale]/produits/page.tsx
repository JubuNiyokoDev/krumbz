import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import type { ProductContent } from "@/lib/content";
import { buildStorefrontContent, isBespoke, loadStorefrontData } from "@/templates/boutique/content";
import { storefrontMedia } from "@/lib/storefront/media";
import { pageMetadata } from "@/lib/seo/site";
import { resolveImage, resolveTextures } from "@/lib/assets/server";
import { ProductViewer } from "@/components/three/ProductViewer";
import { ProductJsonLd } from "@/components/seo/ProductJsonLd";
import { BrandImage } from "@/components/ui/BrandImage";
import { isPublicValue, TextWithToComplete } from "@/components/ui/ToComplete";
import { MushroomIcon } from "@/components/ui/Icons";
import { PageHero } from "@/components/sections/common/PageHero";
import { SectionHeading } from "@/components/sections/SectionHeading";
import { NutritionTable } from "@/components/sections/products/NutritionTable";
import { ProductCard } from "@/components/sections/home/ProductCard";
import { PriceTag } from "@/components/order/PriceTag";

export async function generateMetadata({ params }: PageProps<"/tpl/boutique/[tenant]/[locale]/produits">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale as Locale, "products", "/produits");
}

export default async function ProductsPage({ params }: PageProps<"/tpl/boutique/[tenant]/[locale]/produits">) {
  const { locale } = await params;
  const data = await loadStorefrontData(locale);
  const c = buildStorefrontContent(data);
  const bespoke = isBespoke(data.tenant);
  const media = storefrontMedia(data);
  const p = c.products;
  const t = await getTranslations("products");
  const missing = { file: "", exists: false, src: null, width: 1600, height: 1600 };
  const [studio, mushroomCloseup] = await Promise.all([
    media.studio ? resolveImage(media.studio, { width: 1600, height: 1600 }) : missing,
    media.ingredients ? resolveImage(media.ingredients, { width: 1448, height: 1086 }) : { ...missing, width: 1448, height: 1086 },
  ]);
  const textures = resolveTextures();
  const products = p.items as ProductContent[];
  const tc = { label: c.common.toComplete, hint: c.common.toCompleteHint };

  const facts = [
    { title: p.ingredients.allergensTitle, value: p.ingredients.allergens },
    { title: p.ingredients.storageTitle, value: p.ingredients.storage },
    { title: p.ingredients.shelfLifeTitle, value: p.ingredients.shelfLife },
    { title: p.ingredients.producerTitle, value: p.ingredients.producer },
  ].filter((fact) => isPublicValue(fact.value));

  // Columns of the formats table: Krumbz = net weight / contents; other shops = labels of their first two facts.
  const labelled = products.find((product) => product.factLabels?.some(Boolean));
  const columns = bespoke
    ? { weight: p.formats.weight, units: p.formats.units }
    : { weight: labelled?.factLabels?.[0] ?? "", units: labelled?.factLabels?.[1] ?? "" };
  // Composition / care block and nutrition table: optional for the other shops.
  const ing = p.ingredients;
  const hasIngredients = bespoke || ing.list.length > 0 || !!ing.base;
  const hasNutrition = bespoke || p.nutrition.rows.length > 0;
  const showFacts = hasIngredients || hasNutrition || facts.length > 0;
  const ingredientsImage = bespoke || mushroomCloseup.exists ? mushroomCloseup : null;

  return (
    <>
      <PageHero
        id="products-page-title"
        eyebrow={p.eyebrow}
        title={p.title}
        lead={p.intro}
        aside={
          <div data-reveal="scale" className="relative">
            <div aria-hidden className="blob absolute inset-[4%] bg-gold/35 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-cream-deep via-gold-light/60 to-gold/70 shadow-lift ring-1 ring-navy/10">
              <ProductViewer
                textures={textures}
                initialModel={bespoke ? "sachet" : undefined}
                className="aspect-square w-full lg:aspect-[5/4.4]"
                fallback={
                  <BrandImage
                    image={studio}
                    alt={t("viewer.fallbackAlt", { name: c.brand.name })}
                    sizes="(min-width: 1024px) 44vw, 92vw"
                    placeholderLabel={c.common.imagePlaceholder}
                    priority
                    imgClassName="object-contain p-6"
                  />
                }
              />
            </div>
          </div>
        }
      />

      <section aria-labelledby="choose-title" className="relative bg-cream-deep py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-[88rem] px-4 sm:px-6 lg:px-10">
          <SectionHeading id="choose-title" title={p.chooseTitle} />
          <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:gap-8">
            {products.map((product, i) => (
              <li key={product.id} id={`produit-${product.id}`} data-stat-product={product.id} data-reveal style={{ "--reveal-delay": `${i * 120}ms` } as CSSProperties}>
                <ProductCard
                  product={product}
                  showLearnMore={false}
                  labels={{
                    brand: c.brand.name,
                    tagline: c.brand.tagline,
                    weight: p.formats.weight,
                    units: p.formats.units,
                    price: p.formats.price,
                    learnMore: c.common.learnMore,
                    toComplete: tc.label,
                    toCompleteHint: tc.hint,
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="formats-title" className="grain relative bg-cream py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-[88rem] px-4 sm:px-6 lg:px-10">
          <SectionHeading id="formats-title" title={p.formats.title} />
          {/*
            Below sm: a 4-column table has no room on a phone (the price column was
            cut off, invisible without discovering a hidden horizontal scroll). The
            <thead> stays in the DOM (sr-only) for screen readers; each row becomes a
            card with its own repeated field labels instead.
          */}
          <div data-reveal className="mt-10 overflow-x-auto rounded-[2rem] bg-cream shadow-biscuit ring-1 ring-navy/10 max-sm:overflow-visible" tabIndex={0} role="region" aria-labelledby="formats-title">
            <table className={`w-full border-collapse text-left ${columns.weight && columns.units ? "sm:min-w-[36rem]" : ""}`}>
              <thead className="max-sm:sr-only">
                <tr className="bg-navy text-cream">
                  <th scope="col" className="px-6 py-4 font-display text-lg font-semibold">{p.formats.product}</th>
                  {columns.weight ? <th scope="col" className="px-6 py-4 font-display text-lg font-semibold">{columns.weight}</th> : null}
                  {columns.units ? <th scope="col" className="px-6 py-4 font-display text-lg font-semibold">{columns.units}</th> : null}
                  <th scope="col" className="px-6 py-4 font-display text-lg font-semibold">{p.formats.price}</th>
                </tr>
              </thead>
              <tbody className="max-sm:block">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-navy/10 last:border-b-0 max-sm:block max-sm:border-b-0 max-sm:border-t max-sm:first:border-t-0 max-sm:px-6 max-sm:py-5"
                  >
                    <th scope="row" className="px-6 py-5 font-display text-xl font-bold max-sm:block max-sm:px-0 max-sm:pb-3 max-sm:pt-0">
                      {product.name}
                    </th>
                    {columns.weight ? (
                    <td className="px-6 py-5 max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-4 max-sm:border-t max-sm:border-navy/10 max-sm:px-0 max-sm:py-2.5">
                      <span className="hidden text-sm font-semibold text-navy/60 max-sm:inline">{columns.weight}</span>
                      {bespoke ? <TextWithToComplete value={product.weight} {...tc} /> : product.weight || "—"}
                    </td>
                    ) : null}
                    {columns.units ? (
                    <td className="px-6 py-5 max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-4 max-sm:border-t max-sm:border-navy/10 max-sm:px-0 max-sm:py-2.5">
                      <span className="hidden text-sm font-semibold text-navy/60 max-sm:inline">{columns.units}</span>
                      {bespoke ? <TextWithToComplete value={product.unitsPerPack} {...tc} /> : product.unitsPerPack || "—"}
                    </td>
                    ) : null}
                    <td className="px-6 py-5 max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-4 max-sm:border-t max-sm:border-navy/10 max-sm:px-0 max-sm:py-2.5">
                      <span className="hidden text-sm font-semibold text-navy/60 max-sm:inline">{p.formats.price}</span>
                      <PriceTag product={product} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {showFacts ? (
      <section aria-labelledby="facts-title" className="relative bg-cream-deep py-20 sm:py-24 lg:py-28">
        <div className={`mx-auto grid max-w-[88rem] gap-12 px-4 sm:px-6 lg:gap-16 lg:px-10 ${hasNutrition ? "lg:grid-cols-[1fr_1fr]" : ""}`}>
          <div>
            <SectionHeading id="facts-title" title={p.factsTitle} />
            <div className="mt-10 space-y-5">
              {hasIngredients ? (
              <article data-reveal className="overflow-hidden rounded-[2rem] bg-cream shadow-biscuit ring-1 ring-navy/5">
                <div className={`grid ${ingredientsImage ? "sm:grid-cols-[1.15fr_0.85fr]" : ""}`}>
                  <div className="p-6 sm:p-8">
                    <h3 className="font-display text-2xl font-bold">{p.ingredients.title}</h3>
                    {/* Base ingredient first: the mushroom (ikizinu) is the heart of Krumbz. */}
                    {bespoke || ing.base ? (
                    <p className="mt-5 flex items-center gap-3 rounded-2xl bg-gold/20 px-4 py-3 ring-1 ring-gold/60">
                      <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy text-gold-light">
                        {bespoke ? <MushroomIcon size={24} /> : <span className="h-3 w-3 rounded-full bg-gold-light" />}
                      </span>
                      <span>
                        <span className="block text-xs font-bold uppercase tracking-[0.12em] text-rust">
                          {p.ingredients.baseTitle}
                          <span className="sr-only"> : </span>
                        </span>
                        <span className="block font-display text-xl font-bold">{p.ingredients.base}</span>
                      </span>
                    </p>
                    ) : null}
                    {p.ingredients.list.length ? (
                    <>
                    <p className="mt-6 text-sm font-bold uppercase tracking-[0.12em] text-navy/70">
                      {p.ingredients.othersTitle}
                      <span className="sr-only"> : </span>
                    </p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {p.ingredients.list.map((item, i) => (
                        <li key={i} className="rounded-full bg-cream-deep px-4 py-2 font-semibold">
                          <TextWithToComplete value={item} {...tc} />
                        </li>
                      ))}
                    </ul>
                    </>
                    ) : null}
                    {p.ingredients.labelNote ? <p className="mt-4 text-sm text-navy/70">{p.ingredients.labelNote}</p> : null}
                  </div>
                  {ingredientsImage ? (
                  <div className="relative min-h-56 bg-cream-deep sm:min-h-full">
                    <BrandImage image={ingredientsImage} alt={p.ingredients.imageAlt} sizes="(min-width: 1024px) 18vw, (min-width: 640px) 36vw, 92vw" placeholderLabel={c.common.imagePlaceholder} />
                  </div>
                  ) : null}
                </div>
              </article>
              ) : null}
              <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {facts.map((fact, i) => (
                  <div key={fact.title} data-reveal style={{ "--reveal-delay": `${i * 90}ms` } as CSSProperties} className="rounded-[2rem] bg-cream p-6 shadow-biscuit ring-1 ring-navy/5">
                    <dt className="font-display text-lg font-bold">{fact.title}</dt>
                    <dd className="mt-2 text-navy/85">
                      <TextWithToComplete value={fact.value} {...tc} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          {hasNutrition ? (
          <div data-reveal className="lg:pt-24">
            <NutritionTable
              title={p.nutrition.title}
              per={p.nutrition.per}
              nutrientHeader={p.nutrition.nutrientHeader}
              valueHeader={p.nutrition.valueHeader}
              rows={p.nutrition.rows}
              disclaimer={p.nutrition.disclaimer}
              toComplete={tc.label}
              toCompleteHint={tc.hint}
            />
          </div>
          ) : null}
        </div>
      </section>
      ) : null}

      <ProductJsonLd locale={locale} />
    </>
  );
}
