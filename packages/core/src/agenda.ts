import type { EventStatus } from "./status";

/** Where an event sits in a list: happening now, still ahead, or over. */
export type AgendaSection = "live" | "upcoming" | "past";

type Dated = { status: EventStatus; start_date: string | null; end_date: string | null };

/**
 * The section of an event on a given day. An event counts as happening while its status is live or
 * today falls within its dates, so the day itself shows up even before someone switches the status.
 */
export function agendaSection(e: Dated, today: string): AgendaSection {
  if (e.status === "completed" || e.status === "cancelled") return "past";
  if (e.status === "live") return "live";
  const last = e.end_date && e.start_date && e.end_date > e.start_date ? e.end_date : e.start_date;
  if (e.start_date && e.start_date <= today && last && last >= today) return "live";
  return "upcoming";
}

/**
 * Groups events for a list: live first, then upcoming by date (undated last), then past with the
 * most recent first.
 */
export function agendaSections<T extends Dated>(events: readonly T[], today: string): Record<AgendaSection, T[]> {
  const out: Record<AgendaSection, T[]> = { live: [], upcoming: [], past: [] };
  for (const e of events) out[agendaSection(e, today)].push(e);
  const byStart = (a: T, b: T) => (a.start_date ?? "9999").localeCompare(b.start_date ?? "9999");
  out.live.sort(byStart);
  out.upcoming.sort(byStart);
  out.past.sort((a, b) => byStart(b, a));
  return out;
}

const dayFmt = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const shortFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: "UTC" });
const asDate = (d: string) => new Date(`${d}T12:00:00Z`);

/** "sab 18 ott 2026", or "18 ott – dom 19 ott 2026" for events over several days. */
export function formatEventDates(start: string | null, end: string | null): string {
  if (!start) return "Data da definire";
  if (!end || end <= start) return dayFmt.format(asDate(start));
  return `${start.slice(0, 4) === end.slice(0, 4) ? shortFmt.format(asDate(start)) : dayFmt.format(asDate(start))} – ${dayFmt.format(asDate(end))}`;
}

/**
 * The screen of the mobile app that shows what a notification is about, from the web path stored
 * with it. Null when the app has no screen for it yet: the notification then opens on the web.
 */
export function appRouteForLink(link: string | null): { pathname: string; params?: Record<string, string> } | null {
  if (!link) return null;
  const uuid = "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})";
  const event = new RegExp(`^/(?:pro|client)/eventi/${uuid}(?:[/?#].*)?$`).exec(link);
  if (event) return { pathname: "/evento/[id]", params: { id: event[1]! } };
  const booking = new RegExp(`^/supplier/richieste/${uuid}(?:[/?#].*)?$`).exec(link);
  if (booking) return { pathname: "/richiesta/[id]", params: { id: booking[1]! } };
  if (/^\/supplier\/richieste\/?$/.test(link)) return { pathname: "/" };
  return null;
}
