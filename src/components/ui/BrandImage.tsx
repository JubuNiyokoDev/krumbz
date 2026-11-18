import Image from "next/image";
import type { ResolvedImage } from "@/lib/assets/server";
import { ImagePlaceholder } from "./ImagePlaceholder";

interface BrandImageProps {
  image: ResolvedImage;
  alt: string;
  sizes: string;
  placeholderLabel: string;
  priority?: boolean;
  /** Fill the parent (parent must be positioned and sized). */
  fill?: boolean;
  className?: string;
  imgClassName?: string;
}

/** next/image (AVIF/WebP, blur placeholder) or a labelled placeholder when the file is missing. */
export function BrandImage({ image, alt, sizes, placeholderLabel, priority, fill = true, className = "", imgClassName = "" }: BrandImageProps) {
  if (!image.exists || !image.src) {
    return (
      <div className={`${fill ? "absolute inset-0" : "relative"} ${className}`} style={fill ? undefined : { aspectRatio: `${image.width} / ${image.height}` }}>
        <ImagePlaceholder image={image} label={placeholderLabel} />
      </div>
    );
  }
  return (
    <Image
      src={image.src}
      alt={alt}
      sizes={sizes}
      priority={priority}
      placeholder={image.blurDataURL ? "blur" : "empty"}
      blurDataURL={image.blurDataURL}
      className={`${fill ? "object-cover" : "h-auto w-full"} ${className} ${imgClassName}`}
      {...(fill ? { fill: true } : { width: image.width, height: image.height })}
    />
  );
}
