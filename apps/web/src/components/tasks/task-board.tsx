import { groupTasks, TASK_BUCKETS, type TaskBucket } from "@i-events/core";
import { TaskRow, type Option, type Task } from "./task-row";

const BUCKET_LABEL: Record<TaskBucket, string> = {
  overdue: "In ritardo",
  today: "Oggi",
  week: "Prossimi 7 giorni",
  later: "Più avanti",
  undated: "Senza scadenza",
  done: "Fatte",
};

/** Tasks laid out as a timeline: late first, then today, this week, later, undated and done. */
export function TaskBoard({
  tasks,
  today,
  members,
  bookings,
  eventStart,
  events,
}: {
  tasks: Task[];
  today: string;
  members: Option[];
  bookings?: Option[];
  eventStart?: string | null;
  /** For lists across events: each event's title and start date. */
  events?: Record<string, { title: string; start_date: string | null }>;
}) {
  const groups = groupTasks(tasks, today);
  return (
    <div className="flex flex-col gap-4">
      {TASK_BUCKETS.filter((b) => groups[b].length > 0).map((b) => (
        <section key={b} aria-label={BUCKET_LABEL[b]}>
          <h3 className={`text-sm font-semibold ${b === "overdue" ? "text-danger" : ""}`}>
            {BUCKET_LABEL[b]} <span className="font-normal text-muted">{groups[b].length}</span>
          </h3>
          <ul className="divide-y divide-border">
            {groups[b].map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                today={today}
                members={members}
                bookings={bookings}
                eventStart={events ? (events[t.event_id]?.start_date ?? null) : (eventStart ?? null)}
                event={events?.[t.event_id]}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
