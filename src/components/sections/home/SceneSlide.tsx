import type { CSSProperties, ReactNode } from "react";
import type { ResolvedImage } from "@/lib/assets/server";
import type { StageId } from "@/lib/experience/stages";
import { mobileFraming, type SceneFraming } from "@/lib/assets/scene-framing";
import { StageAnchor } from "@/components/experience/StageAnchor";
import { ScenePicture } from "@/components/ui/ScenePicture";
import "./scene-slide.css";

/**
 * One full-viewport moment: photo framed per scene (faces and sachet kept
 * visible), copy and 3D product anchor on the photo's free side.
 * Layout rules live in SceneSlide.module.css, numbers in scene-framing.ts.
 */
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
  framing,
  pose,
  aspect,
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
  framing: SceneFraming;
  /** 3D composition (poses.ts); default: the id (Krumbz). */
  pose?: string;
  /** Landscape photo width / height (default: the Krumbz files). */
  aspect?: number;
}) {
  const pad = (n: number) => String(n).padStart(2, "0");
  // A real portrait file switches phones to the full-screen layout.
  const layout = portrait.exists ? "full" : "band";
  const { copy, anchor } = framing;
  const mobile = mobileFraming(framing, aspect);
  const size = `min(${anchor.size}svh, ${(anchor.size * 0.62).toFixed(1)}vw)`;
  const vars = {
    zIndex: index + 1,
    "--copy-w": `${copy.width}vw`,
    "--a-cx": `${anchor.cx}vw`,
    "--a-cy": `${anchor.cy}svh`,
    "--a-size": size,
    "--band-h": `min(${mobile.bandVw}vw, 58svh)`,
  } as CSSProperties;

  return (
    <section
      data-stage={id}
      data-scene
      data-layout={layout}
      data-free={framing.freeSide}
      data-desk={framing.desktop ?? "full"}
      data-keep={mobile.keep.join(",")}
      id={`moment-${id}`}
      aria-labelledby={`moment-${id}-title`}
      className={`ks-slide relative h-[100svh] min-h-[36rem] overflow-hidden bg-navy`}
      style={vars}
    >
      <div data-scene-inner className="absolute inset-0 origin-top will-change-transform">
        {framing.desktop === "card" && landscape.blurDataURL ? (
          // Wide screens, crowded photo: soft, darkened backdrop made from the tiny blur placeholder (no extra download).
          <div aria-hidden className="ks-backdrop" style={{ backgroundImage: `url(${landscape.blurDataURL})` }} />
        ) : null}
        <div data-scene-media className={`ks-media scene-media overflow-hidden bg-navy`}>
          <div data-scene-image className="absolute inset-0 will-change-transform">
            <ScenePicture
              landscape={landscape}
              portrait={portrait}
              alt={alt}
              placeholderLabel={placeholderLabel}
              wideFocus={framing.wide}
              tallFocus={mobile.focus}
              // The band shows the 16:9 photo wider than the screen: rendered width = band height × aspect.
              tallSizes={`${Math.ceil(mobile.bandVw * 1.78)}vw`}
            />
          </div>
          <div aria-hidden className="ks-overlay" />
          <div data-scene-dim aria-hidden className="absolute inset-0 bg-navy opacity-0" />
        </div>

        <div className="ks-content">
          <div data-scene-copy className={`ks-copy flex flex-col items-start gap-3 text-cream landscape:gap-4`}>
            <p className="flex items-center gap-3 font-display text-sm font-semibold tracking-[0.12em] text-cream/90" aria-hidden>
              <span className="text-gold-light tabular-nums">{pad(index + 1)}</span>
              <span className="h-px w-10 bg-gold-light/80" />
              <span className="tabular-nums">{pad(total)}</span>
            </p>
            <p className="rounded-full bg-gold px-4 py-1.5 font-display text-xs font-bold uppercase tracking-[0.12em] text-navy landscape:text-sm">
              {label}
            </p>
            <h3
              id={`moment-${id}-title`}
              className={`ks-title font-display font-bold leading-[0.98] tracking-[-0.02em] [text-shadow:0_2px_24px_rgb(18_38_74/0.45)]`}
            >
              {title}
            </h3>
            <p className={`ks-text max-w-md leading-relaxed text-cream/90 [text-shadow:0_1px_12px_rgb(18_38_74/0.5)]`}>{text}</p>
          </div>

          <StageAnchor id={id} pose={pose} fallback={fallback} className={`ks-anchor z-10`} />
        </div>
      </div>
    </section>
  );
}
