import { resolveBlock } from "../lib/content";
import type { View } from "../lib/view";
import { Heading, PageTop } from "../components/Heading";
import { OrderFlow } from "../components/OrderFlow";

export function OrderPage({ view }: { view: View }) {
  const { content, locale, ui } = view;
  const intro = resolveBlock(content.orderIntro, locale);
  return (
    <PageTop labelledBy="vt-page-title">
      <div className="grid gap-12">
        <Heading id="vt-page-title" level={1} eyebrow={intro.eyebrow || ui.orderWhatsApp} title={intro.title || ui.order} text={intro.text || ui.noAccount} />
        <OrderFlow />
      </div>
    </PageTop>
  );
}
