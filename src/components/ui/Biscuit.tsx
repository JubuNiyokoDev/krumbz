import { useId } from "react";

/** Scalloped (fluted) circle path, deterministic. */
export function scallopPath(cx: number, cy: number, r: number, bumps: number, depth: number): string {
  const pt = (angle: number, radius: number) =>
    `${(cx + Math.cos(angle) * radius).toFixed(2)} ${(cy + Math.sin(angle) * radius).toFixed(2)}`;
  const step = (Math.PI * 2) / bumps;
  let d = `M ${pt(0, r)}`;
  for (let i = 0; i < bumps; i++) {
    d += ` Q ${pt(step * (i + 0.5), r + depth)} ${pt(step * (i + 1), r)}`;
  }
  return `${d} Z`;
}

const EDGE = scallopPath(50, 50, 43, 18, 6);
const HOLES: [number, number][] = [
  [50, 50],
  [36, 38],
  [64, 38],
  [36, 62],
  [64, 62],
  [50, 28],
  [50, 72],
  [28, 50],
  [72, 50],
];

/**
 * The Krumbz biscuit mark: a round, golden, fluted biscuit with docking holes.
 * Pure SVG (decorative): always aria-hidden.
 */
export function Biscuit({ className = "", shine = true }: { className?: string; shine?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden focusable={false}>
      <defs>
        <radialGradient id={`bg-${id}`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#f8d58a" />
          <stop offset="55%" stopColor="#e2a23a" />
          <stop offset="100%" stopColor="#b97a1c" />
        </radialGradient>
        <radialGradient id={`in-${id}`} cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#f6c56a" />
          <stop offset="100%" stopColor="#d99332" />
        </radialGradient>
      </defs>
      <path d={EDGE} fill={`url(#bg-${id})`} />
      <circle cx="50" cy="50" r="35" fill={`url(#in-${id})`} />
      <circle cx="50" cy="50" r="35" fill="none" stroke="#b97a1c" strokeOpacity="0.45" strokeWidth="1.2" />
      {HOLES.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y + 0.8} r="2.3" fill="#fbe2a8" opacity="0.7" />
          <circle cx={x} cy={y} r="2.1" fill="#a4501a" opacity="0.75" />
        </g>
      ))}
      {shine ? <ellipse cx="38" cy="30" rx="13" ry="6" fill="#fff" opacity="0.22" transform="rotate(-25 38 30)" /> : null}
    </svg>
  );
}
