import type { CSSProperties, ReactNode } from "react";

/** Eyebrow + title (+ optional lead), revealed on scroll. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  as: Tag = "h2",
  align = "left",
  tone = "dark",
  className = "",
}: {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  as?: "h1" | "h2" | "h3";
  align?: "left" | "center";
  tone?: "dark" | "light";
  className?: string;
}) {
  const center = align === "center" ? "mx-auto text-center items-center" : "";
  const eyebrowTone = tone === "light" ? "bg-cream/10 text-gold-light" : "bg-gold/25 text-rust";
  const leadTone = tone === "light" ? "text-cream/85" : "text-navy/80";
  const size =
    Tag === "h1"
      ? "text-[clamp(2.75rem,9vw,6.25rem)] leading-[0.95]"
      : "text-[clamp(2.25rem,6.4vw,4.75rem)] leading-[0.98]";
  return (
    <div className={`flex max-w-3xl flex-col gap-5 ${center} ${className}`}>
      {eyebrow ? (
        <p data-reveal className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 font-display text-sm font-semibold uppercase tracking-[0.14em] ${eyebrowTone}`}>
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
          {eyebrow}
        </p>
      ) : null}
      <Tag id={id} data-reveal style={{ "--reveal-delay": "80ms" } as CSSProperties} className={`font-display font-bold tracking-[-0.02em] ${size}`}>
        {title}
      </Tag>
      {lead ? (
        <p data-reveal style={{ "--reveal-delay": "160ms" } as CSSProperties} className={`max-w-2xl text-lg leading-relaxed sm:text-xl ${leadTone}`}>
          {lead}
        </p>
      ) : null}
    </div>
  );
}
