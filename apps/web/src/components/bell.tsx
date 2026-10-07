"use client";

import { BellIcon } from "./icons";
import { useEffect, useRef } from "react";

/**
 * The bell (A6, A10): when there are more unread notifications than the last time it was seen, it
 * rings once, clapper and all. Never on every page: only when something has arrived.
 */
export function Bell({ unread }: { unread: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    // The frame draws a bell in the sidebar and one in the phone's top bar: only the one on screen counts.
    if (!ref.current?.getClientRects().length) return;
    let seen = 0;
    try {
      seen = Number(localStorage.getItem("ie-unread") ?? 0);
      localStorage.setItem("ie-unread", String(unread));
    } catch {
      return;
    }
    const el = ref.current;
    if (!el || unread <= seen) return;
    el.classList.add("is-ringing");
    const t = setTimeout(() => el.classList.remove("is-ringing"), 900);
    return () => clearTimeout(t);
  }, [unread]);
  return <BellIcon ref={ref} />;
}
