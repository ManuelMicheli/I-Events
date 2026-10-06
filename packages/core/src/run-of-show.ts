import { z } from "zod";
import type { ServiceKey } from "./services";

/** A time of day as typed in the app, "HH:MM" (24h). */
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Scrivi l'orario come 19:30");

export const scheduleItemSchema = z.object({
  day: z.iso.date("Scegli il giorno"),
  starts_at: timeSchema,
  ends_at: timeSchema.nullable(),
  title: z.string().trim().min(1, "Scrivi cosa succede").max(200),
  location: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
  booking_id: z.uuid().nullable(),
  assignee_id: z.uuid().nullable(),
});
export type ScheduleItemInput = z.infer<typeof scheduleItemSchema>;

/** Someone expected on site: who they are is set when added, the rest can be edited. */
export const crewSchema = z.object({
  day: z.iso.date("Scegli il giorno"),
  call_time: timeSchema.nullable(),
  name: z.string().trim().max(120).optional(),
  role: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
});
export type CrewInput = z.infer<typeof crewSchema>;

/** "19:30:00" from the database, or "19:30", as "19:30". */
export const hhmm = <T extends string | null>(t: T): T => (t === null ? t : (t.slice(0, 5) as T));

const minutesOf = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const dayIndex = (isoDate: string) => Math.round(Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000);
/** Minutes since the epoch day, for comparing moments across days without time zones. */
const at = (day: string, time: string) => dayIndex(day) * 1440 + minutesOf(time);

/** Day and time in Italy, where the event happens. */
export function nowInItaly(now = new Date()): { day: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

type Timed = { id: string; day: string; starts_at: string; ends_at: string | null };
export type ScheduleState = "past" | "current" | "next" | "upcoming";

/** An item with no end lasts until the next one that day starts; the last one of the day, 30 minutes. */
const DEFAULT_LENGTH = 30;

/** Sorts the schedule and says, at `now`, what is over, what is happening and what comes next. */
export function scheduleTimeline<T extends Timed>(items: readonly T[], now: { day: string; time: string }) {
  const sorted = [...items].sort((a, b) => at(a.day, a.starts_at) - at(b.day, b.starts_at) || a.id.localeCompare(b.id));
  const nowAt = at(now.day, now.time);
  let nextFound = false;
  return sorted.map((item, i) => {
    const start = at(item.day, item.starts_at);
    let end: number;
    if (item.ends_at !== null) {
      end = at(item.day, item.ends_at);
      if (end <= start) end += 1440;
    } else {
      const following = sorted.slice(i + 1).find((o) => o.day === item.day && at(o.day, o.starts_at) > start);
      end = following ? at(following.day, following.starts_at) : start + DEFAULT_LENGTH;
    }
    let state: ScheduleState;
    if (nowAt >= end) state = "past";
    else if (nowAt >= start) state = "current";
    else if (!nextFound) {
      state = "next";
      nextFound = true;
    } else state = "upcoming";
    return { item, state };
  });
}

export type CrewState = "arrived" | "late" | "expected";

/** Arrived when checked in; late once the call time has passed without a check-in. */
export function crewState(
  member: { day: string; call_time: string | null; checked_in_at: string | null },
  now: { day: string; time: string },
): CrewState {
  if (member.checked_in_at) return "arrived";
  if (member.call_time && at(member.day, member.call_time) < at(now.day, now.time)) return "late";
  return "expected";
}

/** A moment of the usual evening, `offset` minutes from the start (doors open). */
type Template = { title: string; offset: number; length?: number };

const OPENING: Template[] = [
  { title: "Briefing con tutto lo staff", offset: -45, length: 15 },
  { title: "Apertura porte e accoglienza ospiti", offset: 0, length: 30 },
];
const CLOSING: Template[] = [{ title: "Fine evento e uscita ospiti", offset: 240, length: 30 }];

const BY_SERVICE: Partial<Record<ServiceKey, Template[]>> = {
  setup: [
    { title: "Montaggio allestimento", offset: -300, length: 180 },
    { title: "Smontaggio allestimento", offset: 270, length: 120 },
  ],
  av: [
    { title: "Montaggio audio, luci e video", offset: -240, length: 120 },
    { title: "Sound check", offset: -90, length: 30 },
  ],
  catering: [
    { title: "Arrivo catering e allestimento buffet", offset: -150, length: 90 },
    { title: "Servizio catering", offset: 30, length: 120 },
  ],
  security: [{ title: "Arrivo sicurezza e controllo vie di fuga", offset: -60, length: 15 }],
  staffing: [{ title: "Arrivo hostess e consegna divise", offset: -75, length: 30 }],
  entertainment: [{ title: "Inizio intrattenimento", offset: 90, length: 120 }],
  media: [{ title: "Foto e riprese degli ospiti", offset: 15, length: 180 }],
  cleaning: [{ title: "Pulizie finali", offset: 270, length: 90 }],
};

export type SuggestedItem = {
  day: string;
  starts_at: string;
  ends_at: string | null;
  title: string;
  service: ServiceKey | null;
};

const fromMinutes = (abs: number) => {
  const day = new Date(Math.floor(abs / 1440) * 86_400_000).toISOString().slice(0, 10);
  const m = ((abs % 1440) + 1440) % 1440;
  return {
    day,
    time: `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
  };
};

/** The usual run of show for these services, around the time doors open on `day`. */
export function suggestedSchedule(services: readonly string[], day: string, doorsOpen: string): SuggestedItem[] {
  const base = at(day, doorsOpen);
  const items = [
    ...OPENING.map((t) => ({ ...t, service: null })),
    ...[...new Set(services)].flatMap((s) => (BY_SERVICE[s as ServiceKey] ?? []).map((t) => ({ ...t, service: s as ServiceKey }))),
    ...CLOSING.map((t) => ({ ...t, service: null })),
  ];
  return items
    .sort((a, b) => a.offset - b.offset)
    .map((t) => {
      const start = fromMinutes(base + t.offset);
      return {
        day: start.day,
        starts_at: start.time,
        ends_at: t.length ? fromMinutes(base + t.offset + t.length).time : null,
        title: t.title,
        service: t.service,
      };
    });
}
