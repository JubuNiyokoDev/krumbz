import type { Metadata } from "next";
import { VitrineStorefront } from "@/templates/vitrine";
import { vitrineData } from "../../../data";

const TITLES = { fr: "Commander", rn: "Gutumiza", en: "Order", sw: "Agiza" } as const;

export async function generateMetadata({ params }: PageProps<"/tpl/vitrine/[tenant]/[locale]/commander">): Promise<Metadata> {
  const { locale } = await vitrineData(params);
  return { title: TITLES[locale] };
}

export default async function VitrineOrderPage({ params }: PageProps<"/tpl/vitrine/[tenant]/[locale]/commander">) {
  return <VitrineStorefront data={await vitrineData(params)} page="order" />;
}
