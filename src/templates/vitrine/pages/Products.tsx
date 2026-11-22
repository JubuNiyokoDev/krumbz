import { resolveBlock } from "../lib/content";
import { fill } from "../lib/i18n";
import type { View } from "../lib/view";
import { Heading, PageTop } from "../components/Heading";
import { ProductGrid } from "../components/ProductGrid";

export function ProductsPage({ view }: { view: View }) {
  const { content, locale, ui, products } = view;
  const intro = resolveBlock(content.productsIntro, locale);
  return (
    <PageTop labelledBy="vt-page-title">
      <div className="grid gap-14">
        <Heading
          id="vt-page-title"
          level={1}
          eyebrow={intro.eyebrow || fill(ui.productCount, { count: products.length })}
          title={intro.title || ui.products}
          text={intro.text}
        />
        {products.length > 0 ? <ProductGrid view={view} products={products} priorityCount={3} /> : <p className="vt-muted">{ui.notFoundText}</p>}
      </div>
    </PageTop>
  );
}
