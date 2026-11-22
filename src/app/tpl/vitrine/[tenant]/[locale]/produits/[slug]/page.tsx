import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findVitrineProduct, VitrineStorefront } from "@/templates/vitrine";
import { vitrineData } from "../../../../data";

type Props = PageProps<"/tpl/vitrine/[tenant]/[locale]/produits/[slug]">;

async function load(params: Props["params"]) {
  const { slug } = await params;
  const data = await vitrineData(params);
  const product = findVitrineProduct(data, slug);
  if (!product) notFound();
  return { data, product, slug };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data, product } = await load(params);
  const l = data.locale;
  const image = product.images[0];
  return {
    title: product.name[l] || product.name.fr,
    description: product.short[l] || product.short.fr || undefined,
    openGraph: image ? { images: [{ url: image.url, width: image.width, height: image.height }] } : undefined,
  };
}

export default async function VitrineProductPage({ params }: Props) {
  const { data, slug } = await load(params);
  return <VitrineStorefront data={data} page="product" productSlug={slug} />;
}
