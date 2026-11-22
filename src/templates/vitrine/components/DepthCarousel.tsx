"use client";

import { useRef, useState, type ReactNode } from "react";
import { useMotionLevel, useVitrine } from "../lib/context";
import { fill } from "../lib/i18n";
import { Icon } from "./primitives";

/**
 * Depth carousel (CSS 3D perspective): the active product faces the viewer,
 * neighbours recede and turn away. Drag / swipe, arrow buttons, dots and
 * keyboard arrows. Clicking a side card brings it forward instead of opening it.
 */
export function DepthCarousel({ slides, labels, label }: { slides: ReactNode[]; labels: string[]; label: string }) {
  const { ui } = useVitrine();
  const motion = useMotionLevel();
  const count = slides.length;
  const [active, setActive] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; id: number; moved: boolean } | null>(null);
  const width = useRef(300);

  const go = (index: number) => setActive(Math.max(0, Math.min(count - 1, index)));

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    start.current = { x: event.clientX, y: event.clientY, id: event.pointerId, moved: false };
    const item = event.currentTarget.querySelector<HTMLElement>(".vt-carousel__item");
    width.current = item?.offsetWidth ?? 300;
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s || s.id !== event.pointerId) return;
    const dx = event.clientX - s.x;
    const dy = event.clientY - s.y;
    if (!s.moved) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      s.moved = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setDrag(Math.max(-1.2, Math.min(1.2, dx / (width.current * 0.75))));
  };
  const onPointerUp = () => {
    const s = start.current;
    start.current = null;
    if (!s?.moved) return;
    go(active - Math.round(drag));
    setDrag(0);
    // Keep "dragging" until after the click event so it can be swallowed.
    window.setTimeout(() => setDragging(false), 0);
  };

  return (
    <div
      className="vt-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      data-dragging={dragging}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(active + 1);
        if (e.key === "ArrowLeft") go(active - 1);
      }}
    >
      <div className="vt-carousel__stage" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        {slides.map((slide, i) => {
          const o = i - active + drag;
          const ao = Math.abs(o);
          return (
            <div
              key={i}
              className="vt-carousel__item"
              role="group"
              aria-roledescription="slide"
              aria-label={`${labels[i]} — ${fill(ui.slideOf, { n: i + 1, total: count })}`}
              data-hidden={ao > 2.6}
              style={{ ["--o" as string]: motion === "full" ? o : (i - active) * 1.05, ["--ao" as string]: ao }}
              onClickCapture={(event) => {
                if (dragging || i !== active) {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!dragging) go(i);
                }
              }}
            >
              {/* Side slides are inert (not focusable); a click on them lands on this wrapper. */}
              <div inert={i !== active}>{slide}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-8 flex items-center justify-center gap-5">
        <button type="button" className="vt-icon-btn" onClick={() => go(active - 1)} disabled={active === 0} aria-label={ui.previous}>
          <Icon name="left" />
        </button>
        <div className="vt-dots">
          {labels.map((l, i) => (
            <button key={i} type="button" onClick={() => go(i)} aria-label={l} aria-current={i === active} />
          ))}
        </div>
        <button type="button" className="vt-icon-btn" onClick={() => go(active + 1)} disabled={active === count - 1} aria-label={ui.next}>
          <Icon name="right" />
        </button>
      </div>
    </div>
  );
}
