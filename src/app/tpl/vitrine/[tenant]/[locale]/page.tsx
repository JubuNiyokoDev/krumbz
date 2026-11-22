import { getStorefrontData } from "@/lib/tenant/storefront";

/** Placeholder: storefront home of the generic template. */
export default async function VitrineHome({ params }: PageProps<"/tpl/vitrine/[tenant]/[locale]">) {
  const { tenant, locale } = await params;
  const data = await getStorefrontData(tenant, locale);
  return (
    <main>
      <h1>{data?.tenant.name}</h1>
      <ul>
        {data?.products.map((product) => <li key={product.id}>{product.name[locale as "fr"] ?? product.name.fr}</li>)}
      </ul>
    </main>
  );
}
