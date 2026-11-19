"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useExperience } from "@/store/experience";

const RING = 2 * Math.PI * 21;

/**
 * Small branded loader shown while the 3D products load. Non-blocking: it sits
 * in a corner, ignores the pointer and the page stays readable underneath.
 */
export function ExperienceLoader({ visible }: { visible: boolean }) {
  const t = useTranslations("common");
  const progress = useExperience((s) => s.loadProgress);
  const [rendered, setRendered] = useState(visible);
  if (visible && !rendered) setRendered(true);

  useEffect(() => {
    if (visible) return;
    const timeout = window.setTimeout(() => setRendered(false), 600);
    return () => window.clearTimeout(timeout);
  }, [visible]);

  if (!rendered) return null;
  const percent = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div
      className={`pointer-events-none fixed bottom-5 left-1/2 z-40 -translate-x-1/2 transition-all duration-500 ease-out motion-reduce:transition-none ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      <div className="flex items-center gap-3 rounded-full bg-cream/90 py-2 pl-2 pr-5 text-navy shadow-[0_18px_40px_-18px_rgb(164_80_26/0.45),0_4px_12px_-4px_rgb(18_38_74/0.15)] ring-1 ring-gold/30 backdrop-blur-md">
        <svg
          viewBox="0 0 48 48"
          className="size-11 shrink-0"
          role="progressbar"
          aria-label={t("loading3d")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="3" />
          <circle
            cx="24"
            cy="24"
            r="21"
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={RING}
            strokeDashoffset={RING * (1 - percent / 100)}
            transform="rotate(-90 24 24)"
            className="transition-[stroke-dashoffset] duration-300"
          />
          <g className="origin-center animate-[spin_3.2s_linear_infinite] motion-reduce:animate-none">
            <circle cx="24" cy="24" r="14" fill="var(--color-gold-light)" stroke="var(--color-rust)" strokeWidth="1.6" />
            <circle cx="24" cy="24" r="10.5" fill="none" stroke="var(--color-gold-dark)" strokeWidth="0.9" strokeDasharray="1.6 1.6" />
            {[
              [19, 19],
              [24, 17.5],
              [29, 19],
              [19, 29],
              [24, 30.5],
              [29, 29],
            ].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.15" fill="var(--color-rust)" />
            ))}
            <rect x="18" y="23" width="12" height="2" rx="1" fill="var(--color-rust)" opacity="0.55" />
          </g>
          <circle cx="40" cy="38" r="1.6" fill="var(--color-gold-dark)" className="animate-bounce motion-reduce:animate-none" />
          <circle cx="8" cy="36" r="1.2" fill="var(--color-gold)" className="animate-bounce motion-reduce:animate-none [animation-delay:200ms]" />
        </svg>
        <p role="status" aria-live="polite" className="whitespace-nowrap font-display text-sm font-semibold leading-tight">
          {t("loading3d")}
          <span aria-hidden className="block font-sans text-xs font-bold tabular-nums text-rust">
            {t("loadingPercent", { percent })}
          </span>
        </p>
      </div>
    </div>
  );
}
