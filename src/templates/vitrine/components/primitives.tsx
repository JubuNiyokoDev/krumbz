import { Fragment, type ImgHTMLAttributes } from "react";
import { formatPrice } from "@/lib/order/whatsapp";

/**
 * Plain <img>: tenant images come from uploads (already resized to WebP/AVIF by
 * the upload pipeline) or SVG placeholders, outside the next/image allowlist.
 * Lazy by default; pass `priority` for the LCP image.
 */
export function Img({ priority, alt, ...props }: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      draggable={false}
      {...props}
    />
  );
}

const PATHS = {
  cart: "M5 7h14l-1.2 10.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7Zm4 0V6a3 3 0 0 1 6 0v1",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  arrowLeft: "M19 12H5m5-5-5 5 5 5",
  close: "M6 6l12 12M18 6 6 18",
  menu: "M4 8h16M4 16h16",
  rotate: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5",
  left: "M15 6l-6 6 6 6",
  right: "M9 6l6 6-6 6",
  pin: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  clock: "M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  cube: "M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Zm0 0v9m0 0 8-4.5M12 12 4 7.5",
  check: "M5 12.5 10 17l9-10",
  sparkle: "M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M18 6l-2.5 2.5m-7 7L6 18",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  );
}

export function WhatsAppIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.98L2 22l5.16-1.5A9.93 9.93 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.07.9.9-2.98-.2-.31a8.17 8.17 0 1 1 6.87 3.72Zm4.5-6.12c-.25-.12-1.46-.72-1.69-.8-.23-.09-.39-.13-.56.12-.16.25-.64.8-.78.96-.15.17-.29.19-.54.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.71-1.33.08-.16.04-.3-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.41-.56-.42h-.48a.92.92 0 0 0-.66.31 2.78 2.78 0 0 0-.87 2.07 4.83 4.83 0 0 0 1.01 2.56 11.05 11.05 0 0 0 4.23 3.73c1.58.68 2.2.74 2.99.62.48-.07 1.46-.6 1.67-1.18.2-.58.2-1.07.15-1.18-.06-.1-.22-.16-.47-.29Z" />
    </svg>
  );
}

export function Price({
  price,
  compareAt,
  onRequest,
  className = "",
}: {
  price: number | null;
  compareAt: number | null;
  onRequest: string;
  className?: string;
}) {
  if (price === null) return <span className={`vt-price ${className}`}>{onRequest}</span>;
  const promo = compareAt !== null && compareAt > price;
  return (
    <span className={`vt-price ${className}`}>
      <span>{formatPrice(price)}</span>
      {promo && (
        <>
          <s>{formatPrice(compareAt)}</s>
          <span className="vt-price__off">−{Math.round((1 - price / compareAt) * 100)} %</span>
        </>
      )}
    </span>
  );
}

/** Splits a title into words wrapped for the staggered rise animation. */
export function SplitWords({ text }: { text: string }) {
  return (
    <>
      {text.split(/\s+/).map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          {i > 0 && " "}
          <span className="vt-word">
            <span style={{ ["--i" as string]: i }}>{word}</span>
          </span>
        </Fragment>
      ))}
    </>
  );
}
