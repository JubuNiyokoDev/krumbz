// STUB — owned by the UI agent (animated 404).
import { useTranslations } from "next-intl";
export default function NotFound() {
  const t = useTranslations("notFound");
  return <h1 className="p-10 text-5xl">{t("title")}</h1>;
}
