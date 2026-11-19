import { useId, type CSSProperties } from "react";
import { scallopPath } from "./Biscuit";

/**
 * 404 illustration: a biscuit shakes, cracks and crumbles into pieces that
 * fall and scatter (pure CSS/SVG, no WebGL, no JS). With reduced motion the
 * final crumbled state is shown directly (see .crumble-* in krumbz.css).
 */
const CX = 100;
const CY = 100;
const EDGE = scallopPath(CX, CY, 78, 18, 11);
const HOLES: [number, number][] = [
  [100, 100], [72, 76], [128, 76], [72, 124], [128, 124], [100, 58], [100, 142], [58, 100], [142, 100],
];

// Deterministic pseudo-random so server and client render the same markup.
function rand(seed: number) {
  const x = Math.sin(seed * 999.13) * 43758.5453;
  return x - Math.floor(x);
}

const ANGLES = [-90, -28, 38, 96, 158, 218, 270];
function crackPoints(angleDeg: number, seed: number) {
  const pts: [number, number][] = [];
  [0, 22, 44, 66, 88, 130].forEach((r, i) => {
    const jitter = i === 0 ? 0 : (rand(seed * 7 + i) - 0.5) * 22;
    const a = ((angleDeg + jitter) * Math.PI) / 180;
    pts.push([CX + Math.cos(a) * r, CY + Math.sin(a) * r]);
  });
  return pts;
}
const CRACKS = ANGLES.map((a, i) => crackPoints(a, i % (ANGLES.length - 1)));
const WEDGES = ANGLES.slice(0, -1).map((start, i) => {
  const a = CRACKS[i];
  const b = CRACKS[i + 1];
  const end = ANGLES[i + 1];
  const arc: [number, number][] = [];
  for (let k = 1; k < 6; k++) {
    const ang = ((start + ((end - start) * k) / 6) * Math.PI) / 180;
    arc.push([CX + Math.cos(ang) * 140, CY + Math.sin(ang) * 140]);
  }
  const pts = [...a, ...arc, ...b.slice().reverse()];
  return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
});
// Each piece lands near the ground (y ≈ 255), spreading away from the centre.
const ROTATIONS = [-118, 96, 152, -64, 84, -150];
const FALL = ANGLES.slice(0, -1).map((start, i) => {
  const mid = (((start + ANGLES[i + 1]) / 2) * Math.PI) / 180;
  return {
    x: Math.round(Math.cos(mid) * 52 + (rand(i + 300) - 0.5) * 24),
    y: Math.round(158 - Math.sin(mid) * 44),
    r: ROTATIONS[i],
  };
});
const DUST = Array.from({ length: 16 }, (_, i) => ({
  x: 18 + rand(i + 40) * 164,
  y: 270 + rand(i + 80) * 18,
  s: 3 + rand(i + 120) * 6,
  r: rand(i + 160) * 180,
  d: 2 + rand(i + 200) * 0.5,
  tone: i % 3,
}));
const TONES = ["#e2a23a", "#b97a1c", "#f3c76b"];

function BiscuitArt({ id }: { id: string }) {
  return (
    <>
      <path d={EDGE} fill={`url(#cb-${id})`} />
      <circle cx={CX} cy={CY} r={64} fill="#efb551" />
      <circle cx={CX} cy={CY} r={64} fill="none" stroke="#b97a1c" strokeOpacity="0.45" strokeWidth="2" />
      {HOLES.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={4} fill="#a4501a" opacity="0.75" />
      ))}
    </>
  );
}

export function CrumbleBiscuit({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 200 320" className={`overflow-visible ${className}`} aria-hidden focusable={false}>
      <defs>
        <radialGradient id={`cb-${id}`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#f8d58a" />
          <stop offset="55%" stopColor="#e2a23a" />
          <stop offset="100%" stopColor="#b97a1c" />
        </radialGradient>
        {WEDGES.map((points, i) => (
          <clipPath key={i} id={`cw-${id}-${i}`}>
            <polygon points={points} />
          </clipPath>
        ))}
      </defs>
      <ellipse cx="100" cy="292" rx="100" ry="9" fill="#12264a" opacity="0.1" />
      <g className="crumble-shake">
        {WEDGES.map((_, i) => (
          <g
            key={i}
            className="crumble-piece"
            style={{ "--x": `${FALL[i].x}px`, "--y": `${FALL[i].y}px`, "--r": `${FALL[i].r}deg`, "--d": `${1.5 + i * 0.07}s` } as CSSProperties}
          >
            <g clipPath={`url(#cw-${id}-${i})`}>
              <BiscuitArt id={id} />
            </g>
          </g>
        ))}
      </g>
      {DUST.map((d, i) => (
        <rect
          key={i}
          className="crumble-dust"
          x={d.x}
          y={d.y}
          width={d.s}
          height={d.s * 0.8}
          rx={d.s / 3}
          fill={TONES[d.tone]}
          style={{ "--d": `${d.d}s`, "--r": `${d.r}deg`, transformBox: "fill-box", transformOrigin: "center" } as CSSProperties}
        />
      ))}
    </svg>
  );
}
