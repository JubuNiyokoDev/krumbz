// STUB — owned by the UI agent.
import { useTranslations } from "next-intl";
export default function HomePage() {
  const t = useTranslations("home.intro");
  return <h1 className="p-10 text-5xl">{t("title")}</h1>;
}
