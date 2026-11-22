import type { Metadata } from "next";
import { VitrineStorefront } from "@/templates/vitrine";
import { vitrineData } from "../../../data";

const TITLES = { fr: "Contact", rn: "Itumanaho", en: "Contact", sw: "Mawasiliano" } as const;

export async function generateMetadata({ params }: PageProps<"/tpl/vitrine/[tenant]/[locale]/contact">): Promise<Metadata> {
  const { locale } = await vitrineData(params);
  return { title: TITLES[locale] };
}

export default async function VitrineContactPage({ params }: PageProps<"/tpl/vitrine/[tenant]/[locale]/contact">) {
  return <VitrineStorefront data={await vitrineData(params)} page="contact" />;
}
