import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { loadStorefrontContent } from "@/templates/boutique/content";
import { pageMetadata } from "@/lib/seo/site";
import { PageHero } from "@/components/sections/common/PageHero";
import { OrderExperience } from "@/components/order/OrderExperience";

export async function generateMetadata({ params }: PageProps<"/tpl/boutique/[tenant]/[locale]/commander">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale as Locale, "order", "/commander");
}

export default async function OrderPage({ params }: PageProps<"/tpl/boutique/[tenant]/[locale]/commander">) {
  const { locale } = await params;
  const o = (await loadStorefrontContent(locale)).order;
  return (
    <>
      <PageHero id="order-title" eyebrow={o.eyebrow} title={o.title} lead={o.intro} />
      <div className="bg-cream pb-24">
        <OrderExperience />
      </div>
    </>
  );
}
