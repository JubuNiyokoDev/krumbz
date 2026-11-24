/** Infinite marquee of the moment labels (CSS only, decorative). */
export function MomentsMarquee({ labels }: { labels: string[] }) {
  const row = (
    <span className="flex shrink-0 items-center">
      {labels.map((label) => (
        <span key={label} className="flex items-center">
          <span className="px-6 font-display text-[clamp(2rem,6vw,4.5rem)] font-bold leading-none">{label}</span>
          <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0 text-gold" aria-hidden>
            <circle cx="12" cy="12" r="10" fill="currentColor" />
            <circle cx="9" cy="10" r="1.4" className="fill-rust" />
            <circle cx="15" cy="10" r="1.4" className="fill-rust" />
            <circle cx="12" cy="15" r="1.4" className="fill-rust" />
          </svg>
        </span>
      ))}
    </span>
  );
  return (
    <div aria-hidden className="relative flex overflow-hidden py-6 text-navy">
      <div className="marquee-track flex">
        {row}
        {row}
      </div>
    </div>
  );
}
