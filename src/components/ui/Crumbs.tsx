import type { CSSProperties } from "react";

/**
 * Decorative golden crumbs floating around a section (aria-hidden, CSS only).
 * Positions are given in % of the parent, which must be positioned.
 */
export interface CrumbSpec {
  x: number;
  y: number;
  size: number;
  rot?: number;
  dur?: number;
  delay?: number;
  tone?: "gold" | "light" | "dark" | "rust";
}

const TONES = { gold: "var(--color-gold)", light: "var(--color-gold-light)", dark: "var(--color-gold-dark)", rust: "var(--color-rust-bright)" } as const;
const SHAPES = [
  "M3 1 9 0 12 5 10 11 4 12 0 7Z",
  "M2 2 8 0 12 3 11 9 5 12 1 8Z",
  "M4 0 11 2 12 8 7 12 1 10 0 4Z",
];

export const DEFAULT_CRUMBS: CrumbSpec[] = [
  { x: 4, y: 12, size: 14, rot: 12, dur: 7 },
  { x: 2.5, y: 80, size: 10, rot: -20, dur: 6, delay: 1, tone: "dark" },
  { x: 47, y: 5, size: 9, rot: 40, dur: 8, delay: 0.5, tone: "light" },
  { x: 93, y: 22, size: 16, rot: -8, dur: 9, delay: 2, tone: "rust" },
  { x: 86, y: 86, size: 12, rot: 25, dur: 7.5, delay: 1.5 },
  { x: 62, y: 95, size: 8, rot: 60, dur: 6.5, tone: "light" },
];

export function Crumbs({ crumbs = DEFAULT_CRUMBS, className = "" }: { crumbs?: CrumbSpec[]; className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {crumbs.map((c, i) => (
        <svg
          key={i}
          viewBox="0 0 12 12"
          className="crumb"
          width={c.size}
          height={c.size}
          style={
            {
              left: `${c.x}%`,
              top: `${c.y}%`,
              "--rot": `${c.rot ?? 0}deg`,
              "--dur": `${c.dur ?? 7}s`,
              "--delay": `${c.delay ?? 0}s`,
            } as CSSProperties
          }
        >
          <path d={SHAPES[i % SHAPES.length]} style={{ fill: TONES[c.tone ?? "gold"] }} />
        </svg>
      ))}
    </div>
  );
}
