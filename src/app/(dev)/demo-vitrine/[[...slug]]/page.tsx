import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PLATFORM_LOCALES } from "@/lib/tenant/types";
import { findVitrineProduct, parseVitrinePath, vitrineHref, vitrineMetadata, VitrineStorefront, type VitrinePage } from "@/templates/vitrine";
import { demoProducts, demoShoesStorefront } from "@/templates/vitrine/demo/shoes";

/**
 * Preview of the « vitrine » template with the demo shop « Ikirenge Shoes »:
 *   /demo-vitrine, /demo-vitrine/produits, /demo-vitrine/produits/<slug>,
 *   /demo-vitrine/commander, /demo-vitrine/contact, /demo-vitrine/en/products…
 */
const BASE_PATH = "/demo-vitrine";

export const dynamicParams = false;

export function generateStaticParams() {
  const pages: { page: VitrinePage; productSlug?: string }[] = [
    { page: "home" },
    { page: "products" },
    { page: "order" },
    { page: "contact" },
    ...demoProducts.filter((p) => p.visible).map((p) => ({ page: "product" as const, productSlug: p.slug })),
  ];
  return PLATFORM_LOCALES.flatMap((locale) =>
    pages.map(({ page, productSlug }) => ({
      slug: vitrineHref("", { page, productSlug, locale }).split("/").filter(Boolean),
    })),
  );
}

async function resolve(params: PageProps<"/demo-vitrine/[[...slug]]">["params"]) {
  const { slug } = await params;
  const parsed = parseVitrinePath(slug ?? []);
  if (!parsed) notFound();
  const data = demoShoesStorefront(parsed.locale);
  if (parsed.page === "product" && !findVitrineProduct(data, parsed.productSlug)) notFound();
  return { data, ...parsed };
}

export async function generateMetadata({ params }: PageProps<"/demo-vitrine/[[...slug]]">): Promise<Metadata> {
  const { data, page, productSlug } = await resolve(params);
  return vitrineMetadata({ data, page, productSlug, basePath: BASE_PATH });
}

export default async function DemoVitrinePage({ params }: PageProps<"/demo-vitrine/[[...slug]]">) {
  const { data, page, productSlug } = await resolve(params);
  return <VitrineStorefront data={data} page={page} productSlug={productSlug} basePath={BASE_PATH} />;
}
