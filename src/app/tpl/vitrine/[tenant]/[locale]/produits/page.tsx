import type { Metadata } from "next";
import { VitrineStorefront } from "@/templates/vitrine";
import { vitrineData } from "../../../data";

const TITLES = { fr: "Produits", rn: "Ibicuruzwa", en: "Products", sw: "Bidhaa" } as const;

export async function generateMetadata({ params }: PageProps<"/tpl/vitrine/[tenant]/[locale]/produits">): Promise<Metadata> {
  const { locale } = await vitrineData(params);
  return { title: TITLES[locale] };
}

export default async function VitrineProductsPage({ params }: PageProps<"/tpl/vitrine/[tenant]/[locale]/produits">) {
  return <VitrineStorefront data={await vitrineData(params)} page="products" />;
}
