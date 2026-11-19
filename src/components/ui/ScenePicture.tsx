import type { CSSProperties } from "react";
import { getImageProps } from "next/image";
import type { ResolvedImage } from "@/lib/assets/server";
import { ImagePlaceholder } from "./ImagePlaceholder";

interface ScenePictureProps {
  landscape: ResolvedImage;
  portrait: ResolvedImage;
  alt: string;
  placeholderLabel: string;
  priority?: boolean;
  className?: string;
  /** object-position of the landscape file on landscape screens. */
  wideFocus?: string;
  /** object-position of the landscape file when it is shown on a portrait screen (no portrait file yet). */
  tallFocus?: string;
  /** Rendered width of the landscape file on portrait screens (cropped band), for `sizes`. */
  tallSizes?: string;
}

/**
 * Art-directed scene image, filling its positioned parent.
 * - Landscape screens: the landscape file, framed with `wideFocus`.
 * - Portrait screens: the `-portrait.jpg` file as soon as it exists (centred);
 *   until then the landscape file, framed with `tallFocus` so faces stay visible.
 * Missing files render a clearly-labelled placeholder.
 */
export function ScenePicture({
  landscape,
  portrait,
  alt,
  placeholderLabel,
  priority = false,
  className = "",
  wideFocus = "50% 50%",
  tallFocus = "50% 50%",
  tallSizes = "100vw",
}: ScenePictureProps) {
  const wide = landscape.exists ? landscape : portrait.exists ? portrait : null;

  if (!wide) {
    return (
      <div className={`absolute inset-0 ${className}`} data-placeholder={`${landscape.file} | ${portrait.file}`}>
        <div className="absolute inset-0 hidden landscape:block">
          <ImagePlaceholder image={landscape} label={placeholderLabel} />
        </div>
        <div className="absolute inset-0 landscape:hidden">
          <ImagePlaceholder image={portrait} label={placeholderLabel} />
        </div>
      </div>
    );
  }

  const hasPortraitFile = portrait.exists && landscape.exists;
  // Art direction: `preload` would fetch both files, so the LCP case uses fetchPriority instead.
  const common = { alt, fill: true, quality: 75, ...(priority ? { fetchPriority: "high" as const, loading: "eager" as const } : {}) };
  const { props: wideProps } = getImageProps({
    ...common,
    src: wide.src!,
    // Without a portrait file, phones show the landscape file cropped in a band wider than the screen.
    sizes: hasPortraitFile ? "100vw" : `(orientation: portrait) ${tallSizes}, 100vw`,
    placeholder: wide.blurDataURL ? "blur" : "empty",
    blurDataURL: wide.blurDataURL,
  });
  const tallSrcSet = hasPortraitFile ? getImageProps({ ...common, src: portrait.src!, sizes: "100vw" }).props.srcSet : null;

  const focus = {
    "--focus-wide": wideFocus,
    "--focus-tall": hasPortraitFile ? "50% 50%" : tallFocus,
  } as CSSProperties;

  return (
    <picture className={`absolute inset-0 ${className}`} data-scene-picture={hasPortraitFile ? "portrait" : "landscape-only"}>
      {tallSrcSet ? <source media="(orientation: portrait)" srcSet={tallSrcSet} sizes="100vw" /> : null}
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt is in wideProps */}
      <img
        {...wideProps}
        style={{ ...wideProps.style, ...focus }}
        className="h-full w-full object-cover [object-position:var(--focus-tall)] landscape:[object-position:var(--focus-wide)]"
      />
    </picture>
  );
}
