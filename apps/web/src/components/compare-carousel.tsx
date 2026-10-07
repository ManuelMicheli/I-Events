"use client";

import { Children, useRef, useState, type ReactNode } from "react";

/**
 * Proposals side by side on a phone: one card at a time, swiped sideways (the next one peeks in),
 * with the dots under them saying which one you are on. A dot takes you to its card.
 */
export function CompareCarousel({ label, names, children }: { label: string; names: string[]; children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const slides = Children.toArray(children);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const step = first ? first.offsetWidth + 12 : el.clientWidth;
    setActive(Math.min(slides.length - 1, Math.max(0, Math.round(el.scrollLeft / step))));
  };
  const go = (i: number) => {
    const el = track.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: card.offsetLeft - 16, behavior: "smooth" });
  };

  return (
    <section aria-label={label} className="flex flex-col gap-3">
      <div ref={track} onScroll={onScroll} className="relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none]">
        {slides.map((slide, i) => (
          <div key={i} className="w-[calc(100%-1.5rem)] shrink-0 snap-start" aria-roledescription="proposta" aria-label={`${names[i]}, ${i + 1} di ${slides.length}`}>
            {slide}
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="flex justify-center">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Vai alla proposta di ${names[i]}`}
              aria-current={i === active ? "true" : undefined}
              className="flex size-6 items-center justify-center"
            >
              <span className={`size-2 rounded-full transition-colors duration-[180ms] ${i === active ? "bg-text" : "bg-border-strong"}`} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
