/** Rundinova Studio mark: a four-point "nova" star in an orbit + wordmark. */
export function NovaMark({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden focusable={false} className={className}>
      <circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      <path
        d="M20 5.5c1.1 7.6 3.9 12.4 14.5 14.5-10.6 2.1-13.4 6.9-14.5 14.5-1.1-7.6-3.9-12.4-14.5-14.5C16.1 17.9 18.9 13.1 20 5.5Z"
        fill="#ff5b2e"
      />
      <circle cx="33.5" cy="9" r="2.2" fill="currentColor" />
    </svg>
  );
}

/** `compact`: smaller on phones, mark only under 380px (header next to the language switch and CTA). */
export function Wordmark({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <NovaMark />
      <span className={`flex flex-col leading-none ${compact ? "max-[379px]:hidden" : ""}`}>
        <span className={`font-rn-display font-extrabold tracking-[-0.03em] ${compact ? "text-[1rem] sm:text-[1.15rem]" : "text-[1.15rem]"}`}>
          rundinova
        </span>
        <span className="mt-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.32em] opacity-70">studio</span>
      </span>
    </span>
  );
}
