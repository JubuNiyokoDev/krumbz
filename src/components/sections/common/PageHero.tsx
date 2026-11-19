import type { ReactNode } from "react";
import { Crumbs } from "@/components/ui/Crumbs";
import { SectionHeading } from "../SectionHeading";

/** Inner-page hero: cream, blob, crumbs, h1. `aside` renders on the right on desktop. */
export function PageHero({
  id,
  eyebrow,
  title,
  lead,
  aside,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="grain relative overflow-hidden bg-cream pb-14 pt-[calc(var(--header-h)+3rem)] sm:pb-20 lg:pb-24 lg:pt-[calc(var(--header-h)+5rem)]">
      <div aria-hidden className="blob blob-spin pointer-events-none absolute -right-[30vw] -top-[20vw] h-[80vw] w-[80vw] bg-gold-light/45 lg:-right-[10vw] lg:-top-[12vw] lg:h-[44vw] lg:w-[44vw]" />
      <Crumbs />
      <div className={`relative mx-auto grid max-w-[88rem] gap-10 px-4 sm:px-6 lg:px-10 ${aside ? "lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16" : ""}`}>
        <div>
          <SectionHeading as="h1" id={id} eyebrow={eyebrow} title={title} lead={lead} />
          {children}
        </div>
        {aside}
      </div>
    </section>
  );
}
