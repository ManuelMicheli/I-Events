"use client";

import { useEffect, useRef } from "react";

/** Italian thousands dots always, also on 4 digits ("1.284"), as formatEuro does. */
const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
/** The first whole number in a value ("24%", "1.284", "3 su 5"), with its Italian thousands dots. */
const NUMBER = /\d{1,3}(?:\.\d{3})+(?!,)|\d+(?![.,]\d)/;

/**
 * A number that counts up to its value (Wharf reference, "every number follows"): from zero when it
 * first shows, from the old value when it changes. 700 ms, fast then soft. The text is the real value
 * from the first paint, so readers, copy and no-JS see it; reduced motion skips the count.
 */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  useEffect(() => {
    // Only the text node React rendered is touched, so React keeps owning it.
    const el = ref.current?.firstChild;
    const m = value.match(NUMBER);
    if (!(el instanceof Text) || !m || m.index === undefined) return;
    const target = Number(m[0].replace(/\./g, ""));
    const from = shown.current;
    shown.current = target;
    if (from === target || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const head = value.slice(0, m.index);
    const tail = value.slice(m.index + m[0].length);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      const eased = 1 - Math.pow(1 - t, 4);
      el.nodeValue = head + group(Math.round(from + (target - from) * eased)) + tail;
      if (t < 1) frame = requestAnimationFrame(tick);
      else el.nodeValue = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <span ref={ref} className={className} style={{ display: "inline-block", minWidth: `${value.length}ch` }}>
      {value}
    </span>
  );
}
