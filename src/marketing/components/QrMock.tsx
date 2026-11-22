/**
 * Decorative QR-like pattern (NOT a scannable code): deterministic modules
 * derived from a seed, with the three finder squares. Used on the shirt card.
 */
const N = 21;

function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };
}

function inFinder(x: number, y: number) {
  const zones = [
    [0, 0],
    [N - 7, 0],
    [0, N - 7],
  ];
  return zones.some(([zx, zy]) => x >= zx - 1 && x <= zx + 7 && y >= zy - 1 && y <= zy + 7);
}

export function QrMock({ seed, className = "" }: { seed: string; className?: string }) {
  const rand = hash(seed);
  const cells: string[] = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (inFinder(x, y)) continue;
      if (rand() > 0.52) cells.push(`M${x} ${y}h1v1h-1z`);
    }
  }
  const finder = (x: number, y: number) =>
    `M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5zM${x + 2} ${y + 2}h3v3h-3z`;

  return (
    <svg viewBox={`-1 -1 ${N + 2} ${N + 2}`} className={className} aria-hidden focusable={false} shapeRendering="crispEdges">
      <rect x="-1" y="-1" width={N + 2} height={N + 2} fill="#fff" rx="1" />
      <path d={cells.join("")} fill="#0d0c12" />
      <path d={finder(0, 0) + finder(N - 7, 0) + finder(0, N - 7)} fill="#0d0c12" fillRule="evenodd" />
    </svg>
  );
}
