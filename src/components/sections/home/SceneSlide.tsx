import type { ReactNode } from "react";
import type { ResolvedImage } from "@/lib/assets/server";
import type { StageId } from "@/lib/experience/stages";
import { StageAnchor } from "@/components/experience/StageAnchor";
import { ScenePicture } from "@/components/ui/ScenePicture";

/** One full-viewport moment: art-directed photo, warm overlay, copy, product anchor. */
export function SceneSlide({
  id,
  index,
  total,
  label,
  title,
  text,
  alt,
  landscape,
  portrait,
  placeholderLabel,
  fallback,
}: {
  id: StageId;
  index: number;
  total: number;
  label: string;
  title: string;
  text: string;
  alt: string;
  landscape: ResolvedImage;
  portrait: ResolvedImage;
  placeholderLabel: string;
  fallback: ReactNode;
}) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <section
      data-stage={id}
      data-scene
      id={`moment-${id}`}
      aria-labelledby={`moment-${id}-title`}
      className="relative h-[100svh] min-h-[36rem] overflow-hidden bg-navy"
      style={{ zIndex: index + 1 }}
    >
      <div data-scene-inner className="absolute inset-0 origin-top will-change-transform">
        <div data-scene-media className="scene-media absolute inset-0 overflow-hidden bg-navy">
          <div data-scene-image className="absolute inset-0 will-change-transform">
            <ScenePicture landscape={landscape} portrait={portrait} alt={alt} placeholderLabel={placeholderLabel} />
          </div>
          {/* warm legibility overlays */}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-navy/90 via-navy/45 via-45% to-transparent landscape:bg-gradient-to-r landscape:from-navy/92 landscape:via-navy/55 landscape:via-40% landscape:to-transparent" />
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgb(210_105_30/0.28),transparent_60%)]" />
          <div data-scene-dim aria-hidden className="absolute inset-0 bg-navy opacity-0" />
        </div>

        <div className="relative z-10 mx-auto flex h-full max-w-[88rem] flex-col px-5 pt-[calc(var(--header-h)+2.5rem)] sm:px-8 landscape:justify-center landscape:pt-[var(--header-h)] lg:px-12">
          <div data-scene-copy className="flex max-w-[36rem] flex-col items-start gap-4 text-cream landscape:max-w-[min(36rem,46vw)]">
            <p className="flex items-center gap-3 font-display text-sm font-semibold tracking-[0.12em] text-cream/90" aria-hidden>
              <span className="text-gold-light tabular-nums">{pad(index + 1)}</span>
              <span className="h-px w-10 bg-gold-light/80" />
              <span className="tabular-nums">{pad(total)}</span>
            </p>
            <p className="rounded-full bg-gold px-4 py-1.5 font-display text-sm font-bold uppercase tracking-[0.12em] text-navy">{label}</p>
            <h3 id={`moment-${id}-title`} className="font-display text-[clamp(2.3rem,6.6vw,5.25rem)] font-bold leading-[0.95] tracking-[-0.02em] [text-shadow:0_2px_24px_rgb(18_38_74/0.35)]">
              {title}
            </h3>
            <p className="max-w-md text-lg leading-relaxed text-cream/90 sm:text-xl">{text}</p>
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[4svh] left-1/2 h-[min(74vw,38svh)] w-[min(74vw,38svh)] -translate-x-1/2 rounded-full bg-gold/25 blur-3xl landscape:bottom-auto landscape:left-auto landscape:right-[8vw] landscape:top-1/2 landscape:h-[min(34vw,60svh)] landscape:w-[min(34vw,60svh)] landscape:translate-x-0 landscape:-translate-y-1/2"
      />
      <StageAnchor
        id={id}
        fallback={fallback}
        className="absolute! bottom-[4svh] left-1/2 z-10 aspect-square w-[min(74vw,38svh)] -translate-x-1/2 landscape:bottom-auto landscape:left-auto landscape:right-[8vw] landscape:top-1/2 landscape:w-[min(34vw,60svh)] landscape:translate-x-0 landscape:-translate-y-1/2"
      />
    </section>
  );
}
