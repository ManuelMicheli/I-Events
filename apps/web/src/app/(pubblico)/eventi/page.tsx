import { TypeSquare } from "@/components/event-type";
import { PublicEventCard } from "@/components/public/event-card";
import { ButtonLink, Empty } from "@/components/ui";
import { listPublicEvents, type PublicEvent } from "@/lib/public-events";
import {
  addDays,
  EVENT_TYPE_INFO,
  EVENT_TYPES,
  isEventType,
  todayInItaly,
  type EventType,
} from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Eventi aperti al pubblico",
  description:
    "Gli eventi aperti a tutti: quelli delle agenzie su I-Events, con iscrizione gratuita, e i più importanti della città.",
};

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

/**
 * Esplora (D5, M1): the public events still to come, filtered by type with neutral chips (the chosen
 * one in the Fiamma selection style), in three groups: happening now, this week, later. Under them,
 * the ones gone on stage in the last two months, newest first.
 */
export default async function Explore({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const type: EventType | null = isEventType(tipo) ? tipo : null;
  const today = todayInItaly();
  const [all, recent] = await Promise.all([
    listPublicEvents(),
    listPublicEvents(addDays(today, -60), addDays(today, -1)),
  ]);
  const byType = (list: PublicEvent[]) => (type ? list.filter((e) => e.event_type === type) : list);
  const events = byType(all);
  const past = byType(recent.filter((e) => (e.end_date ?? e.start_date) < today)).reverse();
  const weekEnd = addDays(today, 7);
  const groups: { title: string; events: PublicEvent[] }[] = [
    { title: "In corso ora", events: events.filter((e) => e.status === "live") },
    {
      title: "Questa settimana",
      events: events.filter((e) => e.status !== "live" && e.start_date <= weekEnd),
    },
    {
      title: "Più avanti",
      events: events.filter((e) => e.status !== "live" && e.start_date > weekEnd),
    },
    { title: "Già andati in scena", events: past },
  ].filter((g) => g.events.length > 0);
  const typeLabel = type ? EVENT_TYPE_INFO[type].label : null;

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold sm:text-3xl">Eventi aperti al pubblico</h1>
        <p className="text-lg text-muted">
          {all.length === 0
            ? "Per quelli gratuiti ti iscrivi qui e il biglietto arriva subito."
            : `${all.length === 1 ? "1 evento in programma" : `${all.length} eventi in programma`}. Per quelli gratuiti ti iscrivi qui e il biglietto arriva subito.`}
        </p>
      </header>

      {all.length + recent.length > 0 && (
        <nav aria-label="Tipo di evento" className="chip-scroll -mx-4 px-4 sm:mx-0 sm:px-0">
          <ul className="flex w-max gap-2 py-1.5 pr-8 sm:w-auto sm:flex-wrap sm:pr-0">
            <li>
              <Chip href="/eventi" selected={!type}>
                Tutti
              </Chip>
            </li>
            {EVENT_TYPES.map((t) => (
              <li key={t}>
                <Chip href={`/eventi?tipo=${t}`} selected={type === t}>
                  <TypeSquare type={t} />
                  {EVENT_TYPE_INFO[t].label}
                </Chip>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {all.length + recent.length === 0 ? (
        <Empty>
          Nessun evento aperto al pubblico, per ora. Quando un&apos;agenzia ne pubblica uno lo trovi
          qui.
        </Empty>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-card bg-surface px-4 py-8 text-center">
          <p className="text-sm text-muted">
            Nessun evento di {typeLabel?.toLowerCase()} in programma, per ora.
          </p>
          <ButtonLink href="/eventi" variant="secondary">
            Vedi tutti gli eventi
          </ButtonLink>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.title} aria-labelledby={`g-${g.title}`} className="flex flex-col gap-4">
            <h2 id={`g-${g.title}`} className="text-xl font-medium">
              {g.title}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {g.events.map((e) => (
                <li key={e.id} className="flex flex-col [&>article]:flex-1">
                  <PublicEventCard event={e} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {all.length > 0 && (
        <p className="text-sm text-muted">
          Preferisci vederli per giorno?{" "}
          <Link href="/eventi/calendario" className="text-text underline">
            Apri il calendario
          </Link>
        </p>
      )}
    </>
  );
}

/** Filter chip (Carta item 7): 32 tall, pill; chosen = Fiamma selection with the tick. 44 px for the finger. */
function Chip({
  href,
  selected,
  children,
}: {
  href: string;
  selected: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={cx(
        "relative inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-label whitespace-nowrap transition-colors duration-[120ms] after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
        selected
          ? "border-accent bg-accent-subtle font-medium text-text"
          : "border-border-strong bg-bg text-text hover:bg-surface",
      )}
    >
      {selected && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
          className="shrink-0"
        >
          <path
            d="M3.5 8.5l3 3 6-7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {children}
    </Link>
  );
}
