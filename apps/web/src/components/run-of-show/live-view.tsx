"use client";

import { syncCheckins } from "@/app/(app)/pro/eventi/run-of-show-actions";
import { ContactActions } from "@/components/contacts/contact-actions";
import { Button, Notice } from "@/components/ui";
import { crewState, hhmm, liveDay, scheduleTimeline, withPendingCheckins, type ScheduleState } from "@i-events/core";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { dequeue, enqueue, parseQueue, readQueue, subscribeOnline, subscribeQueue } from "./checkin-queue";
import { CrewStatus, type CrewMember } from "./crew";
import { clock, useItalyNow } from "./now";
import { dayLabel } from "./format";
import type { ScheduleItem } from "./schedule";

export type LiveItem = ScheduleItem & { supplier: string | null; referent: string | null };

const STATE_STYLE: Record<ScheduleState, string> = {
  past: "text-muted",
  current: "rounded-ui border-l-4 border-accent bg-surface pl-3",
  next: "",
  upcoming: "",
};

const CREW_ORDER = { late: 0, expected: 1, arrived: 2 } as const;

/**
 * The event day on a phone: what is happening now and next, and who has arrived. It keeps working
 * without a connection: check-ins are queued on the device and sent when the network is back.
 */
export function LiveRunOfShow({
  eventId,
  days,
  items,
  crew,
  fetchedAt,
}: {
  eventId: string;
  days: string[];
  items: LiveItem[];
  crew: CrewMember[];
  fetchedAt: string;
}) {
  const router = useRouter();
  const now = useItalyNow();
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const rawQueue = useSyncExternalStore(
    subscribeQueue,
    () => readQueue(eventId),
    () => "[]",
  );
  const queue = useMemo(() => parseQueue(rawQueue), [rawQueue]);
  const [error, setError] = useState<string>();
  const flushing = useRef(false);

  const flush = useCallback(async () => {
    const entries = parseQueue(readQueue(eventId));
    if (flushing.current || entries.length === 0 || !navigator.onLine) return;
    flushing.current = true;
    try {
      const res = await syncCheckins(eventId, entries);
      // Saved or refused by the server: either way they leave the device.
      dequeue(eventId, entries);
      setError(res.error);
      router.refresh();
    } catch {
      // The request never made it: keep the queue for the next try.
    } finally {
      flushing.current = false;
    }
  }, [eventId, router]);

  // Send what is queued when the page opens and whenever the connection comes back.
  useEffect(() => {
    if (!online) return;
    const timer = setTimeout(() => void flush(), 0);
    return () => clearTimeout(timer);
  }, [online, flush]);

  // While online, pick up colleagues' check-ins and schedule changes.
  useEffect(() => {
    if (!online) return;
    const timer = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(timer);
  }, [online, router]);

  // Keep this page available offline once it has been opened.
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  const [chosenDay, setChosenDay] = useState<string>();
  const today = now?.day;
  const day = chosenDay ?? liveDay(days, items.map((i) => i.day), today ?? null);

  const timeline = now ? scheduleTimeline(items, now) : scheduleTimeline(items, { day: "1970-01-01", time: "00:00" });
  const ofDay = timeline.filter((t) => t.item.day === day);
  const current = timeline.filter((t) => t.state === "current");
  const next = timeline.find((t) => t.state === "next");

  const members = withPendingCheckins(crew.filter((c) => c.day === day), queue).sort((a, b) => (now ? CREW_ORDER[crewState(a, now)] - CREW_ORDER[crewState(b, now)] : 0));
  const arrived = members.filter((m) => m.checked_in_at).length;

  const tap = (member: CrewMember) => {
    enqueue(eventId, { id: member.id, at: member.checked_in_at ? null : new Date().toISOString() });
    void flush();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        {!online ? (
          <Notice tone="error">
            Sei offline. Puoi continuare a fare i check-in: restano sul telefono e partono appena torna la rete. Dati aggiornati alle{" "}
            {clock(fetchedAt)}.
          </Notice>
        ) : queue.length > 0 ? (
          <Notice>Invio dei check-in in corso…</Notice>
        ) : null}
        {queue.length > 0 && (
          <p className="text-sm text-muted">{queue.length === 1 ? "1 check-in da inviare" : `${queue.length} check-in da inviare`}</p>
        )}
        {error && <Notice tone="error">{error}</Notice>}
      </div>

      {days.length > 1 && (
        <div role="group" aria-label="Giorno" className="flex flex-wrap gap-2">
          {days.map((d) => (
            <Button key={d} type="button" variant={d === day ? "primary" : "secondary"} aria-pressed={d === day} onClick={() => setChosenDay(d)}>
              <span className="inline-block first-letter:uppercase">{dayLabel(d)}</span>
            </Button>
          ))}
        </div>
      )}

      <section aria-label="Adesso" className="rounded-ui border border-border p-4">
        <h2 className="text-sm font-semibold text-muted">Adesso</h2>
        {current.length > 0 ? (
          current.map((t) => (
            <p key={t.item.id} className="text-lg font-semibold">
              {t.item.title}
              {t.item.location && <span className="font-normal text-muted"> · {t.item.location}</span>}
            </p>
          ))
        ) : (
          <p className="text-lg">{items.length === 0 ? "La scaletta è vuota." : "Niente in corso."}</p>
        )}
        {next && (
          <p className="mt-2 text-sm">
            <span className="text-muted">Dopo: </span>
            {next.item.day !== now?.day && <span className="inline-block first-letter:uppercase">{dayLabel(next.item.day)},&nbsp;</span>}
            <span className="font-mono tabular-nums">{hhmm(next.item.starts_at)}</span> {next.item.title}
          </p>
        )}
      </section>

      <section aria-label="Scaletta">
        <h2 className="mb-2 text-base font-semibold">Scaletta</h2>
        {ofDay.length === 0 ? (
          <p className="text-sm text-muted">Nessun momento in scaletta per questo giorno.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {ofDay.map(({ item, state }) => (
              <li key={item.id} aria-current={state === "current" ? "step" : undefined} className={`flex gap-4 py-1 text-sm ${STATE_STYLE[state]}`}>
                <span className="w-24 shrink-0 font-mono tabular-nums">
                  {hhmm(item.starts_at)}
                  {item.ends_at && `–${hhmm(item.ends_at)}`}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={state === "past" ? "" : "font-medium"}>{item.title}</p>
                  <p className="text-muted">
                    {[item.location, item.supplier, item.referent && `Referente: ${item.referent}`].filter(Boolean).join(" · ")}
                  </p>
                  {item.notes && <p className="whitespace-pre-line text-muted">{item.notes}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-label="Arrivi">
        <h2 className="mb-2 flex items-baseline justify-between text-base font-semibold">
          Arrivi
          <span className="text-sm font-normal text-muted">
            {arrived} di {members.length} arrivati
          </span>
        </h2>
        {members.length === 0 ? (
          <p className="text-sm text-muted">Nessuno in elenco per questo giorno.</p>
        ) : (
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li key={m.id} aria-label={m.name} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-muted">{m.detail}</p>
                  <ContactActions name={m.name} phone={m.phone} email={null} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <CrewStatus member={m} now={now} />
                  {m.pending && <span className="text-muted">Da inviare</span>}
                  <Button
                    type="button"
                    variant={m.checked_in_at ? "tertiary" : "secondary"}
                    className="h-12 min-w-32"
                    aria-label={m.checked_in_at ? `Annulla check-in di ${m.name}` : `Check-in ${m.name}`}
                    onClick={() => tap(m)}
                  >
                    {m.checked_in_at ? "Annulla" : "Check-in"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
