import Image from "next/image";

/**
 * Local images (/images/…) go through next/image (AVIF/WebP, responsive);
 * anything else (vendor uploads on another host) falls back to a plain lazy <img>.
 */
export function ShopImage({
  src,
  alt,
  sizes,
  preload = false,
  className = "",
  fallbackLabel,
}: {
  src: string;
  alt: string;
  sizes: string;
  preload?: boolean;
  className?: string;
  /** Name shown on the generated poster when the shop has no image yet. */
  fallbackLabel?: string;
}) {
  if (!src) {
    return (
      <div role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} className={`rn-poster absolute inset-0 ${className}`}>
        <span className="rn-poster-mark">{(fallbackLabel ?? "").trim().split(/\s+/)[0]}</span>
      </div>
    );
  }
  if (src.startsWith("/images/")) {
    return <Image src={src} alt={alt} fill sizes={sizes} preload={preload} className={className} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={preload ? "eager" : "lazy"}
      decoding="async"
      className={`absolute inset-0 h-full w-full ${className}`}
    />
  );
}
