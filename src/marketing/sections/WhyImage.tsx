import type { MarketingContent } from "../content";

export function WhyImage({ c }: { c: MarketingContent }) {
  const w = c.why;
  const words = w.statement.split(/\s+/).filter(Boolean);

  return (
    <section id="pourquoi" aria-labelledby="pourquoi-title" className="rn-sheet z-40 overflow-hidden bg-rn-nova text-rn-ink">
      <div aria-hidden className="rn-grain" />
      <div className="relative mx-auto max-w-[1320px] px-5 pb-28 pt-24 sm:px-8 md:pb-36 md:pt-32">
        <p className="rn-kicker" data-reveal>
          {w.kicker}
        </p>
        <h2 id="pourquoi-title" data-words className="rn-words mt-8 max-w-[22ch] text-[clamp(2rem,5vw,4.3rem)] font-bold leading-[1.04]">
          {words.map((word, i) => (
            <span key={i}>
              <span className="rn-word">{word}</span>
              {i < words.length - 1 ? " " : null}
            </span>
          ))}
        </h2>

        <ul className="mt-16 grid gap-px overflow-hidden rounded-[2rem] bg-rn-ink/15 sm:grid-cols-2 md:mt-24 lg:grid-cols-4">
          {w.points.map((point, i) => (
            <li key={point.title} data-reveal className="bg-rn-nova p-7 md:p-8">
              <span className="font-rn-display text-sm font-bold opacity-60">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-6 text-[1.35rem] font-bold leading-tight">{point.title}</h3>
              <p className="mt-3 leading-relaxed text-rn-ink">{point.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
