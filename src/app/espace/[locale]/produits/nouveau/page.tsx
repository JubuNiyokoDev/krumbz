import type { Metadata } from "next";
import { createProductAction } from "@/espace/actions";
import { ActionForm } from "@/espace/components/ActionForm";
import { ProductFields } from "@/espace/components/ProductFields";
import { Shell } from "@/espace/components/Shell";
import { espaceMessages } from "@/espace/i18n";
import { vendorContext } from "@/espace/server";
import { loadTenant } from "@/lib/espace/products";

export async function generateMetadata({ params }: PageProps<"/espace/[locale]/produits/nouveau">): Promise<Metadata> {
  return { title: espaceMessages((await params).locale).product.newTitle };
}

export default async function NewProductPage({ params }: PageProps<"/espace/[locale]/produits/nouveau">) {
  const { locale, m, deps } = await vendorContext((await params).locale);
  const tenant = await loadTenant(deps);

  return (
    <Shell locale={locale} m={m} path="/produits/nouveau" shopName={tenant.name}>
      <h1>{m.product.newTitle}</h1>
      <ActionForm
        action={createProductAction.bind(null, locale)}
        submitLabel={m.product.create}
        pendingLabel={m.common.saving}
        errorTitle={m.common.errorTitle}
        testId="product-form"
      >
        <ProductFields m={m} locales={tenant.locales} withPhotos />
      </ActionForm>
    </Shell>
  );
}
