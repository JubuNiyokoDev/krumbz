import type { CSSProperties, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { StageAnchor } from "@/components/experience/StageAnchor";
import { Crumbs } from "@/components/ui/Crumbs";
import { Magnetic } from "@/components/ui/Magnetic";
import { ArrowRightIcon } from "@/components/ui/Icons";
import { HeroTitle } from "./HeroTitle";

export function HomeIntro({
  eyebrow,
  title,
  subtitle,
  cta,
  secondaryCta,
  scrollHint,
  fallback,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  secondaryCta: string;
  scrollHint: string;
  fallback: ReactNode;
}) {
  return (
    <section data-stage="intro" aria-labelledby="hero-title" className="grain relative min-h-[100svh] overflow-hidden bg-cream">
      {/* warm organic background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="blob blob-spin absolute -right-[30vw] bottom-[-12svh] h-[78vw] w-[110vw] bg-gold-light/70 lg:-right-[8vw] lg:bottom-auto lg:top-[8svh] lg:h-[46vw] lg:w-[50vw]" />
        <div className="blob-2 absolute -left-[18vw] -top-[10vw] h-[46vw] w-[46vw] bg-cream-deep lg:h-[28vw] lg:w-[28vw]" />
        <div className="absolute bottom-[14svh] right-[10vw] h-[34vw] w-[34vw] rounded-full bg-rust-bright/15 blur-3xl lg:bottom-[18svh] lg:right-[20vw] lg:h-[18vw] lg:w-[18vw]" />
      </div>
      <Crumbs />

      <div className="relative mx-auto grid min-h-[100svh] max-w-[88rem] grid-rows-[auto_1fr] px-4 pt-[calc(var(--header-h)+1.25rem)] sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:grid-rows-1 lg:items-center lg:px-10 lg:pt-[var(--header-h)]">
        <div className="relative z-10 flex flex-col items-start gap-5 lg:gap-7 lg:pb-10">
          <p
            className="hero-fade inline-flex items-center gap-2 rounded-full bg-navy px-4 py-1.5 font-display text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-cream"
            style={{ "--d": "0.05s" } as CSSProperties}
          >
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-gold" />
            {eyebrow}
          </p>
          <HeroTitle id="hero-title" text={title} className="text-[clamp(3.1rem,15.4vw,7.4rem)]" />
          <p className="hero-fade max-w-[34rem] text-lg leading-relaxed text-navy/85 sm:text-xl" style={{ "--d": "0.55s" } as CSSProperties}>
            {subtitle}
          </p>
          <div className="hero-fade flex flex-wrap items-center gap-3" style={{ "--d": "0.7s" } as CSSProperties}>
            <Magnetic>
              <Link href="/commander" className="btn btn-primary">
                {cta}
                <ArrowRightIcon size={20} className="btn-icon btn-icon-arrow" />
              </Link>
            </Magnetic>
            <Magnetic>
              <Link href="/produits" className="btn btn-ghost text-navy">
                {secondaryCta}
              </Link>
            </Magnetic>
          </div>
        </div>

        <div className="relative flex min-h-[40svh] items-center justify-center pb-16 pt-4 lg:h-full lg:pb-0 lg:pt-0">
          <div aria-hidden className="absolute left-1/2 top-1/2 h-[min(70vw,40svh)] w-[min(70vw,40svh)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/30 blur-2xl lg:h-[min(34vw,60svh)] lg:w-[min(34vw,60svh)]" />
          <StageAnchor id="intro" fallback={fallback} className="aspect-square w-[min(84vw,42svh)] lg:w-[min(42vw,74svh)]" />
        </div>
      </div>

      <a
        href="#moments"
        className="hero-fade group absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-sm font-semibold text-navy/80 sm:flex"
        style={{ "--d": "1.1s" } as CSSProperties}
      >
        <span className="relative flex h-11 w-7 justify-center rounded-full border-2 border-navy/40 pt-2 transition-colors group-hover:border-navy">
          <span className="scroll-dot block h-2 w-2 rounded-full bg-rust" />
        </span>
        {scrollHint}
      </a>
    </section>
  );
}
