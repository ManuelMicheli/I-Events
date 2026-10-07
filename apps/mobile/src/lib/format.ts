/** Small text helpers for the screens, kept pure so they can be tested without a device. */

const shortFmt = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const yearFmt = new Intl.DateTimeFormat("it-IT", { year: "numeric", timeZone: "UTC" });
const hourFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: "Europe/Rome",
});
const asDate = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00Z`);

/** "14 nov" */
export const shortDate = (d: string) => shortFmt.format(asDate(d)).replace(".", "");

/** "14 nov – 5 dic 2026", "14 nov 2026", or null without a date. */
export function dateRange(start: string | null, end: string | null): string | null {
  if (!start) return null;
  const year = yearFmt.format(asDate(end && end > start ? end : start));
  if (!end || end <= start) return `${shortDate(start)} ${year}`;
  return `${shortDate(start)} – ${shortDate(end)} ${year}`;
}

const romeDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" });

/** The date under a stamp, "15 GIU 2027", from a day or a timestamp (read in Italian time). */
export function stampDay(value: string | null): string {
  if (!value) return "";
  const day = value.length === 10 ? value : romeDay.format(new Date(value));
  return `${shortDate(day)} ${day.slice(0, 4)}`.toUpperCase();
}

/** "1.200": Italian grouping also for four digits, as in the designs. */
const thousands = {
  format: (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."),
};

type RequestFacts = {
  kind: "single" | "campaign";
  start_date: string | null;
  end_date: string | null;
  city: string | null;
  guests: number | null;
  campaign?: unknown;
};

/** The facts line under a request title, written in caps in mono: "14 NOV · MILANO · 350 OSPITI". */
export function requestMeta(r: RequestFacts): string {
  const stages = r.kind === "campaign" ? Number((r.campaign as { eventsCount?: number } | null)?.eventsCount) || null : null;
  const parts = [
    r.start_date ? (stages ? `dal ${shortDate(r.start_date)}` : shortDate(r.start_date)) : "data da definire",
    stages ? `${stages} tappe` : r.city,
    r.guests ? `${thousands.format(r.guests)} ospiti` : null,
  ];
  return parts.filter(Boolean).join(" · ").toUpperCase();
}

/** "Buongiorno", "Buon pomeriggio" or "Buonasera", by the time in Italy. */
export function greeting(now = new Date()): string {
  const h = Number(hourFmt.format(now));
  if (h >= 5 && h < 13) return "Buongiorno";
  if (h >= 13 && h < 18) return "Buon pomeriggio";
  return "Buonasera";
}

/** "Manuel" from "Manuel Micheli"; null when there is no name. */
export const firstName = (full: string | null | undefined) => full?.trim().split(/\s+/)[0] || null;

/** Two letters for an avatar: "NS" for "NSS Eventi", "MR" for "Marco Rossi". */
export function initials(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

/** "1 evento", "3 eventi" */
export const plural = (n: number, one: string, many: string) => `${thousands.format(n)} ${n === 1 ? one : many}`;

/** "12.400,00 €", grouped also for four digits; "–" without an amount. */
export function euro(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "–";
  const cents = Math.round(Number(amount) * 100);
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${thousands.format(Math.floor(abs / 100))},${String(abs % 100).padStart(2, "0")} €`;
}

const dayNumber = (d: string) => Math.round(Date.parse(`${d}T00:00:00Z`) / 86_400_000);

/** "oggi", "ieri", "3 giorni fa", or the short date after a week. */
export function ago(iso: string, now = new Date()): string {
  const days = dayNumber(romeDay.format(now)) - dayNumber(romeDay.format(new Date(iso)));
  if (days <= 0) return "oggi";
  if (days === 1) return "ieri";
  if (days < 7) return `${days} giorni fa`;
  return `il ${shortDate(romeDay.format(new Date(iso)))}`;
}

/** "oggi", "domani", "tra 12 giorni" until a date; null when it has passed. */
export function until(date: string, today: string): string | null {
  const days = dayNumber(date) - dayNumber(today);
  if (days < 0) return null;
  if (days === 0) return "oggi";
  if (days === 1) return "domani";
  return `tra ${days} giorni`;
}

/** Whole days from today to a date: 0 today, negative when passed. */
export const daysUntil = (date: string, today: string) => dayNumber(date) - dayNumber(today);

/** "14/11/2026" to "2026-11-14"; null when the date does not exist. */
export function parseItalianDate(text: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return null;
  const [, d, mo, y] = m;
  const iso = `${y}-${mo}-${d}`;
  const date = new Date(`${iso}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : null;
}
