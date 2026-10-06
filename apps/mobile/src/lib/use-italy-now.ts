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

/** Day and minute in Italy, where the event happens, refreshed while the screen is open. */
export function useItalyNow(): { day: string; time: string } {
  const value = useSyncExternalStore(subscribe, snapshot);
  return { day: value.slice(0, 10), time: value.slice(11) };
}
