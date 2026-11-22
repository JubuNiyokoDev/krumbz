import { RundinovaHome } from "@/marketing";
import { listGalleryShops } from "@/lib/platform/gallery";
import { getOfferSettings, getStudioSettings } from "@/lib/platform/settings";
import type { MarketingLocale } from "@/marketing/types";

/**
 * Home of isoko.rundinova.com. Prices, WhatsApp and gallery shops come from the platform database
 * (super-admin settings + tenants); the component itself stays pure and reusable.
 */
export default async function MarketingHome({ params }: PageProps<"/marketing/[locale]">) {
  const { locale } = await params;
  const [offer, studio, shops] = await Promise.all([getOfferSettings(), getStudioSettings(), listGalleryShops(locale as MarketingLocale)]);
  return (
    <RundinovaHome
      locale={locale as MarketingLocale}
      offer={{ launchPrice: offer.launchPriceBif, monthlyPrice: offer.monthlyPriceBif, currency: offer.currency }}
      shops={shops}
      whatsappNumber={studio.whatsapp}
      paymentLink={studio.paymentLink}
      paymentQrPath={studio.paymentQrPath}
    />
  );
}
