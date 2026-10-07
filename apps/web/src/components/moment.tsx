"use client";

import { useEffect } from "react";

/**
 * Signature moments (A7) are announced by `?momento=` after the action that caused them. Once shown,
 * the address goes back to normal, so reloading or sharing the page does not play them again.
 */
export function ClearMoment() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("momento")) return;
    url.searchParams.delete("momento");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, []);
  return null;
}
