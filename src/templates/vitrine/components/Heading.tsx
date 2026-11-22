import type { ReactNode } from "react";

/** Eyebrow + title + lead of a section. `level` 1 for page titles. */
export function Heading({
  id,
  eyebrow,
  title,
  text,
  level = 2,
  aside,
  className = "",
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  text?: string;
  level?: 1 | 2;
  aside?: ReactNode;
  className?: string;
}) {
  const Tag = level === 1 ? "h1" : "h2";
  return (
    <div className={`grid gap-5 md:grid-cols-[1fr_auto] md:items-end ${className}`}>
      <div className="grid gap-4" data-reveal>
        {eyebrow && <p className="vt-eyebrow">{eyebrow}</p>}
        <Tag id={id} className={level === 1 ? "vt-h1 !text-[clamp(2.6rem,7vw,5.6rem)]" : "vt-h2"}>
          {title}
        </Tag>
        {text && <p className="vt-lead">{text}</p>}
      </div>
      {aside && (
        <div data-reveal style={{ ["--d" as string]: "120ms" }}>
          {aside}
        </div>
      )}
    </div>
  );
}

/** Top spacing of inner pages (fixed header). */
export function PageTop({ children, labelledBy }: { children: ReactNode; labelledBy: string }) {
  return (
    <section className="vt-section !pt-[calc(var(--vt-header-h)+clamp(2.5rem,7vw,5rem))]" aria-labelledby={labelledBy}>
      <div className="vt-wrap">{children}</div>
    </section>
  );
}
