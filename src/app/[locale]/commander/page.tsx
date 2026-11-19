import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { loadContent } from "@/lib/content";
import { pageMetadata } from "@/lib/seo/site";
import { PageHero } from "@/components/sections/common/PageHero";
import { OrderExperience } from "@/components/order/OrderExperience";

export async function generateMetadata({ params }: PageProps<"/[locale]/commander">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale as Locale, "order", "/commander");
}

export default async function OrderPage({ params }: PageProps<"/[locale]/commander">) {
  const { locale } = await params;
  const o = loadContent(locale).order;
  return (
    <>
      <PageHero id="order-title" eyebrow={o.eyebrow} title={o.title} lead={o.intro} />
      <div className="bg-cream pb-24">
        <OrderExperience />
      </div>
    </>
  );
}
