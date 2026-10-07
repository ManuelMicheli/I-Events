import { monthGrid } from "@i-events/core";

const monthFmt = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });
const fullFmt = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const WEEKDAYS = ["L", "M", "M", "G", "V", "S", "D"];

export type DayState = "booked" | "off";

/** Months side by side; each day shows whether the supplier is booked for an event or marked off. */
export function AvailabilityCalendar({ from, months, days, today }: { from: string; months: number; days: Map<string, DayState>; today: string }) {
  const start = { y: Number(from.slice(0, 4)), m: Number(from.slice(5, 7)) };
  const list = Array.from({ length: months }, (_, i) => {
    const m0 = start.m - 1 + i;
    return { year: start.y + Math.floor(m0 / 12), month: (m0 % 12) + 1 };
  });
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map(({ year, month }) => (
          <table key={`${year}-${month}`} className="w-full table-fixed text-center text-sm">
            <caption className="mb-2 text-left font-medium capitalize">{monthFmt.format(new Date(Date.UTC(year, month - 1, 1)))}</caption>
            <thead className="text-muted">
              <tr>
                {WEEKDAYS.map((d, i) => (
                  <th key={i} scope="col" className="py-1 font-normal">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthGrid(year, month).map((week, w) => (
                <tr key={w}>
                  {week.map((day, i) => {
                    if (!day) return <td key={i} />;
                    const state = days.get(day);
                    const label = `${fullFmt.format(new Date(`${day}T00:00:00Z`))}${state === "booked" ? ", evento confermato" : state === "off" ? ", non disponibile" : ""}`;
                    return (
                      <td key={i} className="p-0.5">
                        <span
                          aria-label={label}
                          title={label}
                          className={[
                            "flex h-8 items-center justify-center rounded-ui",
                            state === "booked" && "bg-text text-bg",
                            state === "off" && "bg-surface text-muted line-through",
                            day < today && !state && "text-muted",
                            day === today && "ring-1 ring-text",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {Number(day.slice(8))}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
      <p className="flex flex-wrap gap-4 text-sm text-muted">
        <span className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-3 w-3 rounded-sm bg-text" /> Evento confermato
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-3 w-3 rounded-sm border border-border bg-surface" /> Non disponibile
        </span>
      </p>
    </div>
  );
}
