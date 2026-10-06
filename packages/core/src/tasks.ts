import { z } from "zod";
import type { ServiceKey } from "./services";

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Scrivi cosa c'è da fare").max(200),
  notes: z.string().trim().max(2000).optional(),
  due_date: z.iso.date().nullable(),
  assignee_id: z.uuid().nullable(),
  booking_id: z.uuid().nullable(),
});
export type TaskInput = z.infer<typeof taskSchema>;

/** A task to suggest, due `days` before the event starts (negative: after it). */
type Template = { title: string; days: number };

const GENERAL: Template[] = [
  { title: "Confermare con il cliente data, orari e numero di ospiti", days: 30 },
  { title: "Mandare a tutti i fornitori orari di arrivo e referente sul posto", days: 7 },
  { title: "Verificare che tutti i fornitori abbiano confermato", days: 2 },
  { title: "Raccogliere le fatture dei fornitori e segnare i costi reali", days: -7 },
];

const BY_SERVICE: Partial<Record<ServiceKey, Template[]>> = {
  venue: [
    { title: "Bloccare la location con opzione o contratto", days: 45 },
    { title: "Fare il sopralluogo in location", days: 14 },
  ],
  permits: [{ title: "Richiedere permessi e pratiche SIAE", days: 30 }],
  entertainment: [{ title: "Concordare scaletta musicale e scheda tecnica", days: 21 }],
  av: [{ title: "Approvare la scheda tecnica di audio, luci e video", days: 14 }],
  security: [
    { title: "Comunicare alla sicurezza numero di addetti e turni", days: 14 },
    { title: "Mandare alla sicurezza planimetria e vie di fuga", days: 7 },
  ],
  catering: [
    { title: "Confermare il menu e le intolleranze", days: 14 },
    { title: "Comunicare il numero definitivo di coperti", days: 3 },
  ],
  setup: [
    { title: "Approvare il progetto di allestimento", days: 14 },
    { title: "Seguire il montaggio dell'allestimento", days: 1 },
  ],
  staffing: [{ title: "Confermare hostess, turni e dress code", days: 10 }],
  logistics: [{ title: "Confermare orari di carico, scarico e navette", days: 7 }],
  media: [{ title: "Mandare la shot list a foto e video", days: 7 }],
  cleaning: [{ title: "Confermare gli orari delle pulizie prima e dopo l'evento", days: 3 }],
};

export type SuggestedTask = { title: string; due_date: string | null; service: ServiceKey | null };

const addDays = (isoDate: string, days: number) => {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** The usual checklist for an event with these services, ordered by deadline. Without a date, no deadlines. */
export function suggestedTasks(services: readonly string[], startDate: string | null): SuggestedTask[] {
  const items: (Template & { service: ServiceKey | null })[] = [
    ...GENERAL.map((t) => ({ ...t, service: null })),
    ...[...new Set(services)].flatMap((s) => (BY_SERVICE[s as ServiceKey] ?? []).map((t) => ({ ...t, service: s as ServiceKey }))),
  ];
  return items
    .sort((a, b) => b.days - a.days)
    .map((t) => ({ title: t.title, service: t.service, due_date: startDate ? addDays(startDate, -t.days) : null }));
}

export const TASK_BUCKETS = ["overdue", "today", "week", "later", "undated", "done"] as const;
export type TaskBucket = (typeof TASK_BUCKETS)[number];

const dayNumber = (isoDate: string) => Math.round(Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000);

/** Days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export const daysBetween = (from: string, to: string) => dayNumber(to) - dayNumber(from);

/** Where a task sits on the timeline, seen from `today` (YYYY-MM-DD in the team's time zone). */
export function taskBucket(task: { due_date: string | null; done_at: string | null }, today: string): TaskBucket {
  if (task.done_at) return "done";
  if (!task.due_date) return "undated";
  const d = daysBetween(today, task.due_date);
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  return d <= 7 ? "week" : "later";
}

/** Groups tasks by bucket, each sorted by deadline (done ones: most recent first). */
export function groupTasks<T extends { due_date: string | null; done_at: string | null }>(tasks: readonly T[], today: string) {
  const groups = Object.fromEntries(TASK_BUCKETS.map((b) => [b, [] as T[]])) as Record<TaskBucket, T[]>;
  for (const t of tasks) groups[taskBucket(t, today)].push(t);
  for (const b of TASK_BUCKETS) {
    groups[b].sort((x, y) =>
      b === "done" ? (y.done_at ?? "").localeCompare(x.done_at ?? "") : (x.due_date ?? "").localeCompare(y.due_date ?? ""),
    );
  }
  return groups;
}

/** Today's date in Italy, where agencies plan their days. */
export const todayInItaly = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(now);
