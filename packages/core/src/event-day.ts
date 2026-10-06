import { getServiceCategory } from "./services";

/**
 * The event day on site, shared by the web page and the app: the days of the event, who is expected and the
 * check-ins made on the device, which wait in a queue while there is no connection.
 */

const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

/** The event's days: from start to end date (at most two weeks), plus any day already planned. */
export function eventDays(start: string | null, end: string | null, used: readonly string[]): string[] {
  const days = new Set(used);
  if (start) {
    const last = end && end > start ? end : start;
    for (let d = start, i = 0; d <= last && i < 14; d = addDays(d, 1), i++) days.add(d);
  }
  return [...days].sort();
}

/** The day to show first: today if it is one of the event's days, else the first day with something planned. */
export function liveDay(days: readonly string[], plannedDays: readonly string[], today: string | null): string | undefined {
  if (today && days.includes(today)) return today;
  return days.find((d) => plannedDays.includes(d)) ?? days[0];
}

/** Someone expected on site, as shown: suppliers carry their service, colleagues and externals a role. */
export type CrewMember = {
  id: string;
  kind: "supplier" | "staff" | "external";
  day: string;
  call_time: string | null;
  checked_in_at: string | null;
  name: string;
  /** The service for suppliers, the role for the others. */
  detail: string | null;
  role: string | null;
  phone: string | null;
  /** The token of the person's pass, for the QR code and the link; null when not loaded. */
  pass: string | null;
};

export type CrewRow = {
  id: string;
  booking_id: string | null;
  user_id: string | null;
  name: string | null;
  role: string | null;
  phone: string | null;
  day: string;
  call_time: string | null;
  checked_in_at: string | null;
  profile: { full_name: string | null } | null;
  pass_token?: string;
};

export type CrewBookingRow = {
  id: string;
  service_key: string;
  contact: { name: string | null; company: string | null; phone: string | null } | null;
};

const serviceName = (key: string) => getServiceCategory(key)?.name.it ?? key;

/** The people expected on site from the event_crew rows and the event's bookings. */
export function crewMembers(rows: readonly CrewRow[], bookings: readonly CrewBookingRow[]): CrewMember[] {
  return rows.map((c) => {
    const booking = c.booking_id ? bookings.find((b) => b.id === c.booking_id) : undefined;
    const base = { id: c.id, day: c.day, call_time: c.call_time, checked_in_at: c.checked_in_at, role: c.role, pass: c.pass_token ?? null };
    if (booking) {
      return {
        ...base,
        kind: "supplier",
        name: booking.contact?.company || booking.contact?.name || serviceName(booking.service_key),
        detail: [serviceName(booking.service_key), c.role].filter(Boolean).join(" · "),
        phone: booking.contact?.phone ?? null,
      };
    }
    return {
      ...base,
      kind: c.user_id ? "staff" : "external",
      name: c.user_id ? c.profile?.full_name || "Collega senza nome" : (c.name ?? ""),
      detail: c.role,
      phone: c.phone,
    };
  });
}

/**
 * A check-in waiting to reach the server: `at` is when the person arrived, null to undo it. One entry per person,
 * the latest tap wins.
 */
export type PendingCheckin = { id: string; at: string | null };

/** The queue as saved on the device; anything unreadable counts as empty. */
export function parseCheckinQueue(raw: string | null): PendingCheckin[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter(
      (e): e is PendingCheckin => typeof e?.id === "string" && (e.at === null || (typeof e.at === "string" && !Number.isNaN(Date.parse(e.at)))),
    );
  } catch {
    return [];
  }
}

export function enqueueCheckin(queue: readonly PendingCheckin[], entry: PendingCheckin): PendingCheckin[] {
  return [...queue.filter((e) => e.id !== entry.id), entry];
}

/** Drops the entries that were sent, unless they changed in the meantime. */
export function dequeueCheckins(queue: readonly PendingCheckin[], sent: readonly PendingCheckin[]): PendingCheckin[] {
  return queue.filter((e) => !sent.some((s) => s.id === e.id && s.at === e.at));
}

/** The crew as the device sees it: queued check-ins win over what the server last said. */
export function withPendingCheckins<T extends { id: string; checked_in_at: string | null }>(
  crew: readonly T[],
  queue: readonly PendingCheckin[],
): (T & { pending: boolean })[] {
  return crew.map((c) => {
    const p = queue.find((q) => q.id === c.id);
    return { ...c, checked_in_at: p ? p.at : c.checked_in_at, pending: Boolean(p) };
  });
}

/** The crew with check-ins the server already took but the last load from the server did not include yet. */
export function withSentCheckins<T extends { id: string; checked_in_at: string | null }>(crew: readonly T[], sent: readonly PendingCheckin[]): T[] {
  return crew.map((c) => {
    const s = sent.find((x) => x.id === c.id);
    return s ? { ...c, checked_in_at: s.at } : c;
  });
}

/**
 * What to do with a queued check-in after trying to send it, from the HTTP status. `retry`: no connection (0), the
 * session needs renewing (401), or the server is busy or down; it stays queued. `refused`: the server said no; it
 * leaves the queue and the person sees why.
 */
export function checkinSyncOutcome(status: number): "sent" | "retry" | "refused" {
  if (status >= 200 && status < 300) return "sent";
  if (status === 0 || status === 401 || status === 408 || status === 429 || status >= 500) return "retry";
  return "refused";
}

/** Whether to keep a copy of the event day on the phone: from two days before the start to the last day. */
export function keepDayOnPhone(e: { status: string; start_date: string | null; end_date: string | null }, today: string): boolean {
  if (!e.start_date || e.status === "completed" || e.status === "cancelled") return false;
  const last = e.end_date && e.end_date > e.start_date ? e.end_date : e.start_date;
  return last >= today && e.start_date <= addDays(today, 2);
}

/** Where a pass lives on the site: the QR code holds this link, so any phone camera opens it. */
export const passUrl = (siteUrl: string, token: string) => `${siteUrl.replace(/\/$/, "")}/pass/${token}`;

/** The short code printed under the QR, typed by hand when the camera cannot read it: "4F7A2C". */
export const passCode = (token: string) => token.slice(0, 6).toUpperCase();

/** What was scanned or typed: a whole pass (link or token) or the short code. Null when it is not a pass. */
export function readPass(text: string): { token: string } | { code: string } | null {
  const t = text.trim();
  const link = /\/pass\/([0-9a-fA-F]{32})(?:[/?#].*)?$/.exec(t);
  if (link) return { token: link[1]!.toLowerCase() };
  if (/^[0-9a-fA-F]{32}$/.test(t)) return { token: t.toLowerCase() };
  const code = t.replace(/[\s-]/g, "");
  if (/^[0-9a-fA-F]{6}$/.test(code)) return { code: code.toLowerCase() };
  return null;
}

/** The person a scanned pass belongs to among the event's crew; a short code must match exactly one pass. */
export function findPass<T extends { pass: string | null }>(crew: readonly T[], pass: { token: string } | { code: string }): T | undefined {
  if ("token" in pass) return crew.find((c) => c.pass === pass.token);
  const found = crew.filter((c) => c.pass?.startsWith(pass.code));
  return found.length === 1 ? found[0] : undefined;
}

/** Whether a pass for `day` is good now: on its day, or until 6 in the morning after it for evenings that run late. */
export function passFitsNow(day: string, now: { day: string; time: string }): boolean {
  return day === now.day || (day === addDays(now.day, -1) && now.time < "06:00");
}
