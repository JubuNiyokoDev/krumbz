import type { CSSProperties } from "react";

/**
 * Hero h1 with a pure-CSS character reveal (starts at first paint, no JS, so
 * the title — the LCP element — is never blocked by hydration).
 * The text exists once in the DOM: the h1 is named by aria-label (read by
 * screen readers), the split characters are aria-hidden.
 */
export function HeroTitle({ id, text, className = "" }: { id?: string; text: string; className?: string }) {
  const words = text.split(" ");
  let index = 0;
  return (
    <h1 id={id} aria-label={text} className={`font-display font-bold leading-[0.9] tracking-[-0.025em] ${className}`}>
      <span aria-hidden className="block">
        {words.map((word, w) => {
          const last = w === words.length - 1;
          return (
            <span key={w}>
              <span className={`hero-word relative ${last ? "text-rust" : "text-navy"}`}>
                {Array.from(word).map((char, c) => (
                  <span key={c} className="hero-char" style={{ "--i": index++ } as CSSProperties}>
                    {char}
                  </span>
                ))}
                {last ? (
                  <svg viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute -bottom-[0.08em] left-[2%] h-[0.16em] w-[96%] overflow-visible">
                    <path
                      className="swoosh-path"
                      pathLength={1}
                      d="M4 16 C 60 4, 120 22, 170 12 S 260 6, 296 14"
                      fill="none"
                      stroke="#e2a23a"
                      strokeWidth="7"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : null}
              </span>
              {last ? null : " "}
            </span>
          );
        })}
      </span>
    </h1>
  );
}
