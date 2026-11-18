import { getImageProps } from "next/image";
import type { ResolvedImage } from "@/lib/assets/server";
import { ImagePlaceholder } from "./ImagePlaceholder";

/**
 * Art-directed scene image: landscape file on wide screens, portrait file on
 * tall screens (phones). If only one version exists it is used everywhere.
 * Fills its positioned parent.
 */
export function ScenePicture({
  landscape,
  portrait,
  alt,
  placeholderLabel,
  priority = false,
  className = "",
}: {
  landscape: ResolvedImage;
  portrait: ResolvedImage;
  alt: string;
  placeholderLabel: string;
  priority?: boolean;
  className?: string;
}) {
  const wide = landscape.exists ? landscape : portrait.exists ? portrait : null;
  const tall = portrait.exists ? portrait : wide;

  if (!wide || !tall) {
    return (
      <div className={`absolute inset-0 ${className}`}>
        <div className="absolute inset-0 hidden landscape:block">
          <ImagePlaceholder image={landscape} label={placeholderLabel} />
        </div>
        <div className="absolute inset-0 landscape:hidden">
          <ImagePlaceholder image={portrait} label={placeholderLabel} />
        </div>
      </div>
    );
  }

  const common = { alt, fill: true, priority, quality: 75 } as const;
  const { props: wideProps } = getImageProps({
    ...common,
    src: wide.src!,
    sizes: "100vw",
    placeholder: wide.blurDataURL ? "blur" : "empty",
    blurDataURL: wide.blurDataURL,
  });
  const {
    props: { srcSet: tallSrcSet },
  } = getImageProps({ ...common, src: tall.src!, sizes: "100vw" });

  return (
    <picture className={`absolute inset-0 ${className}`}>
      <source media="(orientation: portrait)" srcSet={tallSrcSet} sizes="100vw" />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt is in wideProps */}
      <img {...wideProps} className="h-full w-full object-cover" />
    </picture>
  );
}
