import type { EventStatus } from "./status";

/**
 * The ticket of a request or event ("Carta e inchiostro"): the 4-digit number, the same in every
 * screen, and the countdown printed on the stub. Web and app both use these.
 */

/** "#0142", or "#0142-2" for the second event of a campaign (stage position is 0-based). */
export function formatTicketNumber(number: number, stagePosition?: number | null): string {
  const base = `#${String(number).padStart(4, "0")}`;
  return stagePosition === null || stagePosition === undefined ? base : `${base}-${stagePosition + 1}`;
}

export type Countdown = { label: string; live: boolean };

const dayIndex = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86_400_000;

/**
 * What the stub says: "IN SCENA" while the event runs, then "OGGI", "DOMANI", "TRA 5 G" before it.
 * Nothing once it is over, cancelled or without a date. today is an ISO date in Italian time.
 */
export function eventCountdown(event: { start_date: string | null; end_date: string | null; status: EventStatus }, today: string): Countdown | null {
  if (event.status === "live") return { label: "IN SCENA", live: true };
  if (event.status === "completed" || event.status === "cancelled" || !event.start_date) return null;
  const days = dayIndex(event.start_date) - dayIndex(today);
  if (days > 1) return { label: `TRA ${days} G`, live: false };
  if (days === 1) return { label: "DOMANI", live: false };
  const last = event.end_date ?? event.start_date;
  if (days <= 0 && dayIndex(last) >= dayIndex(today)) return { label: "OGGI", live: false };
  return null;
}
