import { useId } from "react";
import { scallopPath } from "./Biscuit";

/**
 * Illustrated packs (pure SVG, decorative) used on product cards so the cards
 * stay light and never depend on a photo. `brand` and `tagline` come from content.
 */
export function PackIllustration({
  model,
  brand,
  tagline,
  className = "",
}: {
  model: "sachet" | "carton" | string;
  brand: string;
  tagline: string;
  className?: string;
}) {
  return model === "carton" ? (
    <Carton brand={brand} tagline={tagline} className={className} />
  ) : (
    <Sachet brand={brand} tagline={tagline} className={className} />
  );
}

const SMALL_BISCUIT = scallopPath(0, 0, 17, 14, 3);

function MiniBiscuit({ x, y, scale = 1, rotate = 0 }: { x: number; y: number; scale?: number; rotate?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <path d={SMALL_BISCUIT} fill="#e2a23a" stroke="#b97a1c" strokeWidth="1.2" />
      <circle r="12.5" fill="#efb551" />
      {[
        [0, 0],
        [-6, -5],
        [6, -5],
        [-6, 5],
        [6, 5],
      ].map(([cx, cy]) => (
        <circle key={`${cx}${cy}`} cx={cx} cy={cy} r="1.5" fill="#a4501a" opacity="0.7" />
      ))}
    </g>
  );
}

function crimp(y: number, from: number, to: number, teeth: number, height: number, up: boolean) {
  const w = (to - from) / teeth;
  let d = `M ${from} ${y}`;
  for (let i = 0; i < teeth; i++) {
    d += ` L ${from + w * (i + 0.5)} ${up ? y - height : y + height} L ${from + w * (i + 1)} ${y}`;
  }
  return d;
}

function Sachet({ brand, tagline, className }: { brand: string; tagline: string; className: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 220 280" className={className} aria-hidden focusable={false}>
      <defs>
        <linearGradient id={`s-body-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#c9861f" />
          <stop offset="0.18" stopColor="#f3c76b" />
          <stop offset="0.55" stopColor="#e2a23a" />
          <stop offset="1" stopColor="#b97a1c" />
        </linearGradient>
        <linearGradient id={`s-shine-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="268" rx="78" ry="8" fill="#12264a" opacity="0.12" />
      {/* crimped seals */}
      <path d={`${crimp(30, 26, 194, 14, 7, true)} L 194 44 L 26 44 Z`} fill="#b97a1c" />
      <path d={`${crimp(250, 26, 194, 14, 7, false)} L 194 236 L 26 236 Z`} fill="#b97a1c" />
      {/* pillow body */}
      <path
        d="M 26 40 C 16 90 16 190 26 240 L 194 240 C 204 190 204 90 194 40 Z"
        fill={`url(#s-body-${id})`}
      />
      <path d="M 70 40 C 62 90 62 190 70 240 L 96 240 C 90 190 90 90 96 40 Z" fill={`url(#s-shine-${id})`} />
      {/* label band */}
      <path d="M 22 92 C 80 84 140 84 198 92 L 198 150 C 140 142 80 142 22 150 Z" fill="#12264a" />
      <text
        x="110"
        y="128"
        textAnchor="middle"
        fontFamily="var(--font-fredoka), sans-serif"
        fontWeight="700"
        fontSize="34"
        fill="#fff6e8"
        letterSpacing="0.5"
      >
        {brand}
      </text>
      <text x="110" y="176" textAnchor="middle" fontFamily="var(--font-nunito), sans-serif" fontWeight="800" fontSize="11" fill="#12264a" letterSpacing="1.5">
        {tagline.toUpperCase()}
      </text>
      <MiniBiscuit x={84} y={208} scale={0.95} rotate={-12} />
      <MiniBiscuit x={128} y={212} scale={0.8} rotate={18} />
    </svg>
  );
}

function Carton({ brand, tagline, className }: { brand: string; tagline: string; className: string }) {
  return (
    <svg viewBox="0 0 260 260" className={className} aria-hidden focusable={false}>
      <ellipse cx="128" cy="240" rx="104" ry="10" fill="#12264a" opacity="0.12" />
      {/* top */}
      <path d="M 40 70 L 150 40 L 230 70 L 120 100 Z" fill="#f3c76b" />
      <path d="M 95 55 L 205 85" stroke="#b97a1c" strokeWidth="3" strokeDasharray="6 5" opacity="0.6" />
      {/* side */}
      <path d="M 120 100 L 230 70 L 230 196 L 120 230 Z" fill="#b97a1c" />
      {/* front */}
      <path d="M 40 70 L 120 100 L 120 230 L 40 200 Z" fill="#e2a23a" />
      {/* front label */}
      <path d="M 46 104 L 114 128 L 114 176 L 46 152 Z" fill="#12264a" />
      <text
        x="80"
        y="146"
        textAnchor="middle"
        fontFamily="var(--font-fredoka), sans-serif"
        fontWeight="700"
        fontSize="19"
        fill="#fff6e8"
        transform="skewY(19.5) translate(0 -27)"
      >
        {brand}
      </text>
      {/* side label */}
      <path d="M 132 120 L 220 96 L 220 160 L 132 186 Z" fill="#fff6e8" opacity="0.92" />
      <text
        x="176"
        y="146"
        textAnchor="middle"
        fontFamily="var(--font-fredoka), sans-serif"
        fontWeight="700"
        fontSize="22"
        fill="#12264a"
        transform="skewY(-15) translate(0 47)"
      >
        {brand}
      </text>
      <text
        x="176"
        y="166"
        textAnchor="middle"
        fontFamily="var(--font-nunito), sans-serif"
        fontWeight="800"
        fontSize="7.5"
        letterSpacing="1"
        fill="#a4501a"
        transform="skewY(-15) translate(0 47)"
      >
        {tagline.toUpperCase()}
      </text>
      <g transform="translate(176 200) skewY(-15)">
        <MiniBiscuit x={-14} y={0} scale={0.55} />
        <MiniBiscuit x={14} y={0} scale={0.55} />
      </g>
    </svg>
  );
}
