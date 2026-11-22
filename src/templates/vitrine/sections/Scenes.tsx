"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionLevel } from "../lib/context";
import { Img } from "../components/primitives";

gsap.registerPlugin(ScrollTrigger);

export interface SceneView {
  id: string;
  imageUrl: string;
  label: string;
  title: string;
  text: string;
  alt: string;
}

/**
 * "Life moments" storytelling. Motion "full": a sticky frame where each scene
 * is revealed over the previous one by a scroll-scrubbed clip-path wipe, with a
 * slow Ken Burns zoom, while its copy rises and a progress rail fills.
 * Otherwise: a simple grid of photo cards with fades.
 */
export function Scenes({ scenes, heading }: { scenes: SceneView[]; heading: { eyebrow: string; title: string; text: string } }) {
  const motion = useMotionLevel();
  const section = useRef<HTMLElement>(null);
  const [current, setCurrent] = useState(0);
  const story = motion === "full" && scenes.length > 1;

  useEffect(() => {
    const root = section.current;
    if (!root || !story) return;
    const ctx = gsap.context(() => {
      const media = gsap.utils.toArray<HTMLElement>("[data-scene-media]", root);
      const images = gsap.utils.toArray<HTMLElement>("[data-scene-img]", root);
      const copies = gsap.utils.toArray<HTMLElement>("[data-scene-copy]", root);
      const bars = gsap.utils.toArray<HTMLElement>("[data-scene-bar]", root);
      gsap.set(media.slice(1), { clipPath: "inset(100% 0% 0% 0%)" });
      gsap.set(copies.slice(1), { autoAlpha: 0, y: 40 });
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root.querySelector("[data-scene-track]"),
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          onUpdate: (self) => {
            const index = Math.min(scenes.length - 1, Math.floor(self.progress * scenes.length * 0.999));
            setCurrent(index);
            bars.forEach((bar, i) => bar.style.setProperty("--p", String(Math.max(0, Math.min(1, self.progress * scenes.length - i)))));
          },
        },
      });
      // Ken Burns of each photo, from the start of its wipe until the next one begins.
      images.forEach((img, i) => tl.fromTo(img, { scale: 1.18 }, { scale: 1, duration: i === 0 ? 0.55 : 1 }, Math.max(0, i - 0.45)));
      for (let i = 1; i < scenes.length; i++) {
        const at = i - 0.45;
        tl.to(media[i], { clipPath: "inset(0% 0% 0% 0%)", duration: 0.45, ease: "power2.inOut" }, at);
        tl.to(images[i - 1], { scale: 0.92, filter: "brightness(0.6)", duration: 0.45 }, at);
        tl.to(copies[i - 1], { autoAlpha: 0, y: -30, duration: 0.2 }, at);
        tl.to(copies[i], { autoAlpha: 1, y: 0, duration: 0.25 }, at + 0.25);
      }
    }, root);
    return () => ctx.revert();
  }, [story, scenes.length]);

  return (
    <section ref={section} className="vt-section !pb-0" aria-labelledby="vt-scenes-title">
      <div className="vt-wrap grid gap-5 md:grid-cols-[1fr_1fr] md:items-end">
        <div className="grid gap-4" data-reveal>
          {heading.eyebrow && <p className="vt-eyebrow">{heading.eyebrow}</p>}
          <h2 id="vt-scenes-title" className="vt-h2">
            {heading.title}
          </h2>
        </div>
        {heading.text && (
          <p className="vt-lead md:justify-self-end" data-reveal style={{ ["--d" as string]: "120ms" }}>
            {heading.text}
          </p>
        )}
      </div>

      {story ? (
        <div data-scene-track className="vt-story" style={{ height: `${scenes.length * 100 + 20}svh` }}>
          <div className="vt-story__sticky">
            <div className="vt-wrap">
              <div className="vt-story__frame">
                {scenes.map((scene, i) => (
                  <div key={scene.id} className="vt-story__media" data-scene-media style={{ zIndex: i }}>
                    <Img data-scene-img src={scene.imageUrl} alt={scene.alt} sizes="(min-width: 1344px) 1344px, 100vw" />
                  </div>
                ))}
                <div className="vt-story__scrim" style={{ zIndex: scenes.length }} />
                <div className="vt-story__copy grid gap-4" style={{ zIndex: scenes.length + 1 }}>
                  <div className="flex items-center justify-between gap-4">
                    <span className="vt-story__counter text-sm" aria-hidden>
                      {String(current + 1).padStart(2, "0")} / {String(scenes.length).padStart(2, "0")}
                    </span>
                    <div className="vt-story__rail w-40" aria-hidden>
                      {scenes.map((s) => (
                        <span key={s.id}>
                          <i data-scene-bar />
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid">
                    {scenes.map((scene, i) => (
                      <div key={scene.id} data-scene-copy className="col-start-1 row-start-1 grid max-w-2xl content-end gap-3" aria-hidden={i !== current}>
                        <span className="vt-story__label w-fit">{scene.label}</span>
                        <h3 className="vt-h2 !text-[clamp(1.8rem,4.4vw,3.6rem)]">{scene.title}</h3>
                        <p className="max-w-xl text-[1.02rem] text-white/85">{scene.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="vt-wrap vt-scenes-list mt-12 pb-[clamp(4.5rem,10vw,9rem)]">
          {scenes.map((scene, i) => (
            <figure key={scene.id} className="vt-scene-card" data-reveal="fade" style={{ ["--d" as string]: `${(i % 2) * 120}ms` }}>
              <Img src={scene.imageUrl} alt={scene.alt} />
              <div className="vt-story__scrim" />
              <figcaption className="vt-story__text grid gap-2 text-white">
                <span className="vt-story__label w-fit">{scene.label}</span>
                <span className="vt-h3 font-[family-name:var(--vt-font-display)] font-extrabold">{scene.title}</span>
                <span className="text-sm text-white/85">{scene.text}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
