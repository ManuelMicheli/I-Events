import { TypeSquare } from "@/components/event-type";
import { PublicEventRow } from "@/components/public/event-card";
import { eventLine, listPublicEvents, longDate, priceLabel, shortDate } from "@/lib/public-events";
import {
  EVENT_TYPE_INFO,
  EVENT_TYPES,
  isDay,
  isMonth,
  monthGrid,
  onDay,
  shiftMonth,
  todayInItaly,
  type EventType,
} from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Calendario eventi" };

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const monthFmt = new Intl.DateTimeFormat("it-IT", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const WEEKDAYS = [
  ["L", "lunedì"],
  ["M", "martedì"],
  ["M", "mercoledì"],
  ["G", "giovedì"],
  ["V", "venerdì"],
  ["S", "sabato"],
  ["D", "domenica"],
] as const;

/**
 * Calendario (M2): the month with the type squares under the days that have events, the legend,
 * and the list of the chosen day. Days are links (?mese=2026-10&giorno=2026-10-17), so the page works
 * without JavaScript and every day can be shared. Looking back (up to a year) shows the events already
 * gone on stage; a past day without events is not a link.
 */
export default async function PublicCalendar({
  searchParams,
}: {
  searchParams: Promise<{ mese?: string; giorno?: string }>;
}) {
  const params = await searchParams;
  const today = todayInItaly();
  const thisMonth = today.slice(0, 7);
  const firstMonth = shiftMonth(thisMonth, -12);
  const month = isMonth(params.mese) && params.mese >= firstMonth ? params.mese : thisMonth;
  const [y, m] = month.split("-").map(Number) as [number, number];
  const weeks = monthGrid(y, m);
  const days = weeks.flat().filter((d): d is string => d !== null);
  const events = await listPublicEvents(days[0], days.at(-1));
  const typesOn = (day: string) => {
    const on = events.filter((e) => onDay(e, day));
    return { count: on.length, types: [...new Set(on.map((e) => e.event_type))].slice(0, 3) };
  };
  const firstWithEvents = days.find(
    (d) => (month < thisMonth || d >= today) && typesOn(d).count > 0,
  );
  const chosen =
    isDay(params.giorno) && params.giorno.startsWith(month)
      ? params.giorno
      : month === thisMonth
        ? (firstWithEvents ?? today)
        : (firstWithEvents ?? days[0]!);
  const dayEvents = events.filter((e) => onDay(e, chosen));
  const nextDay = days.find((d) => d > chosen && typesOn(d).count > 0);
  const link = (mese: string, giorno?: string) =>
    `/eventi/calendario?mese=${mese}${giorno ? `&giorno=${giorno}` : ""}`;
  const monthName = monthFmt.format(new Date(`${month}-15T12:00:00Z`));

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold sm:text-3xl">Calendario</h1>
        <p className="text-lg text-muted">Gli eventi aperti al pubblico, giorno per giorno.</p>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-10">
        <section
          aria-labelledby="mese"
          className="-mx-4 flex flex-col gap-4 border-y border-border bg-bg px-1 py-4 sm:mx-0 sm:rounded-card sm:border sm:p-6"
        >
          <div className="flex items-center justify-between gap-2 px-3 sm:px-0">
            <h2 id="mese" className="text-xl font-medium first-letter:uppercase" aria-live="polite">
              {monthName}
            </h2>
            <div className="flex gap-1">
              {month > firstMonth ? (
                <MonthLink href={link(shiftMonth(month, -1))} label="Mese precedente" dir="prev" />
              ) : (
                <span aria-hidden className="size-11 sm:size-10" />
              )}
              <MonthLink href={link(shiftMonth(month, 1))} label="Mese successivo" dir="next" />
            </div>
          </div>

          <table className="w-full table-fixed border-separate border-spacing-y-1 text-center">
            <thead>
              <tr>
                {WEEKDAYS.map(([short, full], i) => (
                  <th
                    key={i}
                    scope="col"
                    className="!p-0 pb-1 font-mono text-xs font-normal text-muted"
                  >
                    <abbr title={full} className="no-underline">
                      {short}
                    </abbr>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, w) => (
                <tr key={w}>
                  {week.map((day, i) => {
                    if (!day) return <td key={i} className="!p-0" />;
                    const { count, types } = typesOn(day);
                    const past = day < today && count === 0;
                    const selected = day === chosen;
                    const label = `${longDate(day, null)}${day === today ? ", oggi" : ""}: ${count === 0 ? "nessun evento" : count === 1 ? "1 evento" : `${count} eventi`}`;
                    const inner = (
                      <>
                        <span
                          className={cx(
                            "font-mono text-sm",
                            day === today &&
                              "font-semibold underline decoration-2 underline-offset-4",
                          )}
                        >
                          {Number(day.slice(8))}
                        </span>
                        <span aria-hidden className="flex h-2 items-center gap-1">
                          {types.map((t) =>
                            t ? (
                              <TypeSquare key={t} type={t} />
                            ) : (
                              <span key="none" className="size-2 rounded-[2px] bg-control" />
                            ),
                          )}
                        </span>
                      </>
                    );
                    return (
                      <td key={i} className="!p-0">
                        {past ? (
                          <span
                            aria-label={label}
                            className="mx-auto flex h-12 w-full max-w-12 flex-col items-center justify-center gap-1 text-muted"
                          >
                            {inner}
                          </span>
                        ) : (
                          <Link
                            href={link(month, day)}
                            scroll={false}
                            aria-label={label}
                            aria-current={selected ? "date" : undefined}
                            className={cx(
                              "mx-auto flex h-12 w-full max-w-12 flex-col items-center justify-center gap-1 rounded-ui border transition-colors duration-[120ms]",
                              selected
                                ? "border-accent bg-accent-subtle"
                                : "border-transparent hover:bg-surface",
                              day < today && "text-muted",
                            )}
                          >
                            {inner}
                          </Link>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <Legend types={EVENT_TYPES} />
        </section>

        <section aria-labelledby="giorno" className="flex flex-col gap-4">
          <h2 id="giorno" className="text-xl font-medium">
            {longDate(chosen, null)}
            {chosen === today && <span className="text-muted"> · oggi</span>}
          </h2>
          {dayEvents.length === 0 ? (
            <div className="flex flex-col gap-2 rounded-card bg-surface px-4 py-6 text-sm">
              <p className="text-muted">
                {chosen < today
                  ? "Questo giorno è passato."
                  : "Nessun evento aperto al pubblico in questo giorno."}
              </p>
              {nextDay && (
                <p>
                  <Link href={link(month, nextDay)} scroll={false} className="underline">
                    Vai al prossimo: {shortDate(nextDay, null)}
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {dayEvents.map((e) => (
                <li key={e.id}>
                  <PublicEventRow
                    href={`/eventi/${e.id}`}
                    type={e.event_type}
                    title={e.title}
                    line={eventLine(e)}
                    live={e.status === "live"}
                    extra={<span className="font-mono text-label">{priceLabel(e, today)}</span>}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function MonthLink({ href, label, dir }: { href: string; label: string; dir: "prev" | "next" }) {
  return (
    <Link
      href={href}
      aria-label={label}
      scroll={false}
      className="ic-host flex size-11 items-center justify-center rounded-ui border border-border-strong bg-bg hover:bg-surface sm:size-10"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
        className={dir === "prev" ? "nudge-l" : "nudge-r"}
      >
        <path
          d={dir === "prev" ? "M10 3.5L5.5 8l4.5 4.5" : "M6 3.5L10.5 8 6 12.5"}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}

function Legend({ types }: { types: readonly EventType[] }) {
  return (
    <ul
      aria-label="Legenda dei tipi di evento"
      className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border px-3 pt-4 text-label text-muted sm:px-0"
    >
      {types.map((t) => (
        <li key={t} className="inline-flex items-center gap-2">
          <TypeSquare type={t} />
          {EVENT_TYPE_INFO[t].label}
        </li>
      ))}
    </ul>
  );
}
