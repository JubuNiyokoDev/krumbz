import type { CSSProperties, ReactNode } from "react";
import { StageAnchor } from "@/components/experience/StageAnchor";
import { TextWithToComplete } from "@/components/ui/ToComplete";
import { SectionHeading } from "../SectionHeading";
import { BenefitIcon } from "./BenefitIcon";

interface Benefit {
  id: string;
  title: string;
  text: string;
}

function BenefitItem({ item, index }: { item: Benefit; index: number }) {
  return (
    <li
      data-reveal
      style={{ "--reveal-delay": `${index * 90}ms` } as CSSProperties}
      className="group relative rounded-[2rem] bg-cream/80 p-6 ring-1 ring-navy/10 backdrop-blur-sm transition-[transform,box-shadow] duration-500 ease-out-back hover:-translate-y-1.5 hover:shadow-lift sm:p-7"
    >
      <span className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gold text-navy shadow-biscuit transition-transform duration-500 ease-out-back group-hover:-rotate-6 group-hover:scale-110">
        <BenefitIcon id={item.id} className="h-9 w-9" />
      </span>
      <h3 className="font-display text-2xl font-bold leading-tight">{item.title}</h3>
      <p className="mt-2 text-navy/80">{item.text}</p>
    </li>
  );
}

export function Benefits({
  eyebrow,
  title,
  items,
  nutritionNote,
  toCompleteLabel,
  toCompleteHint,
  fallback,
}: {
  eyebrow: string;
  title: string;
  items: Benefit[];
  nutritionNote: string;
  toCompleteLabel: string;
  toCompleteHint: string;
  fallback: ReactNode;
}) {
  const half = Math.ceil(items.length / 2);
  return (
    <section data-stage="benefits" aria-labelledby="benefits-title" className="grain relative overflow-hidden bg-cream py-24 sm:py-28 lg:py-36">
      <div aria-hidden className="blob-2 pointer-events-none absolute -left-[20vw] top-[10%] h-[60vw] w-[60vw] bg-cream-deep lg:h-[32vw] lg:w-[32vw]" />
      <div className="relative mx-auto max-w-[88rem] px-4 sm:px-6 lg:px-10">
        <SectionHeading id="benefits-title" eyebrow={eyebrow} title={title} align="center" />

        <div className="mt-14 grid items-center gap-8 lg:mt-20 lg:grid-cols-[1fr_minmax(0,1.15fr)_1fr] lg:gap-10">
          <ul className="grid gap-5 sm:grid-cols-2 lg:order-1 lg:grid-cols-1">
            {items.slice(0, half).map((item, i) => (
              <BenefitItem key={item.id} item={item} index={i} />
            ))}
          </ul>
          <div className="relative order-first flex justify-center py-6 lg:order-2 lg:py-0">
            <div aria-hidden className="blob blob-spin absolute left-1/2 top-1/2 h-[min(80vw,30rem)] w-[min(80vw,30rem)] -translate-x-1/2 -translate-y-1/2 bg-gold-light/60" />
            <StageAnchor id="benefits" fallback={fallback} className="aspect-square w-[min(76vw,30rem)]" />
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 lg:order-3 lg:grid-cols-1">
            {items.slice(half).map((item, i) => (
              <BenefitItem key={item.id} item={item} index={i + half} />
            ))}
          </ul>
        </div>

        {nutritionNote ? (
        <p data-reveal className="mx-auto mt-14 max-w-2xl rounded-3xl border-2 border-dashed border-rust/40 bg-cream-deep/60 px-6 py-4 text-center text-sm leading-relaxed text-navy/85 sm:text-base">
          <TextWithToComplete value={nutritionNote} label={toCompleteLabel} hint={toCompleteHint} />
        </p>
        ) : null}
      </div>
    </section>
  );
}
