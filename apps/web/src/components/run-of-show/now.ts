"use client";

import { nowInItaly } from "@i-events/core";
import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  const timer = setInterval(onChange, 15_000);
  return () => clearInterval(timer);
};
const snapshot = () => {
  const now = nowInItaly();
  return `${now.day} ${now.time}`;
};

/** Day and minute in Italy, refreshed while the page is open; null while rendering on the server. */
export function useItalyNow(): { day: string; time: string } | null {
  const value = useSyncExternalStore(subscribe, snapshot, () => "");
  return value ? { day: value.slice(0, 10), time: value.slice(11) } : null;
}

const timeFmt = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  hour: "2-digit",
  minute: "2-digit",
});
/** "18:05" for a check-in timestamp. */
export const clock = (iso: string) => timeFmt.format(new Date(iso));
