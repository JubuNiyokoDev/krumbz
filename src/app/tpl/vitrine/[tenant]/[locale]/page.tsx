import { VitrineStorefront } from "@/templates/vitrine";
import { vitrineData } from "../../data";

export default async function VitrineHomePage({ params }: PageProps<"/tpl/vitrine/[tenant]/[locale]">) {
  return <VitrineStorefront data={await vitrineData(params)} page="home" />;
}
