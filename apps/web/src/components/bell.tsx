"use client";

import { useEffect, useRef } from "react";

/**
 * The bell (A6): when there are more unread notifications than the last time it was seen, it swings
 * once from its top. Never on every page: only when something has arrived.
 */
export function Bell({ unread }: { unread: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    let seen = 0;
    try {
      seen = Number(localStorage.getItem("ie-unread") ?? 0);
      localStorage.setItem("ie-unread", String(unread));
    } catch {
      return;
    }
    const el = ref.current;
    if (!el || unread <= seen) return;
    el.classList.add("bell-ring");
    const done = () => el.classList.remove("bell-ring");
    el.addEventListener("animationend", done, { once: true });
    return () => el.removeEventListener("animationend", done);
  }, [unread]);
  return (
    <svg ref={ref} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className="shrink-0">
      <path d="M5 8a5 5 0 0 1 10 0v3.5l1.5 2.5h-13L5 11.5V8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 16.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
