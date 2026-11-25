import type { MarketingContent } from "../content";

const ICONS = [
  <path key="0" d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />,
  <path key="1" d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />,
  <path key="2" d="M5 5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM8.5 10.5h7" />,
  <path key="3" d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
];

/** Why the image matters: a statement whose words light up while scrolling, then four reasons. */
export function Why({ c }: { c: MarketingContent }) {
  const w = c.why;
  return (
    <section aria-labelledby="pourquoi-title" className="relative overflow-hidden bg-rn-mist py-24 md:py-32">
      <div aria-hidden className="absolute -right-40 top-10 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgb(8_184_240/0.18),transparent_65%)]" />
      <div className="rn-container relative">
        <p className="rn-kicker" data-reveal>
          {w.kicker}
        </p>
        <h2 id="pourquoi-title" data-words className="mt-6 max-w-[62rem] text-[clamp(1.9rem,1.1rem+3.2vw,3.7rem)] font-extrabold leading-[1.08]">
          {w.statement.split(/\s+/).map((word, i) => (
            <span key={i} className="rn-word">
              {word}{" "}
            </span>
          ))}
        </h2>
        <ul className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {w.points.map((point, i) => (
            <li key={point.title} data-reveal className="rn-card p-7">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-rn-haze text-rn-blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {ICONS[i % ICONS.length]}
                </svg>
              </span>
              <h3 className="mt-6 text-[1.12rem] font-bold leading-snug">{point.title}</h3>
              <p className="mt-2.5 text-[0.96rem] leading-relaxed text-rn-gray">{point.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
